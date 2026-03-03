import os
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.agent.prompts import build_investigate_prompt
from app.agent.workspace import read_investigation_md, write_datadog_helper
from app.integrations.datadog.analyzer import analyze_logs, analyze_trace, run_analysis
from app.integrations.datadog.client import DatadogIntegration
from app.models.datadog_analysis import AnalysisSource, AnalysisStatus, DatadogAnalysis


def _make_response(status_code: int, json_data=None) -> httpx.Response:
    """Create a mock httpx Response with a request set (needed for raise_for_status)."""
    resp = httpx.Response(status_code, json=json_data)
    resp._request = httpx.Request("GET", "https://api.datadoghq.com")
    return resp


@pytest.fixture
def dd():
    return DatadogIntegration()


# ── Client Tests ──────────────────────────────────────────────────────


class TestDatadogIntegration:
    def test_metadata(self, dd):
        assert dd.name == "datadog"
        assert dd.description == "Datadog integration for log and trace analysis"
        assert "DD_API_KEY" in dd.required_env_vars
        assert "DD_APP_KEY" in dd.required_env_vars

    def test_not_configured(self, dd):
        with patch.dict(os.environ, {}, clear=True):
            missing = dd.check_env_vars()
            assert len(missing) == 2
            assert not dd.is_configured

    def test_configured(self, dd):
        env = {"DD_API_KEY": "test-api-key", "DD_APP_KEY": "test-app-key"}
        with patch.dict(os.environ, env):
            assert dd.is_configured
            assert dd.check_env_vars() == []

    async def test_health_check_success(self, dd):
        mock_response = _make_response(200, {"valid": True})
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.health_check()
            assert result is True

    async def test_health_check_failure(self, dd):
        mock_response = _make_response(403, {"errors": ["Forbidden"]})
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.health_check()
            assert result is False

    async def test_health_check_exception(self, dd):
        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            side_effect=httpx.ConnectError("Connection refused"),
        ):
            result = await dd.health_check()
            assert result is False

    async def test_search_logs(self, dd):
        mock_data = {"data": [{"id": "log1", "attributes": {"message": "error"}}]}
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            logs = await dd.search_logs(
                "service:web", "2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z",
            )
            assert len(logs) == 1
            assert logs[0]["id"] == "log1"

    async def test_get_trace(self, dd):
        mock_data = {"data": [{"id": "span1", "attributes": {"service": "web"}}]}
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            spans = await dd.get_trace("abc123")
            assert len(spans) == 1
            assert spans[0]["attributes"]["service"] == "web"


class TestParseDatadogUrl:
    def test_trace_url_with_query_param(self, dd):
        url = "https://app.datadoghq.com/apm/traces?traceID=abc123def456"
        result = dd.parse_datadog_url(url)
        assert result["trace_id"] == "abc123def456"

    def test_trace_url_path_style(self, dd):
        url = "https://app.datadoghq.com/apm/trace/abc123def456"
        result = dd.parse_datadog_url(url)
        assert result["trace_id"] == "abc123def456"

    def test_log_url(self, dd):
        url = "https://app.datadoghq.com/logs?query=service%3Aweb%20status%3Aerror"
        result = dd.parse_datadog_url(url)
        assert result["query"] == "service:web status:error"

    def test_unknown_url(self, dd):
        url = "https://example.com/something-else"
        result = dd.parse_datadog_url(url)
        assert result == {}


# ── Analyzer Tests ────────────────────────────────────────────────────


class TestAnalyzeLogs:
    async def test_empty_logs(self):
        result = await analyze_logs([])
        assert "No log entries found" in result

    async def test_basic_logs(self):
        logs = [
            {"attributes": {"service": "web", "status": "error",
                            "message": "NullPointerException"}},
            {"attributes": {"service": "web", "status": "info", "message": "Request received"}},
            {"attributes": {"service": "api", "status": "error", "message": "Timeout"}},
        ]
        result = await analyze_logs(logs)
        assert "3 entries" in result
        assert "error: 2" in result
        assert "info: 1" in result
        assert "web: 2" in result
        assert "api: 1" in result
        assert "NullPointerException" in result
        assert "Timeout" in result


class TestAnalyzeTrace:
    async def test_empty_spans(self):
        result = await analyze_trace([])
        assert "No spans found" in result

    async def test_basic_trace(self):
        spans = [
            {
                "attributes": {
                    "service": "gateway",
                    "resource_name": "GET /api/users",
                    "duration": 50_000_000,
                    "status": "ok",
                    "start": "2025-01-01T00:00:00.000Z",
                }
            },
            {
                "attributes": {
                    "service": "user-service",
                    "resource_name": "SELECT * FROM users",
                    "duration": 10_000_000,
                    "status": "error",
                    "start": "2025-01-01T00:00:00.010Z",
                }
            },
        ]
        result = await analyze_trace(spans)
        assert "2 spans" in result
        assert "50.0ms" in result
        assert "gateway" in result
        assert "GET /api/users" in result
        assert "[ERROR]" in result
        assert "user-service" in result


class TestRunAnalysis:
    async def test_run_with_url(self, dd):
        mock_logs = [{"attributes": {"service": "web", "status": "error", "message": "fail"}}]
        mock_response = _make_response(200, {"data": mock_logs})

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await run_analysis(
                dd,
                url="https://app.datadoghq.com/logs?query=service%3Aweb",
            )
            assert result["query"] == "service:web"
            assert result["log_count"] == 1
            assert result["error_message"] is None

    async def test_run_with_no_input(self, dd):
        result = await run_analysis(dd)
        assert result["error_message"] is not None
        assert "Could not extract" in result["error_message"]

    async def test_run_with_trace_id(self, dd):
        mock_spans = [
            {
                "attributes": {
                    "service": "web",
                    "resource_name": "GET /",
                    "duration": 1_000_000,
                    "status": "ok",
                    "start": "2025-01-01T00:00:00Z",
                }
            }
        ]
        mock_response = _make_response(200, {"data": mock_spans})

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await run_analysis(dd, trace_id="abc123")
            assert result["trace_id"] == "abc123"
            assert len(result["raw_trace"]) == 1
            assert result["error_message"] is None


# ── API Route Tests ───────────────────────────────────────────────────


class TestDatadogAPI:
    async def test_list_analyses_empty(self):
        analyses = await DatadogAnalysis.all()
        assert len(analyses) == 0

    async def test_create_and_retrieve_analysis(self):
        analysis = await DatadogAnalysis.create(
            source=AnalysisSource.MANUAL,
            trigger="test query",
            status=AnalysisStatus.DONE,
            query="service:web",
            log_count=5,
            summary="Test summary",
        )
        retrieved = await DatadogAnalysis.get(id=analysis.id)
        assert retrieved.source == AnalysisSource.MANUAL
        assert retrieved.trigger == "test query"
        assert retrieved.status == AnalysisStatus.DONE
        assert retrieved.query == "service:web"
        assert retrieved.log_count == 5
        assert retrieved.summary == "Test summary"

    async def test_analysis_status_transitions(self):
        analysis = await DatadogAnalysis.create(
            source=AnalysisSource.WEBHOOK,
            trigger="Monitor alert",
            status=AnalysisStatus.PENDING,
        )
        assert analysis.status == AnalysisStatus.PENDING

        analysis.status = AnalysisStatus.ANALYZING
        await analysis.save()
        refreshed = await DatadogAnalysis.get(id=analysis.id)
        assert refreshed.status == AnalysisStatus.ANALYZING

        analysis.status = AnalysisStatus.DONE
        await analysis.save()
        refreshed = await DatadogAnalysis.get(id=analysis.id)
        assert refreshed.status == AnalysisStatus.DONE

    async def test_failed_analysis(self):
        analysis = await DatadogAnalysis.create(
            source=AnalysisSource.MANUAL,
            trigger="bad url",
            status=AnalysisStatus.FAILED,
            error_message="Could not parse URL",
        )
        retrieved = await DatadogAnalysis.get(id=analysis.id)
        assert retrieved.status == AnalysisStatus.FAILED
        assert retrieved.error_message == "Could not parse URL"


# ── New Client Method Tests ───────────────────────────────────────────


class TestNewClientMethods:
    async def test_get_incident(self, dd):
        mock_data = {"data": {"id": "inc-123", "type": "incidents"}}
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.get_incident("inc-123")
            assert result["data"]["id"] == "inc-123"

    async def test_list_incidents(self, dd):
        mock_data = {"data": [{"id": "inc-1"}, {"id": "inc-2"}]}
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.list_incidents(query="service:web")
            assert len(result) == 2

    async def test_get_monitor(self, dd):
        mock_data = {"id": 12345, "name": "CPU monitor", "type": "metric alert"}
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.get_monitor(12345)
            assert result["id"] == 12345
            assert result["name"] == "CPU monitor"

    async def test_search_monitors(self, dd):
        mock_data = [{"id": 1, "name": "Mon A"}, {"id": 2, "name": "Mon B"}]
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.search_monitors("cpu")
            assert len(result) == 2

    async def test_search_monitors_dict_response(self, dd):
        mock_data = {"monitors": []}
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.search_monitors("cpu")
            assert result == []

    async def test_get_events(self, dd):
        mock_data = {"data": [{"id": "evt1"}, {"id": "evt2"}]}
        mock_response = _make_response(200, mock_data)
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await dd.get_events("service:web", "now-1h", "now")
            assert len(result) == 2


class TestParseIncidentId:
    def test_inc_format(self, dd):
        assert dd.parse_incident_id("INC-1234") == "1234"

    def test_url_format(self, dd):
        url = "https://app.datadoghq.com/incidents/abc-def-123"
        assert dd.parse_incident_id(url) == "abc-def-123"

    def test_no_match(self, dd):
        assert dd.parse_incident_id("nothing here") is None

    def test_embedded_text(self, dd):
        text = "Please check INC-9876 for details"
        assert dd.parse_incident_id(text) == "9876"


# ── Investigation Prompt Tests ────────────────────────────────────────


class TestBuildInvestigatePrompt:
    def test_basic_prompt(self):
        prompt = build_investigate_prompt("CPU Alert", "High CPU on web-01")
        assert "CPU Alert" in prompt
        assert "High CPU on web-01" in prompt
        assert "INVESTIGATION.md" in prompt
        assert "datadog_helper.py" in prompt

    def test_prompt_with_context(self):
        context = "Incident INC-123: CPU spike at 14:00 UTC"
        prompt = build_investigate_prompt("Alert", "Description", context)
        assert "Pre-fetched Datadog data:" in prompt
        assert context in prompt

    def test_prompt_without_context(self):
        prompt = build_investigate_prompt("Alert", "Desc", "")
        assert "Pre-fetched Datadog data:" not in prompt


# ── Workspace Helper Tests ────────────────────────────────────────────


class TestWriteDatadogHelper:
    def test_creates_file(self, tmp_path):
        write_datadog_helper(tmp_path, "key", "app_key", "datadoghq.com")
        helper = tmp_path / "datadog_helper.py"
        assert helper.exists()
        content = helper.read_text()
        assert "search_logs" in content
        assert "get_incident" in content
        assert "get_monitor" in content
        assert "search_events" in content


class TestReadInvestigationMd:
    def test_file_exists(self, tmp_path):
        (tmp_path / "INVESTIGATION.md").write_text("# Report\nAll good.")
        result = read_investigation_md(tmp_path)
        assert result == "# Report\nAll good."

    def test_file_missing(self, tmp_path):
        result = read_investigation_md(tmp_path)
        assert result is None

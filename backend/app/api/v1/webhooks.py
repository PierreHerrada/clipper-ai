from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Request

from app.models.agent_run import RunStage, RunStatus
from app.models.datadog_analysis import AnalysisSource, AnalysisStatus, DatadogAnalysis

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

logger = logging.getLogger(__name__)


async def _run_investigate_from_webhook(task_id: str, run_id: str) -> None:
    """Background task to run INVESTIGATE agent for a webhook-triggered investigation."""
    from app.agent.runner import run_agent
    from app.models import AgentRun, Task

    task = await Task.get(id=task_id)
    existing_run = await AgentRun.get(id=run_id)
    await run_agent(task, RunStage.INVESTIGATE, existing_run=existing_run)


async def _handle_datadog_webhook(payload: dict, background_tasks: BackgroundTasks) -> None:
    """Parse a Datadog Monitor webhook payload and create an analysis + investigation."""
    title = payload.get("title", payload.get("alert_title", "Datadog alert"))
    tags = payload.get("tags", "")
    query = ""

    # Extract log query from tags or build a default from the alert
    if isinstance(tags, str) and tags:
        query = tags
    elif isinstance(tags, list) and tags:
        query = " ".join(tags)

    logs_sample = payload.get("logs_sample", [])

    analysis = await DatadogAnalysis.create(
        source=AnalysisSource.WEBHOOK,
        trigger=title,
        status=AnalysisStatus.PENDING,
        query=query,
        raw_logs=logs_sample if isinstance(logs_sample, list) else [],
    )

    if query:
        from app.api.v1.datadog import _run_analysis_task

        background_tasks.add_task(_run_analysis_task, str(analysis.id), None, query, None)
    else:
        # No query to run — mark done with whatever we have
        analysis.status = AnalysisStatus.DONE
        analysis.summary = f"Webhook alert received: {title}"
        analysis.log_count = len(logs_sample) if isinstance(logs_sample, list) else 0
        await analysis.save()

    # Trigger investigation agent
    from app.models import AgentRun, Task

    task = await Task.create(
        title=f"DD Investigation: {title[:80]}",
        description=f"Datadog alert: {title}\nTags: {query}",
        slack_channel="",
        slack_thread_ts="",
        slack_user_id="",
    )
    run = await AgentRun.create(
        id=uuid.uuid4(),
        task=task,
        stage=RunStage.INVESTIGATE,
        status=RunStatus.RUNNING,
    )
    background_tasks.add_task(_run_investigate_from_webhook, str(task.id), str(run.id))


@router.post("/{integration_name}")
async def receive_webhook(
    integration_name: str,
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict:
    """Generic webhook endpoint for integrations."""
    body = await request.body()
    logger.info("Webhook received for integration '%s': %d bytes", integration_name, len(body))

    if integration_name == "datadog":
        try:
            payload = await request.json()
            await _handle_datadog_webhook(payload, background_tasks)
        except Exception:
            logger.exception("Failed to process Datadog webhook")

    return {"status": "ok"}

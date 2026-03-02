import os
from unittest.mock import MagicMock, patch

import pytest

from app.integrations.github.client import GitHubIntegration


@pytest.fixture
def github_integration():
    return GitHubIntegration()


class TestGitHubIntegration:
    def test_metadata(self, github_integration):
        assert github_integration.name == "github"
        assert "GITHUB_TOKEN" in github_integration.required_env_vars
        assert "GITHUB_ORG" in github_integration.required_env_vars

    def test_not_configured(self, github_integration):
        with patch.dict(os.environ, {}, clear=True):
            missing = github_integration.check_env_vars()
            assert "GITHUB_TOKEN" in missing
            assert "GITHUB_ORG" in missing
            assert not github_integration.is_configured

    def test_configured(self, github_integration):
        env = {"GITHUB_TOKEN": "ghp_test", "GITHUB_ORG": "test-org"}
        with patch.dict(os.environ, env):
            assert github_integration.is_configured

    async def test_health_check_success(self, github_integration):
        mock_user = MagicMock()
        mock_user.login = "test-user"
        mock_gh = MagicMock()
        mock_gh.get_user.return_value = mock_user

        with patch.object(github_integration, "_get_client", return_value=mock_gh):
            result = await github_integration.health_check()
            assert result is True

    async def test_health_check_failure(self, github_integration):
        mock_gh = MagicMock()
        mock_gh.get_user.side_effect = Exception("Auth failed")

        with patch.object(github_integration, "_get_client", return_value=mock_gh):
            result = await github_integration.health_check()
            assert result is False

    async def test_create_pr(self, github_integration):
        mock_pr = MagicMock()
        mock_pr.html_url = "https://github.com/org/repo/pull/42"
        mock_pr.number = 42

        mock_repo = MagicMock()
        mock_repo.create_pull.return_value = mock_pr

        mock_gh = MagicMock()
        mock_gh.get_repo.return_value = mock_repo

        with patch.object(github_integration, "_get_client", return_value=mock_gh):
            result = await github_integration.create_pr(
                repo_name="org/repo",
                title="SWE-123 — Test PR",
                body="## Summary\nTest changes",
                head="feature/swe-123",
                base="main",
            )
            assert result["url"] == "https://github.com/org/repo/pull/42"
            assert result["number"] == 42
            mock_repo.create_pull.assert_called_once_with(
                title="SWE-123 — Test PR",
                body="## Summary\nTest changes",
                head="feature/swe-123",
                base="main",
            )

    def test_list_org_repos(self, github_integration):
        mock_repo1 = MagicMock()
        mock_repo1.full_name = "test-org/repo-1"
        mock_repo1.name = "repo-1"
        mock_repo1.description = "First repo"
        mock_repo1.private = False
        mock_repo1.default_branch = "main"
        mock_repo1.html_url = "https://github.com/test-org/repo-1"

        mock_repo2 = MagicMock()
        mock_repo2.full_name = "test-org/repo-2"
        mock_repo2.name = "repo-2"
        mock_repo2.description = None
        mock_repo2.private = True
        mock_repo2.default_branch = "develop"
        mock_repo2.html_url = "https://github.com/test-org/repo-2"

        mock_org = MagicMock()
        mock_org.get_repos.return_value = [mock_repo1, mock_repo2]

        mock_gh = MagicMock()
        mock_gh.get_organization.return_value = mock_org

        with patch.object(github_integration, "_get_client", return_value=mock_gh):
            repos = github_integration.list_org_repos()
            assert len(repos) == 2
            assert repos[0]["full_name"] == "test-org/repo-1"
            assert repos[0]["description"] == "First repo"
            assert repos[0]["private"] is False
            assert repos[1]["full_name"] == "test-org/repo-2"
            assert repos[1]["description"] == ""
            assert repos[1]["private"] is True
            assert repos[1]["default_branch"] == "develop"
            mock_org.get_repos.assert_called_once_with(sort="name")

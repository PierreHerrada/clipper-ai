import logging

from github import Github

from app.config import settings
from app.integrations.base import BaseIntegration

logger = logging.getLogger(__name__)


class GitHubIntegration(BaseIntegration):
    name = "github"
    description = "GitHub integration for PR creation and repository management"
    required_env_vars = ["GITHUB_TOKEN", "GITHUB_ORG"]

    def _get_client(self) -> Github:
        return Github(settings.github_token)

    async def health_check(self) -> bool:
        try:
            gh = self._get_client()
            gh.get_user().login
            return True
        except Exception:
            logger.exception("GitHub health check failed")
            return False

    def list_org_repos(self) -> list[dict]:
        """Fetch all repos from the configured GitHub org."""
        gh = self._get_client()
        org = gh.get_organization(settings.github_org)
        repos = []
        for repo in org.get_repos(sort="name"):
            repos.append(
                {
                    "full_name": repo.full_name,
                    "name": repo.name,
                    "description": repo.description or "",
                    "private": repo.private,
                    "default_branch": repo.default_branch or "main",
                    "github_url": repo.html_url,
                }
            )
        return repos

    async def create_pr(
        self,
        repo_name: str,
        title: str,
        body: str,
        head: str,
        base: str = "main",
    ) -> dict:
        gh = self._get_client()
        repo = gh.get_repo(repo_name)
        pr = repo.create_pull(
            title=title,
            body=body,
            head=head,
            base=base,
        )
        return {
            "url": pr.html_url,
            "number": pr.number,
        }

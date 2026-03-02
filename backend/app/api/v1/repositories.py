from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.repository import Repository

router = APIRouter(prefix="/api/v1/repositories", tags=["repositories"])

logger = logging.getLogger(__name__)


class ToggleBody(BaseModel):
    enabled: bool


@router.get("")
async def list_repositories() -> list[dict]:
    repos = await Repository.all().order_by("full_name")
    return [
        {
            "id": str(r.id),
            "full_name": r.full_name,
            "name": r.name,
            "description": r.description,
            "private": r.private,
            "enabled": r.enabled,
            "default_branch": r.default_branch,
            "github_url": r.github_url,
            "last_synced_at": r.last_synced_at.isoformat() if r.last_synced_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in repos
    ]


@router.post("/sync")
async def sync_repositories() -> dict:
    from app.integrations.github.client import GitHubIntegration
    from app.integrations.registry import IntegrationRegistry

    github = IntegrationRegistry.get("github")
    if github is None or not isinstance(github, GitHubIntegration):
        raise HTTPException(status_code=503, detail="GitHub integration not configured")

    try:
        org_repos = github.list_org_repos()
    except Exception as exc:
        logger.exception("Failed to fetch repos from GitHub")
        raise HTTPException(status_code=503, detail=f"GitHub API error: {exc}")

    now = datetime.now(timezone.utc)
    created = 0
    updated = 0

    for repo_data in org_repos:
        existing = await Repository.filter(full_name=repo_data["full_name"]).first()
        if existing:
            existing.name = repo_data["name"]
            existing.description = repo_data["description"]
            existing.private = repo_data["private"]
            existing.default_branch = repo_data["default_branch"]
            existing.github_url = repo_data["github_url"]
            existing.last_synced_at = now
            await existing.save()
            updated += 1
        else:
            await Repository.create(
                id=uuid.uuid4(),
                full_name=repo_data["full_name"],
                name=repo_data["name"],
                description=repo_data["description"],
                private=repo_data["private"],
                enabled=False,
                default_branch=repo_data["default_branch"],
                github_url=repo_data["github_url"],
                last_synced_at=now,
            )
            created += 1

    return {"created": created, "updated": updated, "total": created + updated}


@router.patch("/{repo_id}")
async def toggle_repository(repo_id: str, body: ToggleBody) -> dict:
    repo = await Repository.filter(id=repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo.enabled = body.enabled
    await repo.save()

    return {
        "id": str(repo.id),
        "full_name": repo.full_name,
        "name": repo.name,
        "description": repo.description,
        "private": repo.private,
        "enabled": repo.enabled,
        "default_branch": repo.default_branch,
        "github_url": repo.github_url,
        "last_synced_at": repo.last_synced_at.isoformat() if repo.last_synced_at else None,
        "created_at": repo.created_at.isoformat() if repo.created_at else None,
        "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
    }

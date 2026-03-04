from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.integrations.jira.client import JiraIntegration
from app.integrations.jira.sync import (
    _DEFAULT_STATUS_MAP,
    import_jira_issue,
    push_board_tasks_to_jira,
    sync_jira_tickets,
)
from app.integrations.registry import IntegrationRegistry
from app.models.task import Task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/jira", tags=["jira"])


def _get_jira() -> JiraIntegration:
    jira = IntegrationRegistry.get("jira")
    if jira is None or not isinstance(jira, JiraIntegration):
        raise HTTPException(status_code=503, detail="Jira integration is not configured")
    return jira


@router.get("/status-mapping/defaults", status_code=200)
async def get_status_mapping_defaults() -> dict:
    """Return the built-in default Jira-to-Corsair status mapping."""
    return {k: v.value for k, v in _DEFAULT_STATUS_MAP.items()}


class JiraImportRequest(BaseModel):
    issue_key: str


@router.post("/sync", status_code=200)
async def trigger_sync() -> dict:
    """Trigger an immediate Jira sync (pull + push)."""
    jira = _get_jira()
    imported = await sync_jira_tickets(jira)
    pushed = await push_board_tasks_to_jira(jira)
    return {"status": "ok", "imported": imported, "pushed": pushed}


@router.post("/import", status_code=200)
async def import_issue(body: JiraImportRequest) -> dict:
    """Fetch a Jira issue by key and add it to the board if not already present."""
    jira = _get_jira()

    # Active only — soft-deleted will be restored by import_jira_issue
    existing = await Task.filter(jira_key=body.issue_key, deleted_at=None).first()
    if existing:
        return {"status": "exists", "task_id": str(existing.id), "jira_key": body.issue_key}

    try:
        issue = await jira.get_issue(body.issue_key)
    except Exception:
        logger.exception("Jira import: failed to fetch %s", body.issue_key)
        raise HTTPException(status_code=404, detail=f"Could not fetch Jira issue {body.issue_key}")

    task = await import_jira_issue(issue)
    if task is None:
        # Race condition: created between the check and import
        existing = await Task.filter(jira_key=body.issue_key).first()
        task_id = str(existing.id) if existing else None
        return {"status": "exists", "task_id": task_id, "jira_key": body.issue_key}

    logger.info("Jira import: imported %s as task %s", body.issue_key, task.id)
    return {"status": "created", "task_id": str(task.id), "jira_key": body.issue_key}

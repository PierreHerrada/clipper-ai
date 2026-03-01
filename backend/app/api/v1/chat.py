from typing import Optional

from fastapi import APIRouter, Query

from app.models.chat_message import ChatMessage

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


def _message_to_dict(msg: ChatMessage) -> dict:
    return {
        "id": str(msg.id),
        "channel_id": msg.channel_id,
        "channel_name": msg.channel_name,
        "user_id": msg.user_id,
        "user_name": msg.user_name,
        "message": msg.message,
        "slack_ts": msg.slack_ts,
        "thread_ts": msg.thread_ts,
        "task_id": str(msg.task_id) if msg.task_id else None,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


@router.get("/messages")
async def list_messages(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    channel_id: Optional[str] = Query(default=None),
) -> dict:
    qs = ChatMessage.all().order_by("-created_at")
    if channel_id:
        qs = qs.filter(channel_id=channel_id)
    total = await qs.count()
    messages = await qs.offset(offset).limit(limit)
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "messages": [_message_to_dict(m) for m in messages],
    }

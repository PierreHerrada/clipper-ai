from tortoise import fields
from tortoise.models import Model


class ChatMessage(Model):
    id = fields.UUIDField(pk=True)
    channel_id = fields.TextField()
    channel_name = fields.TextField(default="")
    user_id = fields.TextField()
    user_name = fields.TextField(default="")
    message = fields.TextField()
    slack_ts = fields.TextField()
    thread_ts = fields.TextField(null=True)
    task = fields.ForeignKeyField(
        "models.Task", related_name="chat_messages", on_delete=fields.SET_NULL, null=True
    )
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "chat_messages"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"ChatMessage({self.user_name} in {self.channel_name})"

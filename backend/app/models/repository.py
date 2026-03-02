from __future__ import annotations

from tortoise import fields
from tortoise.models import Model


class Repository(Model):
    id = fields.UUIDField(pk=True)
    full_name = fields.CharField(max_length=255, unique=True)  # "org/repo-name"
    name = fields.CharField(max_length=255)
    description = fields.TextField(default="")
    private = fields.BooleanField(default=False)
    enabled = fields.BooleanField(default=False)
    default_branch = fields.CharField(max_length=100, default="main")
    github_url = fields.TextField(default="")
    last_synced_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "repositories"
        ordering = ["full_name"]

    def __str__(self) -> str:
        status = "enabled" if self.enabled else "disabled"
        return f"Repository({self.full_name}, {status})"

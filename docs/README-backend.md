# Corsair Backend — Complete Reference

> Use this file as context when working on backend code (FastAPI, models, APIs, integrations).

## Tech Stack

- **Python 3.12** with `from __future__ import annotations`
- **FastAPI 0.115.6** — async REST + WebSocket
- **Tortoise ORM 0.22.1** — async ORM with PostgreSQL (asyncpg)
- **Aerich** — database migrations
- **httpx** — async HTTP client (Jira, Datadog)
- **slack-bolt** — Slack Socket Mode listener
- **PyGithub** — GitHub API
- **python-jose** — JWT tokens
- **ruff** — linting + formatting
- **pytest + pytest-asyncio** — testing

## Application Lifecycle (`main.py`)

### Startup
1. Setup `DatabaseLogHandler` for integration logs
2. `IntegrationRegistry.initialize()` — discover + activate integrations
3. Start Slack Socket Mode listener (if configured)
4. Start Jira background sync loop (if configured)
5. Start workspace cleanup loop (hourly, 24h retention)

### Shutdown
1. Stop Jira sync loop
2. Cancel workspace cleanup task
3. Mark all `RUNNING` agent runs as `FAILED`
4. Reset tasks in `WORKING`/`REVIEWING` back to `PLANNED`

### Router Registration
**Public (no auth):**
- `POST /api/v1/auth/login`
- `POST /api/v1/webhooks/{integration_name}`
- `GET /health`

**Protected (JWT required):**
- All other `/api/v1/*` endpoints
- `WS /ws/runs/{run_id}?token={jwt}`

## Data Models

### Task (`models/task.py`)
```python
class TaskStatus(Enum):
    BACKLOG = "backlog"
    PLANNED = "planned"
    WORKING = "working"
    REVIEWING = "reviewing"
    DONE = "done"

class Task(Model):
    id            = fields.UUIDField(pk=True)
    title         = fields.CharField(max_length=500)
    description   = fields.TextField(default="")
    acceptance    = fields.TextField(default="")
    status        = fields.CharEnumField(TaskStatus, default=TaskStatus.BACKLOG)
    jira_key      = fields.CharField(max_length=50, null=True)    # e.g. "PROJ-123"
    jira_url      = fields.CharField(max_length=500, null=True)
    slack_channel = fields.CharField(max_length=100, default="")
    slack_thread_ts = fields.CharField(max_length=100, default="")
    slack_user_id = fields.CharField(max_length=100, default="")
    pr_url        = fields.CharField(max_length=500, null=True)
    pr_number     = fields.IntField(null=True)
    repo          = fields.CharField(max_length=200, null=True)   # e.g. "org/repo"
    plan          = fields.TextField(default="")
    analysis      = fields.TextField(default="")
    created_at    = fields.DatetimeField(auto_now_add=True)
    updated_at    = fields.DatetimeField(auto_now=True)
    deleted_at    = fields.DatetimeField(null=True)               # Soft delete

    # Class method for active (non-deleted) tasks:
    @classmethod
    def active(cls) -> QuerySet:
        return cls.filter(deleted_at=None)
```

### AgentRun (`models/agent_run.py`)
```python
class RunStage(Enum):
    PLAN = "plan"
    WORK = "work"
    REVIEW = "review"
    INVESTIGATE = "investigate"

class RunStatus(Enum):
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"

class AgentRun(Model):
    id             = fields.UUIDField(pk=True)
    task           = fields.ForeignKeyField("models.Task", related_name="runs")
    stage          = fields.CharEnumField(RunStage)
    status         = fields.CharEnumField(RunStatus, default=RunStatus.RUNNING)
    tokens_in      = fields.IntField(default=0)
    tokens_out     = fields.IntField(default=0)
    cost_usd       = fields.DecimalField(max_digits=10, decimal_places=4, default=0)
    started_at     = fields.DatetimeField(auto_now_add=True)
    finished_at    = fields.DatetimeField(null=True)
    workspace_path = fields.CharField(max_length=500, null=True)
    file_tree      = fields.JSONField(null=True)
```

### AgentLog (`models/agent_log.py`)
```python
class LogType(Enum):
    TEXT = "text"
    TOOL_USE = "tool_use"
    TOOL_RESULT = "tool_result"
    ERROR = "error"

class AgentLog(Model):
    id         = fields.UUIDField(pk=True)
    run        = fields.ForeignKeyField("models.AgentRun", related_name="logs")
    type       = fields.CharEnumField(LogType)
    content    = fields.JSONField()      # {"message": str, "tool"?: str, "input"?: dict}
    created_at = fields.DatetimeField(auto_now_add=True)
```

### Other Models (brief)
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| Conversation | task, role, message, slack_ts | Slack thread messages for context |
| ChatMessage | channel, user_id, message, thread_ts, task(FK) | Slack @mention messages |
| DatadogAnalysis | source, trigger, status, logs, trace, summary | Datadog analysis records |
| Setting | key (unique), value, updated_at | Key-value config store |
| SettingHistory | setting(FK), old_value, new_value, change_source | Audit trail |
| Repository | full_name (unique), enabled, default_branch | GitHub repos |
| InternalLog | source, level, logger_name, message | System debug logs |

## API Endpoints

### Tasks (`api/v1/tasks.py`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tasks` | List active tasks (ordered by created_at desc) |
| GET | `/api/v1/tasks/{id}` | Single task with latest run + logs |
| PATCH | `/api/v1/tasks/{id}` | Update status or repo |
| POST | `/api/v1/tasks/{id}/plan` | Trigger PLAN stage |
| POST | `/api/v1/tasks/{id}/work` | Trigger WORK stage |
| POST | `/api/v1/tasks/{id}/review` | Trigger REVIEW stage |
| POST | `/api/v1/tasks/{id}/analyze` | Lightweight analysis (no CLI) |
| POST | `/api/v1/tasks/{id}/stop` | Terminate running agent |
| POST | `/api/v1/tasks/{id}/retry` | Reset failed task |
| GET | `/api/v1/tasks/{id}/runs` | All runs with logs |
| GET | `/api/v1/tasks/{id}/runs/{rid}/files` | File tree for run |

### Stage Trigger Flow
1. Endpoint creates `AgentRun(stage=X, status=RUNNING)`
2. Adds `run_agent()` to `BackgroundTasks`
3. Returns run immediately (202-style)
4. Background task streams logs via WebSocket

### Dashboard (`api/v1/dashboard.py`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard/stats` | Total cost, active runs, tasks by status |
| GET | `/api/v1/dashboard/costs` | Per-task cost breakdown by stage |

### Settings (`api/v1/settings.py`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/settings/{key}` | Get setting value |
| PUT | `/api/v1/settings/{key}` | Create/update setting |
| GET | `/api/v1/settings/{key}/history` | Change history (paginated) |

**Known Setting Keys:** `base_prompt`, `lessons`, `skills`, `subagents`, `jira_status_mapping`, `jira_reverse_status_mapping`, `max_active_agents`, `jira_sync_interval`

### Jira (`api/v1/jira.py`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/jira/sync` | Pull + push Jira sync |
| POST | `/api/v1/jira/import` | Import single issue |
| GET | `/api/v1/jira/status-mapping/defaults` | Default status mapping |

### Other Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/integrations` | All integrations with status |
| GET | `/api/v1/integrations/health` | Health check all integrations |
| GET | `/api/v1/chat/messages` | Paginated Slack messages |
| GET | `/api/v1/logs` | Internal logs (source/level filter) |
| GET/POST | `/api/v1/datadog/*` | Analysis CRUD + triggers |
| GET/POST/PATCH | `/api/v1/repositories/*` | Repo management |
| POST | `/api/v1/webhooks/{name}` | Webhook handler |

### WebSocket (`api/v1/agent.py`)
```
WS /ws/runs/{run_id}?token={jwt}
- On connect: sends all existing logs for run
- While running: broadcasts new logs in real-time
- Log format: {"id", "type", "content", "created_at"}
```

## Authentication (`auth.py`)

- **Login:** `POST /api/v1/auth/login` with `{"password": "..."}` → `{"token": "..."}`
- **JWT:** HS256, 24h expiry, payload `{"sub": "admin", "exp": ...}`
- **Protected routes:** `Depends(get_current_user)` verifies Bearer token
- **WebSocket auth:** Token passed as query param, verified by `verify_ws_token()`

## Configuration (`config.py`)

All settings come from environment variables via Pydantic Settings:
```
DATABASE_URL, ANTHROPIC_API_KEY,
SLACK_BOT_TOKEN, SLACK_APP_TOKEN,
JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY (default: SWE),
JIRA_SYNC_INTERVAL_SECONDS (default: 300), JIRA_SYNC_LABEL (default: corsair),
JIRA_PLAN_CUSTOM_FIELD (optional),
DD_API_KEY, DD_APP_KEY, DD_SITE (default: datadoghq.com),
GITHUB_TOKEN, GITHUB_ORG,
WORKSPACE_BASE_DIR (default: /home/corsair/workspaces),
ADMIN_PASSWORD (default: changeme), JWT_SECRET,
ENVIRONMENT (development|production)
```

## Integration System

### Registry Pattern (`integrations/registry.py`)
- On startup, register all known integrations
- Check env vars → populate `_active` list
- `IntegrationRegistry.get("jira")` → returns client or None

### Base Class (`integrations/base.py`)
```python
class BaseIntegration(ABC):
    name: str
    description: str
    required_env_vars: list[str]

    @abstractmethod
    async def health_check(self) -> bool

    @property
    def is_configured(self) -> bool  # True if all env vars present
```

### Jira (`integrations/jira/`)
- **client.py:** REST calls via httpx (search, get, create, comment, update status)
- **sync.py:** `sync_jira_tickets()` pull, `push_board_tasks_to_jira()` push, status mapping
- **adf.py:** Parse Atlassian Document Format → plain text
- Background sync every N seconds (configurable)

### Slack (`integrations/slack/bot.py`)
- Socket Mode async listener
- `@mention` → create Task + trigger analysis
- Thread reply on run completion

### GitHub (`integrations/github/client.py`)
- `list_org_repos()` → fetch all repos from org
- `create_pr()` → open pull request

### Datadog (`integrations/datadog/`)
- **client.py:** Log search, trace/incident fetch, URL parsing
- **analyzer.py:** Fetch data + summarize with Claude

## Database Logging (`log_handler.py`)

`DatabaseLogHandler` captures Python logs from integration modules:
- Maps logger prefix → source (e.g., `app.integrations.jira` → `"jira"`)
- Saves to `InternalLog` table asynchronously
- 2000-entry in-memory buffer

## Commands

```bash
cd backend
pytest tests/ --cov=app --cov-fail-under=80   # Run tests
ruff check app/ tests/                          # Lint
ruff format app/ tests/                         # Format
aerich migrate                                  # Generate migration
aerich upgrade                                  # Apply migration
```

## Critical Rules
1. API shapes MUST match `docs/api-contract.md` exactly
2. Models MUST match `docs/data-models.md`
3. Never call real external APIs in tests — always mock
4. Coverage must be >= 80%
5. Check LESSONS.md before starting any task
6. Each integration in its own directory under `backend/app/integrations/`

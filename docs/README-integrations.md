# Corsair Integrations — Complete Reference

> Use this file as context when working on Jira, Slack, GitHub, or Datadog integration code.

## Architecture

### Plugin System

Every integration extends `BaseIntegration` and lives in its own directory:
```
backend/app/integrations/
├── base.py          # Abstract base class
├── registry.py      # Discovery + lifecycle management
├── jira/
├── slack/
├── github/
└── datadog/
```

### Base Class (`base.py`)
```python
class BaseIntegration(ABC):
    name: str                       # e.g. "jira"
    description: str                # Human-readable
    required_env_vars: list[str]    # Must be set to activate

    @abstractmethod
    async def health_check(self) -> bool: ...

    def check_env_vars(self) -> list[str]:
        """Return list of missing env var names."""

    @property
    def is_configured(self) -> bool:
        """True if all required env vars are set."""
```

### Registry (`registry.py`)
```python
class IntegrationRegistry:
    _integrations: list[BaseIntegration]   # All registered
    _active: list[BaseIntegration]         # Only configured ones

    @classmethod
    def initialize():
        """Called on app startup. Registers defaults, checks env vars."""

    @classmethod
    def get(name: str) -> Optional[BaseIntegration]:
        """Get active integration by name. Returns None if not configured."""

    @classmethod
    def get_status() -> list[dict]:
        """Return all integrations with active/missing_env_vars status."""
```

### API Endpoints
```
GET  /api/v1/integrations        → List all with config status
GET  /api/v1/integrations/health → Health check each active integration
```

---

## Jira Integration (`integrations/jira/`)

### Required Env Vars
```
JIRA_BASE_URL       # e.g. https://company.atlassian.net
JIRA_EMAIL          # Service account email
JIRA_API_TOKEN      # API token
JIRA_PROJECT_KEY    # Default: SWE
```

### Optional Env Vars
```
JIRA_SYNC_INTERVAL_SECONDS  # Default: 300 (5 min)
JIRA_SYNC_LABEL             # Default: corsair
JIRA_PLAN_CUSTOM_FIELD      # Custom field ID for plan storage
```

### Client (`jira/client.py`)

Uses `httpx` with Basic Auth (email:token):

```python
class JiraIntegration(BaseIntegration):
    async def search_issues(self, jql: str) -> list[dict]
    async def get_issue(self, issue_key: str) -> dict
    async def create_issue(self, title, description, acceptance) -> dict
    async def add_comment(self, issue_key: str, body: str) -> None
        # Body is in Atlassian Document Format (ADF)
    async def update_fields(self, issue_key: str, fields: dict) -> None
    async def update_status(self, issue_key: str, transition_name: str) -> None
        # Fetches available transitions, finds matching name, executes
    async def health_check(self) -> bool
```

### Sync System (`jira/sync.py`)

#### Pull: Jira → Corsair
```python
async def sync_jira_tickets(jira: JiraIntegration) -> int:
    """
    1. Search Jira for issues with label={JIRA_SYNC_LABEL}
    2. For each issue:
       a. If task exists with jira_key → update title/description
       b. If task was soft-deleted → restore it (clear deleted_at)
       c. If new → create Task, trigger analysis
    3. Soft-delete tasks whose jira_key no longer appears in search
    4. Return count of imported tasks
    """
```

#### Push: Corsair → Jira
```python
async def push_board_tasks_to_jira(jira: JiraIntegration) -> int:
    """
    For tasks without jira_key:
    1. Create Jira issue
    2. Add label={JIRA_SYNC_LABEL}
    3. Update task.jira_key and task.jira_url
    4. Return count of pushed tasks
    """
```

#### Status Sync
```python
async def sync_status_to_jira(task: Task, new_status: TaskStatus) -> None:
    """
    When task status changes in Corsair:
    1. Look up jira_reverse_status_mapping setting
    2. Find Jira transition name for new_status
    3. Call jira.update_status(task.jira_key, transition_name)
    """
```

#### Status Mapping
Default mapping (Jira status name → Corsair TaskStatus):
```python
{
    "to do": "backlog",
    "backlog": "backlog",
    "selected for development": "backlog",
    "in progress": "working",
    "in review": "reviewing",
    "done": "done",
    "closed": "done",
}
```

Reverse mapping (Corsair TaskStatus → Jira transition name):
```python
{
    "backlog": "To Do",
    "planned": "To Do",
    "working": "In Progress",
    "reviewing": "In Review",
    "done": "Done",
}
```

Both mappings are configurable via `settings/jira_status_mapping` and `settings/jira_reverse_status_mapping`.

#### Background Sync
Started on app startup:
```python
async def start_sync(jira: JiraIntegration):
    """Runs sync_jira_tickets() every JIRA_SYNC_INTERVAL_SECONDS."""
```

### ADF Parser (`jira/adf.py`)
```python
def extract_text_from_adf(adf: dict) -> str:
    """Walk Atlassian Document Format tree, extract text nodes as plain text."""
```

### API Endpoints (`api/v1/jira.py`)
```
POST /api/v1/jira/sync                     # Trigger immediate sync (pull + push)
POST /api/v1/jira/import                   # Import single issue by key
GET  /api/v1/jira/status-mapping/defaults  # Get built-in default mapping
```

---

## Slack Integration (`integrations/slack/`)

### Required Env Vars
```
SLACK_BOT_TOKEN     # xoxb-... (Bot User OAuth Token)
SLACK_APP_TOKEN     # xapp-... (App-Level Token for Socket Mode)
```

### Bot (`slack/bot.py`)

Uses `slack-bolt` async with Socket Mode:

```python
class SlackIntegration(BaseIntegration):
    async def start_listening(self):
        """
        Initialize Socket Mode handler.
        Listen for app_mention events.
        On @mention:
          1. Extract clean text (remove <@BOT_ID>)
          2. Create Task with slack_channel, slack_thread_ts, slack_user_id
          3. Save ChatMessage record
          4. Trigger background analysis
        """

    async def post_thread_update(self, channel: str, thread_ts: str, message: str):
        """Reply in the original Slack thread."""

    async def health_check(self) -> bool:
        """Test auth via api_test()."""
```

### Event Flow
```
User @mentions Corsair in Slack
        │
        ▼
Socket Mode receives app_mention event
        │
        ▼
handle_mention():
  1. Extract text, channel, thread_ts, user_id
  2. Create Task(status=BACKLOG)
  3. Save ChatMessage
  4. Call analyze_task(task) in background
        │
        ▼
Analysis completes → post_thread_update() with summary
```

### Notifications
The runner calls Slack to post updates:
- Plan complete: summary of plan
- Work complete: code written message
- PR created: PR URL
- Stage failed: error message

---

## GitHub Integration (`integrations/github/`)

### Required Env Vars
```
GITHUB_TOKEN        # ghp_... (Personal Access Token or App Token)
GITHUB_ORG          # Organization name
```

### Client (`github/client.py`)

Uses `PyGithub`:

```python
class GitHubIntegration(BaseIntegration):
    def list_org_repos(self) -> list[dict]:
        """
        Fetch all repos from org.
        Returns: [{full_name, name, description, private, default_branch, github_url}]
        """

    async def create_pr(self, repo_name, title, body, head, base="main") -> dict:
        """
        Create pull request.
        Returns: {url, number}
        """

    async def health_check(self) -> bool
```

### Repository Management
Repos are synced to the `repositories` table:
```
POST /api/v1/repositories/sync   → Fetch from GitHub org, upsert to DB
GET  /api/v1/repositories        → List all repos (with enabled status)
PATCH /api/v1/repositories/{id}  → Toggle enabled/disabled
```

Only **enabled** repos are cloned into agent workspaces.

### Agent Git Operations
The agent (Claude Code) handles git directly in the workspace:
1. Creates branch: `corsair/{jira_key}` or `corsair/{slug}`
2. Makes commits with descriptive messages
3. Pushes branch to remote
4. Creates PR via GitHub API (or via `gh` CLI)
5. Writes PR URL to `PR_URL.txt`

The runner reads `PR_URL.txt` and extracts the PR number to update the task.

---

## Datadog Integration (`integrations/datadog/`)

### Required Env Vars
```
DD_API_KEY          # Datadog API Key
DD_APP_KEY          # Datadog Application Key
DD_SITE             # Default: datadoghq.com
```

### Client (`datadog/client.py`)

Uses `httpx`:

```python
class DatadogIntegration(BaseIntegration):
    async def search_logs(self, query: str, from_ts: str, to_ts: str) -> list[dict]
    async def get_trace(self, trace_id: str) -> list[dict]  # Returns spans
    async def get_incident(self, incident_id: str) -> dict
    async def health_check(self) -> bool

    @staticmethod
    def parse_datadog_url(url: str) -> dict:
        """Extract trace_id, query from Datadog URLs."""

    @staticmethod
    def parse_incident_id(url: str) -> Optional[str]:
        """Extract incident ID from incident URLs."""
```

### Analyzer (`datadog/analyzer.py`)
```python
async def run_analysis(client: DatadogIntegration, query, trace_id, url) -> dict:
    """
    1. Fetch logs (if query provided)
    2. Fetch trace spans (if trace_id provided)
    3. Summarize with Claude API
    4. Return {summary, logs, trace, error}
    """
```

### API Endpoints (`api/v1/datadog.py`)
```
GET  /api/v1/datadog/analyses           # List analyses (paginated)
GET  /api/v1/datadog/analyses/{id}      # Single analysis
POST /api/v1/datadog/analyze            # Trigger manual analysis
POST /api/v1/datadog/investigate        # Create task + run INVESTIGATE stage
```

### Webhook Handler (`api/v1/webhooks.py`)
```
POST /api/v1/webhooks/datadog
  → Parse Datadog monitor webhook payload
  → Create DatadogAnalysis record
  → Create Task for investigation
  → Trigger INVESTIGATE stage
```

### Investigation Flow
```
Datadog alert/webhook
        │
        ▼
Create DatadogAnalysis + Task
        │
        ▼
run_agent(task, stage=INVESTIGATE, datadog_context={...})
        │
        ▼
Agent writes INVESTIGATION.md with:
  - Timeline
  - Root cause
  - Affected services
  - Resolution steps
```

---

## Adding a New Integration

1. Create directory: `backend/app/integrations/{name}/`
2. Create `__init__.py` with class extending `BaseIntegration`
3. Implement `health_check()`, set `name`, `description`, `required_env_vars`
4. Add client methods for the service API
5. Register in `IntegrationRegistry.initialize()` in `registry.py`
6. Add API endpoints in `backend/app/api/v1/{name}.py` if needed
7. Add router to `main.py`
8. Create `tests/` directory with mocked tests
9. Add env vars to `.env.example`
10. Document in `INTEGRATIONS.md`

---

## Database Logging for Integrations

`DatabaseLogHandler` in `log_handler.py` captures Python logs:

```python
# Logger name prefix → source mapping
"app.integrations.jira"    → source="jira"
"app.integrations.slack"   → source="slack"
"app.integrations.github"  → source="github"
"app.integrations.datadog" → source="datadog"
"app.main"                 → source="main"
```

Viewable at `GET /api/v1/logs?source=jira&level=ERROR`

# Corsair Agent Pipeline — Complete Reference

> Use this file as context when working on the agent execution system, prompts, workspace, or Claude Code CLI integration.

## Overview

Corsair runs Claude Code CLI as a subprocess to execute engineering tasks across 4 stages:
**PLAN → WORK → REVIEW → INVESTIGATE**

Each stage creates an `AgentRun` record, spawns a Claude Code process, streams output via WebSocket, and updates task status on completion.

## Execution Flow

```
User clicks "Run Plan" in UI
        │
        ▼
POST /api/v1/tasks/{id}/plan
        │
        ▼
Create AgentRun(stage=PLAN, status=RUNNING)
        │
        ▼
BackgroundTasks.add_task(run_agent, task, stage, ws_broadcast)
        │                              │
        ▼                              ▼ (returns immediately)
    run_agent()                   HTTP 200 {run}
        │
        ├── 1. Validate repo is enabled
        ├── 2. Create workspace directory
        ├── 3. Clone all enabled repos
        ├── 4. Write CLAUDE.md, PLAN.md, LESSONS.md
        ├── 5. Write skill + subagent files
        ├── 6. Capture initial file tree
        │
        ├── 7. Build stage-specific prompt
        │
        ├── 8. Launch Claude Code CLI
        │      claude --output-format stream-json \
        │             --verbose \
        │             --dangerously-skip-permissions \
        │             --max-turns 200 \
        │             -p "{prompt}"
        │
        ├── 9. Parse stream-json events line by line
        │      ├── Classify event → (LogType, content)
        │      ├── Save AgentLog to DB
        │      └── Broadcast via WebSocket
        │
        ├── 10. On completion:
        │       ├── Extract cost from final "result" event
        │       ├── Update AgentRun (tokens, cost, status, finished_at)
        │       ├── Read PLAN.md / PR_URL.txt / LESSONS.md
        │       ├── Update Task (status, plan, pr_url, pr_number)
        │       └── Read back LESSONS.md (agent may have updated it)
        │
        └── 11. Notify integrations (Jira comment + Slack thread)
```

## Agent Runner (`agent/runner.py`)

### Key Functions

```python
async def run_agent(
    task: Task,
    stage: RunStage,
    ws_broadcast: Callable,
    existing_run: Optional[AgentRun] = None,
    datadog_context: Optional[dict] = None,
) -> None
```
Main entry point. Creates workspace, launches CLI, parses output, updates DB.

```python
async def stop_run(run_id: str) -> None
```
Terminates the subprocess for a running agent.

```python
async def save_log(run_id: str, content: dict, log_type: LogType) -> AgentLog
```
Persists a log entry to the database.

```python
async def _emit(run_id: str, message: str, ws_broadcast: Callable, log_type: LogType) -> None
```
Saves log + broadcasts via WebSocket in one call.

```python
def _build_prompt(task: Task, stage: RunStage, datadog_context: Optional[dict]) -> str
```
Assembles the full prompt by combining base_prompt + stage-specific prompt.

```python
def _classify_event(event: dict) -> tuple[LogType, dict]
```
Parses Claude Code stream-json events into (LogType, content_dict):
- `assistant` → TEXT (thinking or text blocks)
- `tool_use` → TOOL_USE (tool name + input summary)
- `tool_result` → TOOL_RESULT (truncated output)
- `result` → extracts cost from usage stats
- `error` / `system` → ERROR

```python
async def _notify_run_complete(task, stage, success, plan_text, pr_url) -> None
```
Posts Jira comment + Slack thread update on stage completion.

### Process Management

The runner tracks active processes in a module-level dict:
```python
_active_processes: dict[str, asyncio.subprocess.Process] = {}
```

`stop_run()` sends SIGTERM, waits 5s, then SIGKILL if needed.

### Cost Tracking

Extracted from the `result` event in stream-json output:
```python
# From the final "result" event:
usage = event.get("usage", {})
tokens_in = usage.get("input_tokens", 0)
tokens_out = usage.get("output_tokens", 0)
cost = (tokens_in / 1_000_000 * 3.00) + (tokens_out / 1_000_000 * 15.00)
```

### WebSocket Broadcasting

```python
async def ws_broadcast(run_id: str, log: AgentLog):
    await ws_manager.broadcast(run_id, {
        "id": str(log.id),
        "type": log.type.value,
        "content": log.content,
        "created_at": log.created_at.isoformat(),
    })
```

## Prompt System (`agent/prompts.py`)

### Structure
Each prompt is built from:
1. **Base prompt** (from `settings/base_prompt`) — project-wide instructions
2. **Stage prompt** — stage-specific instructions

### PLAN Stage Prompt
```
You are an AI software engineer. Analyze this task and create a detailed implementation plan.

Task: {title}
Description: {description}
Acceptance Criteria: {acceptance}

Write a step-by-step implementation plan to PLAN.md.
Include: files to modify, approach for each change, testing strategy.
```

### WORK Stage Prompt
```
You are an AI software engineer. Implement the plan in PLAN.md.

Task: {title}
Repo: {repo}
Jira: {jira_key}

Steps:
1. Read PLAN.md
2. Implement all changes
3. Create branch: corsair/{jira_key or slug}
4. Commit with descriptive messages
5. Push branch to remote
6. Create PR on GitHub
7. Write PR URL to PR_URL.txt
```

### REVIEW Stage Prompt
```
You are an AI code reviewer. Review and fix any issues.

Task: {title}
PR: {pr_url}

Steps:
1. Review all changes since base branch
2. Fix any issues found
3. Ensure all commits pushed
4. Create/update PR with title and description
5. Write PR URL to PR_URL.txt
```

### INVESTIGATE Stage Prompt
```
You are an AI incident investigator. Analyze the following Datadog alert/incident.

Context: {datadog_context}

Produce:
- Timeline of events
- Root cause analysis
- Affected services
- Resolution steps

Write summary to INVESTIGATION.md.
```

## Workspace Management (`agent/workspace.py`)

### Workspace Structure
```
{WORKSPACE_BASE_DIR}/{run_id}/
├── CLAUDE.md              # Base prompt (from settings)
├── PLAN.md                # Implementation plan (from task.plan)
├── LESSONS.md             # Lessons learned (from settings)
├── PR_URL.txt             # Written by agent, read by system
├── INVESTIGATION.md       # Written by agent (investigate stage)
├── datadog_helper.py      # Helper for Datadog API calls
├── .claude/
│   ├── skills/
│   │   └── {name}.md      # Skill definitions (from settings)
│   └── agents/
│       └── {name}.md      # Subagent definitions (from settings)
├── org--repo-name/         # Primary repo (task.repo)
│   ├── .git/
│   └── src/ ...
└── org--other-repo/        # Other enabled repos
    ├── .git/
    └── ...
```

### Key Functions

```python
async def create_workspace(run_id: str) -> str
```
Creates `{WORKSPACE_BASE_DIR}/{run_id}/`, sets ownership to corsair user.

```python
async def clone_repo(workspace, full_name, branch, token, subfolder) -> str
```
Shallow clone (`--depth 1`) into workspace subfolder. Subfolder name: `org--repo` (slash → double dash).

```python
async def clone_all_repos(workspace, repos, token, task_repo) -> None
```
Clones all enabled repos concurrently. Task's primary repo cloned first.

```python
async def write_claude_md(workspace, content) -> None
async def write_plan_md(workspace, content) -> None
async def write_lessons_md(workspace, content) -> None
async def write_skill_files(workspace, skills_json) -> None
async def write_subagent_files(workspace, subagents_json) -> None
```
Write configuration files into workspace.

```python
async def read_pr_url(workspace) -> Optional[str]
```
Read PR_URL.txt, extract URL. Used to update task.pr_url after WORK/REVIEW.

```python
async def read_lessons_md(workspace) -> Optional[str]
```
Read LESSONS.md back from workspace — the agent may have updated it.

```python
async def cleanup_old_workspaces(retention_hours=24) -> None
```
Deletes workspaces older than retention period. Runs hourly.

### INVESTIGATE Stage Workspace
Lightweight — no repo cloning:
```python
if stage == RunStage.INVESTIGATE:
    # Only write CLAUDE.md + datadog_helper.py
    # No repo cloning
```

## Claude Code CLI Integration

### Invocation
```bash
claude \
  --output-format stream-json \
  --verbose \
  --dangerously-skip-permissions \
  --max-turns 200 \
  -p "{full_prompt}"
```

### Environment
```python
env = {
    **os.environ,
    "ANTHROPIC_API_KEY": settings.anthropic_api_key,
    "HOME": "/home/corsair",
}
```

### Stream-JSON Event Format
Each line is a JSON object. Event types:

```json
// Assistant text/thinking
{"type": "assistant", "message": {"content": [
  {"type": "text", "text": "..."} |
  {"type": "thinking", "thinking": "..."}
]}}

// Tool use
{"type": "assistant", "message": {"content": [
  {"type": "tool_use", "name": "Read", "input": {"file_path": "..."}}
]}}

// Tool result
{"type": "tool_result", "content": "..."}

// Final result (contains cost)
{"type": "result", "usage": {"input_tokens": N, "output_tokens": N}}

// Error
{"type": "error", "error": {"message": "..."}}

// System message
{"type": "system", "message": "..."}
```

## Task Status Transitions

```
                ┌──── analyze ────┐
                ▼                 │
BACKLOG ──plan──► PLANNED ──work──► WORKING ──review──► REVIEWING ──► DONE
   │                  ▲               │                     │
   │                  └───────────────┘                     │
   │                    (on failure, reset to PLANNED)      │
   │                                                        │
   └────────────────────────────────────────────────────────┘
                        (retry resets to appropriate state)
```

### Status Updates by Stage
| Stage | On Start | On Success | On Failure |
|-------|----------|------------|------------|
| PLAN | — | PLANNED | status unchanged, run FAILED |
| WORK | — | WORKING | reset to PLANNED, run FAILED |
| REVIEW | — | REVIEWING→DONE | reset to PLANNED, run FAILED |
| INVESTIGATE | — | DONE | run FAILED |

## Notifications on Completion

### Jira
- Adds comment with stage result (plan summary, PR URL, etc.)
- Updates status via transition (using `jira_reverse_status_mapping`)

### Slack
- Posts thread reply in original task thread
- Includes: stage name, success/failure, PR URL if created

## Retry Logic

`POST /api/v1/tasks/{id}/retry`:
1. If task has `jira_key`, fetch current Jira status and map to TaskStatus
2. Reset task status to mapped status (or BACKLOG if unknown)
3. Mark latest FAILED run as retryable

## Analysis (`agent/analysis.py`)

Lightweight analysis — no Claude Code CLI:
```python
async def analyze_task(task: Task) -> str:
    messages = await Conversation.filter(task=task).order_by("created_at")
    # Call Anthropic API directly (not CLI)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        messages=[...conversation context...],
        system="Summarize this task request..."
    )
    task.analysis = response.content[0].text
    await task.save()
    # Notify Jira + Slack
```

## File Tree Capture

After workspace setup, the runner captures the initial file tree:
```python
file_tree = []
for root, dirs, files in os.walk(workspace):
    for f in files:
        path = os.path.relpath(os.path.join(root, f), workspace)
        size = os.path.getsize(os.path.join(root, f))
        file_tree.append({"name": path, "type": "file", "size": size})
run.file_tree = file_tree
await run.save()
```

This is served via `GET /api/v1/tasks/{id}/runs/{run_id}/files` and displayed in `FileTreeViewer`.

## Settings That Affect Agent Behavior

| Setting Key | Effect |
|------------|--------|
| `base_prompt` | Prepended to every agent prompt (CLAUDE.md content) |
| `lessons` | Written as LESSONS.md in workspace |
| `skills` | Written as `.claude/skills/{name}.md` files |
| `subagents` | Written as `.claude/agents/{name}.md` files |
| `max_active_agents` | Limits concurrent running agents |
| `jira_reverse_status_mapping` | Maps TaskStatus → Jira transition names |

# Plan: Log Retention + Done Task Retention Settings

## Context
Logs (internal + agent) accumulate forever in the DB. Done tasks stay on the board indefinitely. This adds two configurable settings with periodic background cleanup, using the existing settings store (no migrations needed).

## Changes

### 1. New cleanup module
**Create:** `backend/app/cleanup.py`

Two functions:
- `cleanup_old_logs()` — reads `log_retention_hours` setting (default 24), deletes `InternalLog` and `AgentLog` rows with `created_at` older than the cutoff. 0 = keep forever.
- `cleanup_done_tasks()` — reads `done_retention_hours` setting (default 0 = keep forever), soft-deletes (`deleted_at = now`) tasks where `status=DONE`, `deleted_at=None`, and `updated_at` is older than the cutoff.

Both use a shared `_get_setting_int(key, default)` helper to read the setting from DB each call.

### 2. Unified maintenance loop in main.py
**Modify:** `backend/app/main.py`

Replace the inline `_workspace_cleanup_loop` with a `_maintenance_loop` that runs all three cleanups (workspace, logs, done tasks) hourly in sequence, each in its own try/except. Rename `app.state.workspace_cleanup_task` → `app.state.maintenance_task` and update the shutdown cancel.

### 3. Frontend hooks
**Modify:** `frontend/src/hooks/useSettings.ts`

Add `useLogRetention()` (key: `"log_retention_hours"`) and `useDoneRetention()` (key: `"done_retention_hours"`), following the exact `useMaxActiveAgents` pattern.

### 4. Settings UI cards
**Modify:** `frontend/src/pages/Settings.tsx`

Add two card sections after Max Active Agents, before Skills:
- **Log Retention (hours)** — number input, placeholder "24", helper: "Internal and agent logs older than this are automatically deleted. Set to 0 to keep forever. Default: 24 hours."
- **Done Task Retention (hours)** — number input, placeholder "0", helper: "Tasks with status 'done' are automatically archived after this many hours. Set to 0 to keep forever. Default: 0."

### 5. Backend tests
**Create:** `backend/tests/test_cleanup.py`

- `TestCleanupOldLogs`: deletes old internal logs, deletes old agent logs, skips when 0, uses default 24h when unset, falls back to default on invalid value
- `TestCleanupDoneTasks`: soft-deletes old done tasks, skips recent, skips non-done, skips already-deleted, skips when 0, uses default 0 (keep forever) when unset

### 6. Frontend tests
**Modify:** `frontend/src/pages/__tests__/Settings.test.tsx`

Add tests: log retention section renders, displays fetched value, saves on click. Done retention section renders, displays fetched value.

### 7. Docs
- **`docs/api-contract.md`** — add `log_retention_hours`, `done_retention_hours` to known setting keys
- **`docs/data-models.md`** — add known settings keys reference table

## Verification
1. `cd backend && pytest tests/ --cov=app --cov-fail-under=80`
2. `cd frontend && npm test -- --run`

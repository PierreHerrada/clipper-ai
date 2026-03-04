# Corsair Frontend — Complete Reference

> Use this file as context when working on React components, pages, hooks, or styling.

## Tech Stack

- **React 19.2** with functional components + hooks
- **TypeScript 5.9** in strict mode
- **Vite 7.3** — dev server + build tool
- **Tailwind CSS 4.2** — utility-first styling with custom theme
- **dnd-kit 6.3** — drag-and-drop for Kanban board
- **React Router 7.13** — client-side routing
- **Vitest 4.0** + React Testing Library — testing
- **No state management library** — custom hooks + context only

## Routing (`App.tsx`)

```
/login              → Login         (public)
/                   → Board         (protected — Kanban task board)
/dashboard          → Dashboard     (protected — metrics + active agents)
/tasks/:taskId      → TaskDetail    (protected — task info + logs)
/status             → Status        (protected — integration health)
/settings           → Settings      (protected — all config editors)
/chat               → Chat          (protected — Slack messages)
/datadog            → Datadog       (protected — analysis interface)
/logs               → Logs          (protected — internal system logs)
```

`ProtectedRoute` wraps all protected routes — redirects to `/login` if unauthenticated.

## TypeScript Types (`types/index.ts`)

### Core Domain
```typescript
type TaskStatus = "backlog" | "planned" | "working" | "reviewing" | "done"
type RunStage = "plan" | "work" | "review" | "investigate"
type RunStatus = "running" | "done" | "failed"
type LogType = "text" | "tool_use" | "tool_result" | "error"

interface Task {
  id: string
  title: string
  description: string
  acceptance: string
  status: TaskStatus
  jira_key: string | null
  jira_url: string | null
  pr_url: string | null
  pr_number: number | null
  repo: string | null
  plan: string
  analysis: string
  slack_channel: string
  slack_thread_ts: string
  slack_user_id: string
  created_at: string
  updated_at: string
  latest_run: AgentRun | null    // Most recent run (included by API)
}

interface AgentRun {
  id: string
  task_id: string
  stage: RunStage
  status: RunStatus
  tokens_in: number
  tokens_out: number
  cost_usd: string              // Decimal as string
  started_at: string
  finished_at: string | null
  workspace_path: string | null
  file_tree: FileTreeEntry[] | null
  logs?: AgentLog[]             // Included when fetching runs
}

interface AgentLog {
  id: string
  run_id: string
  type: LogType
  content: Record<string, unknown>  // {"message": string, ...}
  created_at: string
}

interface FileTreeEntry {
  name: string
  type: "file" | "directory"
  size?: number
  children?: FileTreeEntry[]
}
```

### Analytics
```typescript
interface DashboardStats {
  total_cost_usd: string
  active_runs: number
  tasks_by_status: Record<TaskStatus, number>
}

interface CostBreakdown {
  task_id: string
  task_title: string
  stages: { stage: RunStage; cost_usd: string; tokens_in: number; tokens_out: number }[]
  total_cost_usd: string
}
```

### Settings & Integrations
```typescript
interface IntegrationStatus { name: string; description: string; active: boolean; missing_env_vars: string[] }
interface IntegrationHealth { name: string; healthy: boolean; error: string | null }
interface SettingResponse { key: string; value: string; updated_at: string }
interface SettingHistoryEntry { id: string; old_value: string; new_value: string; change_source: string; changed_at: string }
interface Repository { id: string; full_name: string; enabled: boolean; default_branch: string; last_synced_at: string | null }
interface SkillItem { name: string; content: string }
interface SubagentItem { name: string; content: string }
```

## API Client Layer (`api/`)

### Base Client (`client.ts`)
```typescript
getToken(): string | null         // Read JWT from localStorage
setToken(token: string): void     // Store JWT
clearToken(): void                // Remove JWT
apiFetch(input, init?): Response  // Fetch wrapper:
  // - Injects Authorization: Bearer <token>
  // - On 401/403: clearToken() + redirect to /login
```

### Task API (`tasks.ts`)
```typescript
fetchTasks(): Task[]
fetchTask(id): Task
updateTaskStatus(id, status): Task
updateTaskRepo(id, repo): Task
triggerStage(id, "plan" | "work" | "review"): AgentRun
stopTask(id): AgentRun
retryTask(id): Task
fetchTaskRuns(id): RunWithLogs[]     // Runs include nested logs
```

### Other APIs
```typescript
// dashboard.ts
fetchStats(): DashboardStats
fetchCosts(): CostBreakdown[]

// settings.ts
fetchSetting(key): SettingResponse
updateSetting(key, value): SettingResponse
fetchSettingHistory(key, limit, offset): SettingHistoryResponse

// repositories.ts
fetchRepositories(): Repository[]
syncRepositories(): SyncResult
toggleRepository(id, enabled): Repository

// agent.ts
fetchIntegrations(): IntegrationStatus[]
fetchIntegrationHealth(): IntegrationHealth[]
triggerJiraSync(): { status, imported, pushed }
fetchJiraStatusDefaults(): Record<string, string>
```

## State Management

### Auth Context (`context/AuthContext.tsx`)
```typescript
interface AuthContextValue {
  isAuthenticated: boolean
  token: string | null
  login(password: string): Promise<void>
  logout(): void
}
// Used via useAuth() hook
```

### Data Hooks (all in `hooks/`)

| Hook | Polling | Returns |
|------|---------|---------|
| `useTasks()` | 15s | `{ tasks, loading, error, refresh }` |
| `useDashboard()` | 5s (active) / 15s (idle) | `{ stats, costs, loading, error, refresh }` |
| `useWebSocket(runId)` | Real-time | `{ logs, connected, clear }` |
| `useTheme()` | N/A | `{ theme, toggleTheme }` |
| `useChatMessages()` | Manual | `{ messages, total, offset, nextPage, prevPage }` |
| `useLogs()` | Manual | `{ logs, total, source, level, filterBySource, filterByLevel }` |
| `useDatadog()` | Manual | `{ analyses, total, analyze, investigate }` |
| `useRepositories()` | Manual | `{ repos, loading, syncing, sync, toggle }` |
| `useIntegrationHealth()` | Manual | `{ integrations, health, checkHealth }` |

### Settings Hooks (all in `hooks/useSettings.ts`)

All return: `{ value, setValue, loading, saving, error, lastSaved, save }`

| Hook | Setting Key | Extra |
|------|------------|-------|
| `useBasePrompt()` | `base_prompt` | — |
| `useMaxActiveAgents()` | `max_active_agents` | — |
| `useJiraSyncInterval()` | `jira_sync_interval` | default 60s |
| `useLessons()` | `lessons` | + `{ history, loadHistory }` |
| `useSkills()` | `skills` | `useNamedItems<SkillItem>` pattern |
| `useSubagents()` | `subagents` | `useNamedItems<SubagentItem>` pattern |
| `useJiraStatusMapping()` | `jira_status_mapping` | + `{ entries, resetToDefaults }` |

## Components (`components/`)

### TaskBoard (`TaskBoard.tsx`)
- 5-column Kanban: backlog, planned, working, reviewing, done
- Uses `DndContext` + `DragOverlay` from `@dnd-kit/core`
- Drop between columns → calls `updateTaskStatus()` API
- Column headers show count
- Each card is a `TaskCard`

### TaskCard (`TaskCard.tsx`)
- Draggable via `useDraggable()` from dnd-kit
- Shows: title, Jira badge, PR badge, cost, last run info
- Links to `/tasks/{id}`
- `StageControls` inline for quick stage triggers

### StageControls (`StageControls.tsx`)
- Renders "Run Plan" / "Run Work" / "Run Review" based on task status
- Shows "Stop" button if task has a running agent
- Disables during execution
- Calls `triggerStage()` / `stopTask()` APIs

### AgentLogViewer (`AgentLogViewer.tsx`)
- Scrollable log panel with auto-scroll to bottom
- Color-coded by LogType:
  - `text` → default
  - `tool_use` → blue accent
  - `tool_result` → subtle
  - `error` → red
- Shows "Live" or "Stored" connection indicator
- Extracts `content.message` from each log

### FileTreeViewer (`FileTreeViewer.tsx`)
- Builds nested tree from flat `FileTreeEntry[]`
- Sorts: directories first, then alphabetical
- Expandable/collapsible (default 2 levels deep)
- Shows file sizes

### Other Components
| Component | Purpose |
|-----------|---------|
| `CostWidget` | Cost breakdown table by stage + task |
| `ActiveAgentRow` | Dashboard row for running tasks (elapsed time, cost, stop) |
| `PRBadge` | Minimal PR link with number |
| `ProtectedRoute` | Auth guard wrapper |
| `NamedItemsEditor` | Generic editor for `{name, content}[]` arrays |
| `LessonsEditor` | LESSONS.md editor with collapsible change history |

## Pages (`pages/`)

### Board (`Board.tsx`)
- Renders `TaskBoard` component
- Refresh button triggers `useTasks().refresh()`

### Dashboard (`Dashboard.tsx`)
- 3 metric cards: total cost, active runs, tasks by status
- Active agents table with `ActiveAgentRow`
- `CostWidget` for breakdown
- Smart polling: 5s when agents running, 15s otherwise

### TaskDetail (`TaskDetail.tsx`)
- Task header: title, status dropdown, Jira/PR links
- Description + acceptance + analysis sections
- Run selector: buttons for each run (stage badge, status, cost)
- Split view: `AgentLogViewer` (left) + `FileTreeViewer` (right)
- Live WebSocket logs for running runs
- Auto-refresh every 5s while running

### Settings (`Settings.tsx`)
- Base Prompt: textarea with collapsible example template
- Repositories: list with enable/disable toggles + "Sync from GitHub" button
- Max Active Agents: number input
- Jira Sync Interval: number input (seconds)
- Skills: `NamedItemsEditor`
- Subagents: `NamedItemsEditor`
- Lessons: `LessonsEditor` with history panel

### Status (`Status.tsx`)
- Integration cards: name, description, active/inactive badge, missing env vars
- Health check button → shows healthy/error per integration
- Jira sync button → shows imported/pushed counts
- Expandable Jira status mapping editor (map Jira statuses → Corsair statuses)

## Theme System (`index.css`)

### Custom Color Tokens
Theme switches via `.dark` class on `<html>`:

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `deep` | #F8FAFC | #020B18 | Page background |
| `abyss` | #F1F5F9 | #05152A | Container background |
| `navy` | #E2E8F0 | #0A2444 | Borders |
| `ocean` | #CBD5E1 | #0D3366 | Subtle elements |
| `horizon` | #94A3B8 | #0F4C8A | Muted text |
| `wave` | #2563EB | #1A6FB5 | Primary blue |
| `sky` | #0284C7 | #2B9ED4 | Bright blue |
| `foam` | #0369A1 | #5EC4F0 | Accent (links, highlights) |
| `mist` | #475569 | #A8DCF2 | Secondary text |
| `white` | #0F172A | #EEF6FF | Primary text |
| `teal` | #059669 | #00D4B4 | Success |
| `gold` | #D97706 | #F0A500 | Warning |
| `coral` | #DC2626 | #E8445A | Error |

### Usage in Tailwind
```html
<div class="bg-deep text-white border-foam/8">
<span class="text-foam">Link text</span>
<span class="text-teal">Success</span>
```

### Fonts
- Body: **Inter** (system fallback)
- Code: **JetBrains Mono**

## Dev Server Proxy (`vite.config.ts`)

```
/api/*  → http://localhost:8000
/ws/*   → ws://localhost:8000
```

## Commands

```bash
cd frontend
npm run dev                  # Dev server (localhost:5173)
npm run build                # Production build (tsc + vite)
npm test                     # Run all tests
npm test -- --coverage       # Tests with coverage
npm run lint                 # ESLint
npm run format               # Prettier
```

## Testing Patterns

- **Test files:** `__tests__/*.test.tsx` co-located in `components/` and `pages/`
- **Setup:** `test-setup.ts` imports `@testing-library/jest-dom`, mocks `scrollIntoView`
- **Mocking APIs:** Mock `../api/*` modules in tests
- **Mocking hooks:** Mock `../hooks/*` for page-level tests
- **Router:** Wrap with `MemoryRouter` for route-dependent components
- **Auth:** Mock `AuthContext` provider in tests
- **Coverage target:** >= 80%

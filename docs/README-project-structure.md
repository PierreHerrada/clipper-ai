# Corsair — Full Project Structure

> Use this file as context when you need to understand where things live.

## Root

```
corsair/
├── CLAUDE.md                # Claude Code instructions (loaded automatically)
├── LESSONS.md               # Error log & solutions (must check before every task)
├── README.md                # Project overview
├── ARCHITECTURE.md          # High-level architecture
├── INTEGRATIONS.md          # Integration development guide
├── CONTRIBUTING.md          # Development setup & PR process
├── SECURITY.md              # Security practices
├── CHANGELOG.md             # Version history
├── color-palette.md         # UI design tokens
├── first-instruction.md     # Original setup document
├── docker-compose.yml       # Local dev stack (single service + postgres)
├── Dockerfile               # Multi-stage: node build → python deps → final image
├── .env.example             # All environment variables
├── .gitignore
├── .github/
│   ├── workflows/ci.yml     # Backend + frontend CI
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                    # Detailed documentation
│   ├── api-contract.md      # REST + WS API spec (source of truth)
│   ├── data-models.md       # Database schema (source of truth)
│   ├── architecture.md      # System diagram & data flow
│   └── agent-prompts.md     # Claude Code CLI invocation details
├── backend/                 # Python FastAPI application
└── frontend/                # React TypeScript SPA
```

## Backend

```
backend/
├── app/
│   ├── main.py              # FastAPI app factory, startup/shutdown, router registration
│   ├── config.py            # Pydantic settings from environment variables
│   ├── db.py                # Tortoise ORM config + Aerich migration config
│   ├── auth.py              # JWT creation, verification, protected route dependency
│   ├── log_handler.py       # DatabaseLogHandler — saves integration logs to DB
│   │
│   ├── agent/               # AI agent execution system
│   │   ├── runner.py        # Main orchestration: run_agent(), stop_run(), event parsing
│   │   ├── prompts.py       # Stage-specific prompt builders (plan/work/review/investigate)
│   │   ├── workspace.py     # Workspace setup: clone repos, write files, cleanup
│   │   ├── analysis.py      # Lightweight task analysis via Anthropic API (no CLI)
│   │   └── cost.py          # TokenUsage class, cost calculation ($3/$15 per M tokens)
│   │
│   ├── api/v1/              # REST + WebSocket endpoints
│   │   ├── __init__.py      # Router aggregation + integration status endpoints
│   │   ├── tasks.py         # Task CRUD + stage triggers (plan/work/review/stop/retry)
│   │   ├── agent.py         # WebSocket endpoint for live run logs
│   │   ├── jira.py          # Jira sync/import endpoints
│   │   ├── settings.py      # Key-value settings CRUD + history
│   │   ├── dashboard.py     # Aggregated stats + cost breakdown
│   │   ├── repositories.py  # GitHub repo list/sync/toggle
│   │   ├── chat.py          # Slack chat message history
│   │   ├── datadog.py       # Datadog analysis + investigation triggers
│   │   ├── logs.py          # Internal log retrieval with filters
│   │   └── webhooks.py      # Generic webhook handler (Datadog monitors)
│   │
│   ├── models/              # Tortoise ORM models
│   │   ├── task.py          # Task + TaskStatus enum (backlog→done)
│   │   ├── agent_run.py     # AgentRun + RunStage/RunStatus enums
│   │   ├── agent_log.py     # AgentLog + LogType enum
│   │   ├── conversation.py  # Slack thread conversation messages
│   │   ├── chat_message.py  # Slack @mention messages
│   │   ├── datadog_analysis.py  # Datadog analysis records
│   │   ├── setting.py       # Key-value settings store
│   │   ├── setting_history.py   # Setting change audit trail
│   │   ├── repository.py    # GitHub repository registry
│   │   └── internal_log.py  # System logs for debugging
│   │
│   ├── integrations/        # Plugin system (each integration = own directory)
│   │   ├── base.py          # BaseIntegration abstract class
│   │   ├── registry.py      # IntegrationRegistry — discovery & lifecycle
│   │   ├── jira/
│   │   │   ├── client.py    # Jira REST API client (httpx)
│   │   │   ├── sync.py      # Bidirectional sync + status mapping
│   │   │   ├── adf.py       # Atlassian Document Format → plain text
│   │   │   └── tests/       # Jira-specific tests
│   │   ├── slack/
│   │   │   ├── bot.py       # Socket Mode listener, @mention → task creation
│   │   │   └── tests/
│   │   ├── github/
│   │   │   ├── client.py    # Org repo listing, PR creation
│   │   │   └── tests/
│   │   └── datadog/
│   │       ├── client.py    # Log search, trace/incident fetching
│   │       ├── analyzer.py  # Analysis with Claude summarization
│   │       └── tests/
│   │
│   └── websocket/
│       └── manager.py       # ConnectionManager — broadcast logs by run_id
│
├── tests/                   # Global test suite
│   ├── conftest.py          # Fixtures: setup_db, auth_headers, sample_task/run/log
│   ├── test_agent.py        # Agent runner, cost, prompt tests
│   ├── test_auth.py         # JWT creation/verification
│   ├── test_analysis.py     # Task analysis
│   ├── test_workspace.py    # Workspace setup/cleanup
│   ├── test_models.py       # Model validation
│   ├── test_api.py          # API endpoint tests
│   ├── test_jira_sync.py    # Jira sync logic
│   └── test_log_handler.py  # Database logging handler
│
├── requirements.txt         # Python dependencies (38 packages)
└── migrate.py               # Aerich migration script
```

## Frontend

```
frontend/
├── src/
│   ├── main.tsx             # React 19 root entry point
│   ├── App.tsx              # Layout (nav + routes) + AuthProvider
│   ├── index.css            # Tailwind imports + custom theme (light/dark)
│   ├── test-setup.ts        # Vitest config (jest-dom + jsdom mocks)
│   │
│   ├── types/
│   │   └── index.ts         # All TypeScript interfaces & type unions
│   │
│   ├── api/                 # Typed fetch wrappers (all use apiFetch)
│   │   ├── client.ts        # Token management + fetch wrapper (auto 401 redirect)
│   │   ├── auth.ts          # POST /api/v1/auth/login
│   │   ├── tasks.ts         # Task CRUD + stage triggers
│   │   ├── agent.ts         # Integration status + Jira sync
│   │   ├── dashboard.ts     # Stats + costs
│   │   ├── settings.ts      # Settings CRUD + history
│   │   ├── repositories.ts  # Repo list/sync/toggle
│   │   ├── chat.ts          # Chat messages (paginated)
│   │   ├── datadog.ts       # Analyses + investigate trigger
│   │   └── logs.ts          # Internal logs (paginated + filtered)
│   │
│   ├── context/
│   │   └── AuthContext.tsx   # Auth state + login/logout (JWT in localStorage)
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useTasks.ts      # Task polling (15s interval)
│   │   ├── useDashboard.ts  # Stats + costs polling (5s active / 15s idle)
│   │   ├── useWebSocket.ts  # Live agent logs via /ws/runs/{runId}
│   │   ├── useTheme.ts      # Dark/light toggle (localStorage + DOM class)
│   │   ├── useSettings.ts   # base_prompt, lessons, skills, subagents, jira mapping
│   │   ├── useRepositories.ts
│   │   ├── useIntegrationHealth.ts
│   │   ├── useChatMessages.ts
│   │   ├── useLogs.ts       # Source + level filtering
│   │   └── useDatadog.ts
│   │
│   ├── components/          # Reusable UI components
│   │   ├── TaskBoard.tsx    # Kanban board (5 columns, dnd-kit drag-drop)
│   │   ├── TaskCard.tsx     # Draggable task card
│   │   ├── StageControls.tsx    # Plan/Work/Review/Stop buttons
│   │   ├── AgentLogViewer.tsx   # Scrollable, color-coded log viewer
│   │   ├── FileTreeViewer.tsx   # Expandable file tree
│   │   ├── CostWidget.tsx       # Cost breakdown table
│   │   ├── ActiveAgentRow.tsx   # Running task row for dashboard
│   │   ├── PRBadge.tsx          # Pull request link badge
│   │   ├── ProtectedRoute.tsx   # Auth guard
│   │   ├── NamedItemsEditor.tsx # Generic editor for skills/subagents
│   │   ├── LessonsEditor.tsx    # LESSONS.md editor with history
│   │   └── __tests__/          # Component tests (9 files)
│   │
│   └── pages/               # Route components
│       ├── Login.tsx        # Password login
│       ├── Board.tsx        # Kanban task board
│       ├── Dashboard.tsx    # Metrics + active agents + costs
│       ├── TaskDetail.tsx   # Task info + runs + logs + file tree
│       ├── Status.tsx       # Integration health + Jira status mapping
│       ├── Settings.tsx     # All settings editors
│       ├── Chat.tsx         # Slack messages
│       ├── Datadog.tsx      # Datadog analysis interface
│       ├── Logs.tsx         # Internal logs with filtering
│       └── __tests__/       # Page tests (7 files)
│
├── package.json             # React 19 + Vite 7 + Tailwind 4 + dnd-kit
├── vite.config.ts           # Dev proxy (/api→:8000, /ws→ws://:8000)
├── tsconfig.json            # TypeScript references
├── tsconfig.app.json        # Strict mode app config
└── tsconfig.node.json       # Build config
```

## Key File Relationships

```
docs/api-contract.md  ←→  frontend/src/types/index.ts  ←→  backend/app/api/v1/*.py
docs/data-models.md   ←→  backend/app/models/*.py
CLAUDE.md             →   Loaded automatically by Claude Code
LESSONS.md            →   Must check before every task
```

## Routes (Frontend)

| Path | Page | Description |
|------|------|-------------|
| `/login` | Login | Password authentication |
| `/` | Board | Kanban task board (default) |
| `/dashboard` | Dashboard | Metrics, active agents, costs |
| `/tasks/:taskId` | TaskDetail | Task info + live/stored logs |
| `/status` | Status | Integration health + Jira mapping |
| `/settings` | Settings | All configuration editors |
| `/chat` | Chat | Slack message history |
| `/datadog` | Datadog | Analysis & investigation |
| `/logs` | Logs | Internal system logs |

## API Prefix

All REST endpoints: `/api/v1/...`
WebSocket: `/ws/runs/{run_id}?token={jwt}`
Health check: `/health` (no auth)

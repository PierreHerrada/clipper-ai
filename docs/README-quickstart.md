# Corsair — Quick Start & Environment Reference

> Use this file as context when setting up the project or debugging environment issues.

## What is Corsair?

An AI software engineering platform that:
1. Receives tasks via Slack @mention or Jira sync
2. Plans implementation using Claude Code CLI
3. Writes code, creates branches, opens PRs
4. Reviews its own changes
5. Investigates Datadog incidents

All in a single Docker container: FastAPI backend + React frontend + nginx.

## Local Development

### Prerequisites
- Docker + Docker Compose
- Python 3.12+
- Node.js 20+
- PostgreSQL 15 (or use Docker)

### Quick Start
```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your API keys

# 2. Run with Docker
docker-compose up --build
# Frontend: http://localhost:80
# Backend:  http://localhost:8000

# 3. Or run services separately:
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173 (proxies to :8000)
```

### Login
Default password: `changeme` (set via `ADMIN_PASSWORD` env var)

## Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/corsair` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `ADMIN_PASSWORD` | Login password | `changeme` |
| `JWT_SECRET` | JWT signing secret | Random string |

### Integrations (all optional — missing = inactive)

| Integration | Variables | Purpose |
|-------------|-----------|---------|
| **Slack** | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` | Task creation via @mention, thread updates |
| **Jira** | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` | Bidirectional ticket sync |
| **GitHub** | `GITHUB_TOKEN`, `GITHUB_ORG` | Repo management, PR creation |
| **Datadog** | `DD_API_KEY`, `DD_APP_KEY`, `DD_SITE` | Log/trace analysis, incident investigation |

### Additional Config
| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_BASE_DIR` | `/home/corsair/workspaces` | Agent workspace directory |
| `JIRA_SYNC_INTERVAL_SECONDS` | `300` | Background sync interval |
| `JIRA_SYNC_LABEL` | `corsair` | Label to filter Jira issues |
| `ENVIRONMENT` | `development` | `development` or `production` |

## Database Setup

### Local PostgreSQL
```bash
createdb corsair
# Set DATABASE_URL=postgres://localhost:5432/corsair in .env
```

### Migrations
```bash
cd backend
aerich upgrade  # Apply migrations
aerich migrate  # Generate new migration (after model changes)
```

## Docker Container Architecture

```
Docker Container
├── supervisord (process manager)
│   ├── uvicorn (FastAPI :8000)
│   └── nginx (:80)
│       └── Serves React SPA
│       └── Proxies /api/* and /ws/* to :8000
├── claude CLI (installed globally via npm)
└── corsair user (runs Claude Code processes)
```

## Key URLs (Local Dev)

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Frontend dev server (Vite) |
| `http://localhost:8000` | Backend API |
| `http://localhost:8000/health` | Health check |
| `http://localhost:8000/docs` | FastAPI Swagger docs |
| `ws://localhost:8000/ws/runs/{id}` | WebSocket for live logs |

## Development Commands

### Backend
```bash
cd backend
pytest tests/ --cov=app --cov-fail-under=80   # Tests (>= 80% coverage)
ruff check app/ tests/                          # Lint
ruff format app/ tests/                         # Format
aerich migrate                                  # Generate migration
aerich upgrade                                  # Apply migration
```

### Frontend
```bash
cd frontend
npm run dev                  # Dev server
npm run build                # Production build
npm test                     # Run tests
npm test -- --coverage       # Tests with coverage
npm run lint                 # ESLint
npm run format               # Prettier
```

### Docker
```bash
docker-compose up --build                       # Full stack
docker-compose run backend pytest               # Tests in container
```

## Critical Rules

1. **API shapes must match `docs/api-contract.md`** — this is the source of truth
2. **Models must match `docs/data-models.md`** — this is the source of truth
3. **Never hardcode secrets or URLs** — use environment variables
4. **Never call real external APIs in tests** — always mock
5. **Coverage >= 80%** before moving forward
6. **Check LESSONS.md** before starting any task
7. **Update LESSONS.md** when you encounter and resolve errors
8. **Each integration in its own directory** under `backend/app/integrations/`

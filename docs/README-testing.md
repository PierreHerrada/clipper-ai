# Corsair Testing — Complete Reference

> Use this file as context when writing or debugging tests.

## Coverage Requirement

**Both backend and frontend must maintain >= 80% coverage.**

## Backend Testing

### Stack
- **pytest 8.3** + **pytest-asyncio 0.25** + **pytest-cov 6.0**
- **ruff** for linting/formatting
- In-memory SQLite for DB tests (no PostgreSQL needed)

### Commands
```bash
cd backend
pytest tests/ --cov=app --cov-fail-under=80          # All tests + coverage
pytest tests/ -k test_agent                           # Run specific test
pytest tests/ app/integrations/*/tests/ --cov=app     # Include integration tests
ruff check app/ tests/                                 # Lint
ruff format app/ tests/                                # Format
```

### Test Structure
```
backend/tests/
├── conftest.py              # Shared fixtures
├── test_agent.py            # Agent runner, cost, prompt building
├── test_auth.py             # JWT creation/verification
├── test_analysis.py         # Task analysis (mocked Anthropic API)
├── test_workspace.py        # Workspace setup/cleanup
├── test_models.py           # Model validation, enums
├── test_api.py              # API endpoint tests (httpx TestClient)
├── test_jira_sync.py        # Jira sync logic
└── test_log_handler.py      # Database logging handler

backend/app/integrations/jira/tests/
├── conftest.py              # Jira-specific fixtures
└── test_jira_sync.py        # Jira sync unit tests
```

### Fixtures (`conftest.py`)

```python
@pytest.fixture
async def setup_db():
    """Initialize in-memory SQLite with all model schemas."""
    await Tortoise.init(
        db_url="sqlite://:memory:",
        modules={"models": [
            "app.models.task", "app.models.agent_run",
            "app.models.agent_log", "app.models.conversation",
            "app.models.chat_message", "app.models.datadog_analysis",
            "app.models.internal_log", "app.models.setting",
            "app.models.setting_history", "app.models.repository",
        ]},
    )
    await Tortoise.generate_schemas()
    yield
    await Tortoise.close_connections()

@pytest.fixture
def auth_headers():
    """JWT token for authenticated requests."""
    token = create_access_token()
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def sample_task(setup_db):
    """Create a test task in BACKLOG status."""
    return await Task.create(
        title="Test task",
        description="Test description",
        acceptance="Test acceptance",
        status=TaskStatus.BACKLOG,
    )

@pytest.fixture
async def sample_run(sample_task):
    """Create a test run for the sample task."""
    return await AgentRun.create(
        task=sample_task,
        stage=RunStage.PLAN,
        status=RunStatus.RUNNING,
    )

@pytest.fixture
async def sample_log(sample_run):
    """Create a test log entry."""
    return await AgentLog.create(
        run=sample_run,
        type=LogType.TEXT,
        content={"message": "Test log"},
    )
```

### Mocking Patterns

#### External APIs (CRITICAL: never call real APIs)
```python
# Mock httpx client for Jira/Datadog
@pytest.fixture
def mock_jira_client():
    with patch("app.integrations.jira.client.httpx.AsyncClient") as mock:
        client = AsyncMock()
        mock.return_value.__aenter__ = AsyncMock(return_value=client)
        mock.return_value.__aexit__ = AsyncMock(return_value=None)
        yield client

# Mock Anthropic API for analysis
@pytest.fixture
def mock_anthropic():
    with patch("app.agent.analysis.anthropic.AsyncAnthropic") as mock:
        client = AsyncMock()
        mock.return_value = client
        client.messages.create.return_value = MagicMock(
            content=[MagicMock(text="Analysis result")]
        )
        yield client
```

#### httpx Response Mock Helper
```python
# LESSON: httpx.Response requires ._request to be set
def make_response(status_code=200, json_data=None):
    resp = httpx.Response(status_code, json=json_data)
    resp._request = httpx.Request("GET", "http://test")
    return resp
```

#### AsyncIteratorMock
```python
# LESSON: AsyncMock __aiter__ doesn't work directly
class AsyncIteratorMock:
    def __init__(self, items):
        self._items = iter(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._items)
        except StopIteration:
            raise StopAsyncIteration
```

#### Subprocess Mock for Claude CLI
```python
@pytest.fixture
def mock_subprocess():
    with patch("asyncio.create_subprocess_exec") as mock:
        proc = AsyncMock()
        proc.stdout = AsyncIteratorMock([
            b'{"type":"assistant","message":{"content":[{"type":"text","text":"hello"}]}}\n',
            b'{"type":"result","usage":{"input_tokens":100,"output_tokens":50}}\n',
        ])
        proc.stderr = AsyncMock()
        proc.stderr.read = AsyncMock(return_value=b"")
        proc.returncode = 0
        proc.wait = AsyncMock(return_value=0)
        mock.return_value = proc
        yield proc
```

### API Testing Pattern
```python
from httpx import AsyncClient, ASGITransport
from app.main import create_app

@pytest.fixture
def app():
    return create_app()

@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

async def test_list_tasks(client, auth_headers, setup_db, sample_task):
    resp = await client.get("/api/v1/tasks", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test task"
```

### Key Lessons (from LESSONS.md)

1. **Tortoise ORM + pytest-asyncio:** Use direct `await Tortoise.init()` in fixtures, not `register_tortoise` helper
2. **httpx.Response mock:** Always set `resp._request = httpx.Request("GET", "http://test")`
3. **Async iteration:** Use custom `AsyncIteratorMock` class, not `AsyncMock.__aiter__`
4. **Git operations in tests:** Use absolute paths from repo root
5. **Background tasks:** Mock `BackgroundTasks.add_task` to prevent actual agent execution

---

## Frontend Testing

### Stack
- **Vitest 4.0** + **@vitest/coverage-v8**
- **React Testing Library** + **@testing-library/jest-dom**
- **@testing-library/user-event** for interactions
- **jsdom** environment

### Commands
```bash
cd frontend
npm test                     # Run all tests
npm test -- --coverage       # Tests with coverage
npm test -- --watch          # Watch mode
npm test -- -t "TaskCard"    # Run matching tests
```

### Test Structure
```
frontend/src/
├── components/__tests__/
│   ├── TaskBoard.test.tsx
│   ├── TaskCard.test.tsx
│   ├── StageControls.test.tsx
│   ├── ProtectedRoute.test.tsx
│   ├── AgentLogViewer.test.tsx
│   ├── CostWidget.test.tsx
│   ├── FileTreeViewer.test.tsx
│   ├── PRBadge.test.tsx
│   └── ActiveAgentRow.test.tsx
└── pages/__tests__/
    ├── Board.test.tsx
    ├── Dashboard.test.tsx
    ├── Status.test.tsx
    ├── Chat.test.tsx
    ├── Login.test.tsx
    ├── Datadog.test.tsx
    └── Settings.test.tsx
```

### Test Setup (`test-setup.ts`)
```typescript
import "@testing-library/jest-dom"
// jsdom doesn't implement scrollIntoView (LESSON)
Element.prototype.scrollIntoView = () => {}
```

### Mocking Patterns

#### API Modules
```typescript
// Mock the entire API module
vi.mock("../api/tasks", () => ({
  fetchTasks: vi.fn(),
  fetchTask: vi.fn(),
  triggerStage: vi.fn(),
  updateTaskStatus: vi.fn(),
}))
```

#### Hooks
```typescript
// Mock hooks for page-level tests
vi.mock("../hooks/useTasks", () => ({
  useTasks: () => ({
    tasks: mockTasks,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))
```

#### Auth Context
```typescript
const mockAuth = {
  isAuthenticated: true,
  token: "test-token",
  login: vi.fn(),
  logout: vi.fn(),
}

render(
  <AuthContext.Provider value={mockAuth}>
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  </AuthContext.Provider>
)
```

#### Router
```typescript
import { MemoryRouter } from "react-router-dom"

render(
  <MemoryRouter initialEntries={["/tasks/123"]}>
    <Routes>
      <Route path="/tasks/:taskId" element={<TaskDetail />} />
    </Routes>
  </MemoryRouter>
)
```

#### localStorage (LESSON: jsdom needs full mock)
```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, "localStorage", { value: localStorageMock })
```

### Component Test Pattern
```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

describe("TaskCard", () => {
  const mockTask: Task = {
    id: "1",
    title: "Test task",
    status: "backlog",
    // ... other required fields
  }

  it("renders task title", () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText("Test task")).toBeInTheDocument()
  })

  it("shows PR badge when pr_url exists", () => {
    render(<TaskCard task={{ ...mockTask, pr_url: "https://github.com/...", pr_number: 42 }} />)
    expect(screen.getByText("#42")).toBeInTheDocument()
  })

  it("calls triggerStage on button click", async () => {
    const user = userEvent.setup()
    render(<TaskCard task={mockTask} />)
    await user.click(screen.getByText("Run Plan"))
    expect(triggerStage).toHaveBeenCalledWith("1", "plan")
  })
})
```

### Key Lessons (from LESSONS.md)

1. **jsdom scrollIntoView:** Add `Element.prototype.scrollIntoView = () => {}` in test-setup.ts
2. **jsdom localStorage:** Mock entirely with `Object.defineProperty`
3. **Vite + Vitest config:** Add `/// <reference types="vitest/config" />` at top of vite.config.ts
4. **Async state updates:** Use `waitFor()` or `findBy*` queries for state that updates after render
5. **DnD testing:** Mock `@dnd-kit/core` context for TaskBoard tests

---

## CI Pipeline (`.github/workflows/ci.yml`)

### Backend Job
```yaml
- PostgreSQL 15 service container
- Python 3.12
- pip install -r backend/requirements.txt
- pytest tests/ app/integrations/*/tests/ --cov=app --cov-report=xml --cov-fail-under=80
- Upload coverage to codecov
```

### Frontend Job
```yaml
- Node 20
- npm ci
- npx vitest run --coverage
```

Both must pass before merge.

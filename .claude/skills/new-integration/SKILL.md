---
name: new-integration
description: Scaffold a new integration module under backend/app/integrations/. Use when adding a new third-party service integration.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: [integration-name]
---

Scaffold a new integration called `$ARGUMENTS`.

## Before starting

Read these files:
- `CLAUDE.md` for project rules
- `LESSONS.md` for past mistakes
- `backend/app/integrations/base.py` for the BaseIntegration interface
- `backend/app/integrations/registry.py` for how integrations are registered
- `backend/app/integrations/datadog/` as a reference implementation

## Directory structure to create

```
backend/app/integrations/$ARGUMENTS/
├── __init__.py
├── client.py          # Extends BaseIntegration
├── tests/
│   ├── __init__.py
│   ├── conftest.py    # Test fixtures
│   └── test_$ARGUMENTS.py
```

## Requirements

- The client class must extend `BaseIntegration` from `app.integrations.base`
- Define `name`, `description`, and `required_env_vars`
- Implement `health_check()` async method
- Add env vars to `app/config.py` as settings fields
- Register in `app/integrations/registry.py`
- Never hardcode secrets or URLs
- Never call real external APIs in tests — always mock
- Use `httpx.AsyncClient` for HTTP calls
- Follow the Datadog integration as a pattern

After scaffolding, run tests to verify:
```bash
cd /Users/pierreherrada/clipper-ai/backend && python3 -m pytest tests/ -x -v
```

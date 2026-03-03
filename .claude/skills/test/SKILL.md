---
name: test
description: Run the full test suite for backend, frontend, or both. Use when the user asks to run tests, verify changes, or check coverage.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
argument-hint: [backend|frontend|all]
---

Run the project test suite. Argument: `backend`, `frontend`, or `all` (default: `all`).

Always read LESSONS.md before running tests.

## Backend tests

```bash
cd /Users/pierreherrada/clipper-ai/backend
python3 -m pytest tests/ --cov=app -x -v
```

Also run lint:
```bash
cd /Users/pierreherrada/clipper-ai/backend
ruff check app/ tests/
```

## Frontend tests

```bash
cd /Users/pierreherrada/clipper-ai/frontend
npm test -- --run
```

## Rules

- If `$ARGUMENTS` is `backend`, run only backend tests.
- If `$ARGUMENTS` is `frontend`, run only frontend tests.
- If `$ARGUMENTS` is `all` or empty, run both.
- Report pass/fail counts and any failures clearly.
- If coverage is below 80%, warn the user.

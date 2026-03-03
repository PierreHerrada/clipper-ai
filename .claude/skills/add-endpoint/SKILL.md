---
name: add-endpoint
description: Add a new API endpoint to the backend. Use when the user wants to create a new route.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: [METHOD /path description]
---

Add a new API endpoint: `$ARGUMENTS`

## Before starting

Read these files:
- `docs/api-contract.md` for the existing API contract
- `CLAUDE.md` for project rules
- `LESSONS.md` for past mistakes
- An existing router file (e.g., `backend/app/api/v1/tasks.py`) as a pattern

## Steps

1. Determine which router file to modify or create. All routers are in `backend/app/api/v1/`.

2. Add the endpoint following existing patterns:
   - Use Pydantic models for request/response bodies
   - Use proper HTTP status codes
   - Add error handling with `HTTPException`
   - Follow the existing naming conventions

3. If creating a new router file:
   - Register it in `backend/app/main.py`
   - Add to `docs/api-contract.md`

4. Update `docs/api-contract.md` with the new endpoint's contract (request/response shapes).

5. If the frontend needs the endpoint, add the API function in `frontend/src/api/`.

6. Update `frontend/src/types/index.ts` if new types are needed.

7. Run tests:
   ```bash
   cd /Users/pierreherrada/clipper-ai/backend && python3 -m pytest tests/ -x -q
   ```

## Rules

- API shapes must exactly match `docs/api-contract.md` — update the doc first
- All endpoints except `/health`, `/auth/login`, and `/webhooks/*` require JWT auth
- Never hardcode secrets or URLs

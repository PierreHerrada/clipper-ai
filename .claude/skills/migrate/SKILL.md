---
name: migrate
description: Create and apply a database migration. Use when schema changes are needed.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: [description]
---

Create a new database migration for: `$ARGUMENTS`

## Before starting

Read these files:
- `docs/data-models.md` for the current schema
- `LESSONS.md` for past mistakes
- Existing migrations in `backend/migrations/` to determine the next number

## Steps

1. Determine the next migration number by checking `backend/migrations/`:
   ```bash
   ls backend/migrations/*.sql | sort
   ```

2. Write the SQL migration file at `backend/migrations/NNN_description.sql` with:
   - `ALTER TABLE` or `CREATE TABLE` statements
   - Use safe defaults (`DEFAULT` values, `NULL` where appropriate)
   - No destructive changes without user confirmation

3. Update `docs/data-models.md` to reflect the schema change.

4. Update the corresponding Tortoise ORM model in `backend/app/models/`.

5. Update `docs/api-contract.md` if the change affects API response shapes.

6. Update `frontend/src/types/index.ts` if the change affects TypeScript types.

7. Run tests to verify nothing breaks:
   ```bash
   cd /Users/pierreherrada/clipper-ai/backend && python3 -m pytest tests/ -x -q
   ```

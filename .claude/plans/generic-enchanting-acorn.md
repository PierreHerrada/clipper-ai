# Plan: Parallelize All Dashboard API Calls

## Context
The Dashboard currently makes 3 API calls on mount:
- `fetchStats()` + `fetchCosts()` — parallelized together in `useDashboard` via `Promise.all`
- `fetchTasks()` — fired in a separate `useEffect` in `Dashboard.tsx`

While all 3 fire roughly at the same time (both effects run on mount), they use separate loading states and the page blocks on `statsLoading` before tasks even render. Consolidating all 3 into a single `Promise.all` ensures true parallel execution and a single loading gate.

## Changes

### 1. Expand `useDashboard` hook to include tasks
**File:** `frontend/src/hooks/useDashboard.ts`

- Import `fetchTasks` from `../api/tasks` and `Task` type
- Add `tasks` state (default `[]`)
- Add all 3 fetches to the existing `Promise.all`: `[fetchStats(), fetchCosts(), fetchTasks()]`
- Return `tasks` and `refresh` (refresh now covers all 3)

### 2. Simplify Dashboard component
**File:** `frontend/src/pages/Dashboard.tsx`

- Remove `fetchTasks` import and the separate `useState`/`useCallback`/`useEffect` for tasks
- Destructure `tasks` from `useDashboard()` instead
- Use `refresh` from `useDashboard` for the auto-refresh interval and `onStopped` callback
- No changes to the JSX/rendering logic

### 3. Update Dashboard tests
**File:** `frontend/src/pages/__tests__/Dashboard.test.tsx`

- Remove the `fetchTasks` mock from `../../api/tasks` — tasks are now fetched inside `useDashboard` via `../../api/dashboard` (but actually via the tasks API module)
- Actually: keep mocking `fetchTasks` from `../../api/tasks` since that's still the function being called, just now from inside `useDashboard`
- Ensure all existing tests still provide a `fetchTasks` mock return value

## Files touched
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/__tests__/Dashboard.test.tsx`

## Verification
1. `cd frontend && npm test -- --run` — all tests pass
2. `docker-compose up --build -d` — builds clean
3. Manual: Dashboard loads all data in a single loading phase

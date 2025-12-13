# Plan: Type API responses (fix `json is unknown`)

## Goal
- Fix TS error: `json` is of type `unknown` (ts18046) in `src/app/admin/dashboard/GoalForm.tsx`.
- Add response types for `/api/goals` and other APIs, and use them consistently in client/server code.
- Add tests for the new typed JSON helpers.

## Scope (endpoints to cover)
- `GET /api/goals`
- `POST /api/goals`
- `GET /api/goals/[id]`
- `PATCH /api/goals/[id]`
- `DELETE /api/goals/[id]`
- `POST /api/goals/[id]/completion`
- `POST /api/goals/[id]/target`
- `GET /api/timeline`
- `POST /api/timeline/notes`
- `DELETE /api/timeline/notes/[id]`

## Approach (plain breakdown)
1. **Inventory current response shapes** (they’re not fully consistent: `success`, `ok`, `message`, `error`).
2. **Introduce shared response types** in a single place:
   - `ApiSuccess<T>` / `ApiFailure` / `ApiResponse<T>`
   - Per-endpoint aliases, e.g. `GoalsListResponse`, `GoalMutationResponse`, `TimelineResponse`, etc.
3. **Add a small JSON helper** for fetch responses:
   - `readJson<T>(res)` returning `T | null` (safe parse)
   - `getErrorMessage(json)` extracting `message` / `error` when present
4. **Update clients to use typed parsing**:
   - Fix `GoalForm.tsx` by typing the JSON and handling both `message` + `error`.
   - Replace other `as { ... }` casts with the shared endpoint types where appropriate.
5. **Add tests (Vitest)**:
   - Unit tests for `readJson<T>` (valid JSON / invalid JSON / empty body)
   - Unit tests for `getErrorMessage` (prefers `message`, falls back to `error`, returns `null` otherwise)
6. **Run tests & typecheck**:
   - `pnpm test`
   - `pnpm lint` (optional if needed)

## Small-step (Red → Green)
- **Red**: Add a failing test for `getErrorMessage` + `readJson` behavior.
- **Green**: Implement helper + types; fix `GoalForm.tsx`.
- **Refactor**: Migrate remaining client call sites to the shared types.

## Acceptance criteria
- No `ts(18046)` errors at `GoalForm.tsx`.
- All fetch callers use a typed response (or the shared helper) instead of ad-hoc `as { ... }`.
- New helper tests pass.

## Question (confirm before coding)
- Do you want me to **keep the existing API response shapes** (minimal change), or **standardize** them (e.g. always `{ success: boolean, data?, message? }`) across all routes?


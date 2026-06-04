# Studio Director API Alias Plan

## Date

2026-06-04

## Status

Planning document for the next Studio API-boundary goal.

No API route, source behavior, JSON schema, persisted artifact, runtime policy, build setting, commit, push, or deployment is changed by this plan.

## Goal

Plan a compatibility-preserving Director API alias layer that exposes the five Human Director functions as stable read-oriented endpoints while keeping the existing AIWorkflow/Studio route modules and persisted artifacts intact.

The Director-facing API surface should mirror the canonical five Studio functions:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

## Source of Truth

Read these first before implementation:

- `AGENTS.md`
- `_Docs/Studio/Personal_AI_Game_Development_Operating_System_North_Star.md`
- `_Docs/Studio/Personal_AI_Game_Development_Operating_Rules.md`
- `_Docs/Studio/Studio_Director_Workflow_Principles.md`
- `_Docs/Studio/Studio_Current_System_Diagnostic_2026-06-04.md`
- `_Docs/Studio/Studio_Internal_Model_API_Consolidation_Plan_2026-06-04.md`
- `_Docs/Studio/Studio_Internal_Model_API_Inventory_2026-06-04.md`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`

## Background

Previous bounded goals established the required compatibility layers in order:

1. Fast UX containment
2. Director surface refactor
3. Internal model/API consolidation plan
4. Internal model/API inventory and read-only Director view models
5. UI consumption of Director view models

The current `/api/summary` response now includes:

```text
director_views:
  conversation_records
  decision_items
  execution_requests
  result_review_items
  record_items
```

The primary UI already consumes these `director_views` where available. The next API-boundary question is whether to expose stable Director-facing aliases so the client and future surfaces can request one Director function at a time without knowing legacy artifact names such as MeetingSession, WorkOrder, ReviewPacket, StaffRun, Proposal, Materialization, or MemoryRecord.

## Planning Scope

Allowed in this planning goal:

- Define future Director-facing API aliases.
- Define response shapes and compatibility metadata.
- Define implementation phases.
- Define tests and validation commands.
- Define non-goals and renewed approval triggers.
- Update documentation and WorkLog references.

Not allowed in this planning goal:

- Do not add API routes yet.
- Do not remove or rename existing API routes.
- Do not change `/api/summary` behavior.
- Do not change persisted JSON schema.
- Do not move persisted folders.
- Do not change save/load behavior.
- Do not change runtime execution policy.
- Do not modify game source under `PlayGround/`.
- Do not commit, push, deploy, or release.

## Current API Surface Snapshot

Current central dispatcher:

```text
tools/aiworkflow/studio/studioApiHandlers.js
```

Current summary route:

```text
GET /api/summary
```

Current route modules inspected:

```text
tools/aiworkflow/studio/studioApiHandlers.js
tools/aiworkflow/studio/studioEvidenceReviewApiRoutes.js
tools/aiworkflow/studio/studioKnowledgeDecisionApiRoutes.js
tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js
tools/aiworkflow/studio/studioToolAutomationApiRoutes.js
tools/aiworkflow/studio/studioWorkOrderApiRoutes.js
tools/aiworkflow/studio/studioWorkflowApiRoutes.js
```

Current legacy/domain route examples include:

```text
GET  /api/summary
POST /api/studio/meeting/create
POST /api/studio/meeting/add-turn
POST /api/studio/meeting/create-workorder
POST /api/studio/meeting/create-decision
POST /api/studio/workorder/create
POST /api/studio/workorder/handoff-plan
POST /api/studio/workorder/context-plan
POST /api/studio/workorder/staff-plan
POST /api/studio/workorder/staff-run
POST /api/studio/proposal/create
POST /api/studio/decision/create
POST /api/studio/memory/create
POST /api/studio/completion/decision-plan
POST /api/studio/completion/evidence-checklist
POST /api/review-packet/export
POST /api/output/materialize-plan
POST /api/output/materialize
POST /api/workflow/intake
POST /api/workflow/finalize
POST /api/workflow/task/approve-start
POST /api/workflow/git/commit
POST /api/workflow/git/push
```

Interpretation:

- Current routes are implementation-domain routes.
- They are useful as compatibility/action routes.
- They should not be deleted or renamed during alias introduction.
- The new Director API layer should begin as read-only aliases over `director_views`, not as a full mutation/action API.

## Target API Principle

The Director API aliases should be:

```text
Director-facing
Read-oriented first
Compatibility-preserving
Traceable to legacy source artifacts
Safe to consume by future UI/channel surfaces
Not a route deletion/migration
```

They should not become a second runtime control plane.

## Proposed Alias Surface

### Phase 1: Read-only list aliases

Introduce these aliases first:

```text
GET /api/director/conversations
GET /api/director/decisions
GET /api/director/execution-requests
GET /api/director/result-reviews
GET /api/director/records
```

Each endpoint returns one normalized Director view array from the existing `director_views` object.

Mapping:

| Director alias | Existing source | Response list |
|---|---|---|
| `GET /api/director/conversations` | `/api/summary.director_views.conversation_records` | `conversation_records` |
| `GET /api/director/decisions` | `/api/summary.director_views.decision_items` | `decision_items` |
| `GET /api/director/execution-requests` | `/api/summary.director_views.execution_requests` | `execution_requests` |
| `GET /api/director/result-reviews` | `/api/summary.director_views.result_review_items` | `result_review_items` |
| `GET /api/director/records` | `/api/summary.director_views.record_items` | `record_items` |

### Phase 1 response envelope

Use a shared response envelope:

```json
{
  "ok": true,
  "director_api_version": "2026-06-04.readonly-v1",
  "function": "conversation",
  "source": "director_views",
  "generated_at": "...",
  "count": 0,
  "items": []
}
```

Field meanings:

| Field | Meaning |
|---|---|
| `ok` | Whether the request succeeded. |
| `director_api_version` | Compatibility version for the alias contract. |
| `function` | One of `conversation`, `decision`, `execution_request`, `result_review`, `record_keeping`. |
| `source` | Should be `director_views` in Phase 1. |
| `generated_at` | Reuses summary generation timestamp. |
| `count` | Number of returned items after filtering. |
| `items` | Normalized Director view-model items. |

### Phase 1 optional query filters

Optional query filters may be added if implementation remains small and read-only:

```text
?status=<status>
?source_type=<source_type>
?q=<case-insensitive text search>
?limit=<positive integer>
```

Rules:

- Filters must not mutate state.
- Filters must not change persisted artifacts.
- `limit` should clamp to a safe maximum such as 100.
- Filtering should run against normalized view-model fields only: `title`, `summary`, `status`, `source_type`, `source_id`.

### Phase 1 non-goals

Do not add these yet:

```text
POST /api/director/conversations
POST /api/director/decisions
POST /api/director/execution-requests
POST /api/director/result-reviews
POST /api/director/records
```

Do not add write aliases until the read-only aliases are proven and the mutation semantics are separately approved.

## Future Phase 2: Action Alias Plan Only

After read-only aliases are stable, a separate planning goal may define action aliases such as:

```text
POST /api/director/conversations/start
POST /api/director/conversations/:id/turns
POST /api/director/decisions/:id/approve
POST /api/director/decisions/:id/request-changes
POST /api/director/execution-requests/create
POST /api/director/result-reviews/:id/request-fix
POST /api/director/records/create
```

But Phase 2 is not approved by this plan.

Reason:

- Write/action aliases require stronger decisions about validation, idempotency, audit trail, backward compatibility, request schema, and approval semantics.
- Some existing actions create WorkOrders, Decisions, Memories, Materializations, staff runs, or workflow task state.
- Those are state-changing boundaries and must not be quietly rebranded as simple aliases.

## Implementation Architecture

Recommended future files:

```text
Create: tools/aiworkflow/studio/studioDirectorApiAliases.js
Create: tools/aiworkflow/studio/studioDirectorApiAliases.test.js
Modify: tools/aiworkflow/studio/studioApiHandlers.js
```

Optional supporting file if the route table grows:

```text
Create: tools/aiworkflow/studio/studioDirectorApiAliasRegistry.js
```

Avoid modifying these during Phase 1 unless necessary:

```text
tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js
tools/aiworkflow/studio/studioWorkOrderApiRoutes.js
tools/aiworkflow/studio/studioKnowledgeDecisionApiRoutes.js
tools/aiworkflow/studio/studioEvidenceReviewApiRoutes.js
tools/aiworkflow/studio/studioWorkflowApiRoutes.js
tools/aiworkflow/studio/studioToolAutomationApiRoutes.js
```

Rationale:

- The alias layer should sit in front of or beside legacy routes.
- Legacy routes remain compatibility/action routes.
- The alias layer reads `getSummary(repoRoot)`, selects `director_views`, filters, wraps, and returns.

## Proposed Handler Shape

Future implementation should define a pure mapping table:

```js
const DIRECTOR_API_ALIASES = {
  "/api/director/conversations": {
    functionName: "conversation",
    viewKey: "conversation_records",
  },
  "/api/director/decisions": {
    functionName: "decision",
    viewKey: "decision_items",
  },
  "/api/director/execution-requests": {
    functionName: "execution_request",
    viewKey: "execution_requests",
  },
  "/api/director/result-reviews": {
    functionName: "result_review",
    viewKey: "result_review_items",
  },
  "/api/director/records": {
    functionName: "record_keeping",
    viewKey: "record_items",
  },
};
```

Handler outline:

```js
function createDirectorApiAliasHandler({ getSummary, sendJson }) {
  return async function handleDirectorApiAlias({ repoRoot, req, res, parsedUrl }) {
    const alias = DIRECTOR_API_ALIASES[parsedUrl.pathname];
    if (!alias || req.method !== "GET") return false;

    const summary = await getSummary(repoRoot);
    const allItems = Array.isArray(summary.director_views?.[alias.viewKey])
      ? summary.director_views[alias.viewKey]
      : [];
    const items = filterDirectorItems(allItems, parsedUrl.searchParams);

    return sendJson(res, 200, {
      ok: true,
      director_api_version: "2026-06-04.readonly-v1",
      function: alias.functionName,
      source: "director_views",
      generated_at: summary.generated_at,
      count: items.length,
      items,
    });
  };
}
```

This keeps behavior read-only and avoids duplicating data loaders.

## Test Plan for Future Implementation

Use TDD.

### Test 1: Alias map exposes five read-only endpoints

File:

```text
tools/aiworkflow/studio/studioDirectorApiAliases.test.js
```

Test intent:

- Create a fake `getSummary` returning known `director_views` arrays.
- Call each alias path with `GET`.
- Assert the response envelope contains the expected `function`, `count`, and `items`.

Expected RED before implementation:

```text
Cannot find module './studioDirectorApiAliases'
```

Expected GREEN after implementation:

```text
studioDirectorApiAliases tests passed
```

### Test 2: Non-alias paths return `false`

Assert:

```text
GET /api/summary -> false
POST /api/director/conversations -> false in Phase 1
GET /api/director/unknown -> false
```

This ensures the alias handler does not steal existing route ownership.

### Test 3: Filtering is read-only and normalized

If filters are included in Phase 1, assert:

```text
GET /api/director/records?source_type=dev_log
GET /api/director/result-reviews?status=ready_for_review
GET /api/director/records?q=Studio
GET /api/director/records?limit=2
```

The fake summary should remain unchanged after filtering.

### Test 4: Server integration

After unit tests pass, assert through server summary mode and browser/server smoke:

```text
node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json
```

Then start server and fetch:

```text
GET /api/director/conversations
GET /api/director/decisions
GET /api/director/execution-requests
GET /api/director/result-reviews
GET /api/director/records
```

Expected:

- HTTP 200
- `ok: true`
- stable `director_api_version`
- expected function name
- `items` is an array
- counts match `director_views` for the same key

## Validation Commands for Future Implementation

Run:

```bash
node tools/aiworkflow/studio/studioDirectorApiAliases.test.js
node tools/aiworkflow/studio/studioDirectorViewModels.test.js
node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js
node --check tools/aiworkflow/studio/studioDirectorApiAliases.js
node --check tools/aiworkflow/studio/studioDirectorApiAliases.test.js
node --check tools/aiworkflow/studio/studioApiHandlers.js
node --check tools/aiworkflow/studio_director_console_server.js
node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json
git diff --check
```

Then run server/browser smoke:

```bash
node tools/aiworkflow/studio_director_console_server.js --host 127.0.0.1 --port 4317
```

Fetch alias endpoints from browser or Python, using the actual fallback URL printed by the server.

Known current caveat:

```text
The server may fall back from requested port 4317 to a later port such as 4324 because prior local processes occupy earlier ports.
```

## Compatibility Rules

The alias implementation must preserve these:

- Existing `/api/summary` continues to return legacy arrays and `director_views`.
- Existing legacy/action routes continue to work.
- Existing UI can still call legacy POST routes for actions until a separately approved action alias migration exists.
- Alias routes do not write files.
- Alias routes do not approve, execute, commit, push, or modify source/data.
- Alias routes include traceability fields already present in view models: `source_type`, `source_id`, `path`, `href` when available.

## Renewed Approval Triggers

Stop and request renewed approval if implementation needs any of these:

- Adding POST/PUT/PATCH/DELETE Director aliases.
- Removing, renaming, or changing existing routes.
- Changing persisted JSON schemas.
- Changing save/load behavior.
- Moving persisted folders.
- Changing runtime execution, approval, commit, push, or build behavior.
- Introducing external dependencies.
- Changing the UI beyond consuming newly introduced read-only aliases.
- Modifying `PlayGround/` game source.

## Implementation Tasks for the Future Goal

### Task 1: Write failing alias tests

Files:

```text
Create: tools/aiworkflow/studio/studioDirectorApiAliases.test.js
```

Steps:

1. Import `createDirectorApiAliasHandler` from `./studioDirectorApiAliases`.
2. Build fake `req`, `res`, `parsedUrl`, `getSummary`, and `sendJson` helpers.
3. Assert the five GET aliases return expected envelopes.
4. Assert non-alias or non-GET requests return `false`.
5. Run:

```bash
node tools/aiworkflow/studio/studioDirectorApiAliases.test.js
```

Expected before implementation:

```text
FAIL: Cannot find module './studioDirectorApiAliases'
```

### Task 2: Implement read-only alias handler

Files:

```text
Create: tools/aiworkflow/studio/studioDirectorApiAliases.js
```

Steps:

1. Add alias mapping table.
2. Add `filterDirectorItems(items, searchParams)`.
3. Add `createDirectorApiAliasHandler({ getSummary, sendJson })`.
4. Export the handler and mapping for tests.
5. Run:

```bash
node tools/aiworkflow/studio/studioDirectorApiAliases.test.js
node --check tools/aiworkflow/studio/studioDirectorApiAliases.js
```

Expected:

```text
studioDirectorApiAliases tests passed
```

### Task 3: Register alias handler in central dispatcher

Files:

```text
Modify: tools/aiworkflow/studio/studioApiHandlers.js
```

Steps:

1. Import `createDirectorApiAliasHandler`.
2. Instantiate it with existing deps.
3. Invoke it after `/api/summary` and before legacy route modules.
4. Return its result if not `false`.
5. Run:

```bash
node --check tools/aiworkflow/studio/studioApiHandlers.js
node --check tools/aiworkflow/studio_director_console_server.js
```

Rationale:

- `/api/summary` stays exactly as-is.
- Director aliases are handled before legacy route modules.
- Legacy routes remain untouched.

### Task 4: Server-level alias assertion

Files:

```text
No source file required unless adding a test helper is useful.
```

Steps:

1. Run server once mode to confirm summary still works:

```bash
node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json
```

2. Start the server.
3. Fetch the five alias endpoints from the actual printed port.
4. Assert response envelopes and counts.
5. Stop the server.

### Task 5: WorkLog and review

Files:

```text
Modify: _DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md
```

Record:

- Files added/modified.
- Tests run.
- Alias endpoints introduced.
- Non-changes.
- Known risks.
- Whether browser/server smoke passed.

Run:

```bash
git diff --check
git status --short
```

## Human Decisions Needed Before Implementation

Before implementing, the Human Director should approve or adjust:

1. Alias path style:

```text
/api/director/conversations
/api/director/decisions
/api/director/execution-requests
/api/director/result-reviews
/api/director/records
```

2. Whether Phase 1 includes optional filters:

```text
status, source_type, q, limit
```

3. Whether aliases should be consumed by the current UI immediately after implementation, or exposed first while UI continues using `/api/summary.director_views`.

Recommendation:

```text
Expose read-only aliases first. Do not rewire UI immediately unless the alias tests and server smoke pass cleanly.
```

## Commit Recommendation

Do not commit automatically.

If this plan is committed by itself:

```text
docs: plan Studio Director API aliases
```

If committing the broader Studio Director refactor batch, keep `_Docs/Handoff/*` excluded unless the user explicitly decides to include those pre-existing changes.

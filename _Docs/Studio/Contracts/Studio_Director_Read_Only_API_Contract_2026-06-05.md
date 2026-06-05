# Studio Director Read-Only API Contract

## Date

2026-06-05

## Status

Current read-only contract for the first Director-facing Studio API surface.

This document describes implemented read-only aliases only. It does not approve mutation routes, schema migration, save/load changes, worker execution, or automatic approval.

## Purpose

The Director API gives Studio and future Director-facing clients a stable way to read the five Human Director functions without exposing the legacy AIWorkflow artifact graph as the primary contract.

The visible Director functions remain:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

## Non-Goals

This contract does not introduce:

- `POST`, `PUT`, `PATCH`, or `DELETE` Director routes.
- automatic approval or automatic execution.
- new persisted JSON schemas.
- save/load behavior changes.
- migration behavior.
- replacement of legacy artifact files.
- Handoff queue exposure as a Director-facing UI.

## Source Model

The read-only aliases are thin views over `/api/summary`:

```text
/api/summary
  -> director_views
```

The normalized source keys are:

```text
director_views.conversation_records
director_views.decision_items
director_views.execution_requests
director_views.result_review_items
director_views.record_items
```

The adapter layer must preserve source traceability through fields such as:

```text
source_type
source_id
path
href
```

The Director-facing surface may simplify labels and grouping, but it must not erase the ability to inspect the original source artifact when available.

## Endpoints

### `GET /api/director/conversations`

Director function:

```text
conversation
```

View key:

```text
conversation_records
```

Purpose:

Read normalized conversation/session records that can be shown as Studio conversation context.

### `GET /api/director/decisions`

Director function:

```text
decision
```

View key:

```text
decision_items
```

Purpose:

Read normalized decision candidates or recorded decisions that require Director judgment or later record keeping.

### `GET /api/director/execution-requests`

Director function:

```text
execution_request
```

View key:

```text
execution_requests
```

Purpose:

Read normalized bounded work requests that may be routed to an execution worker after human approval.

### `GET /api/director/result-reviews`

Director function:

```text
result_review
```

View key:

```text
result_review_items
```

Purpose:

Read normalized execution outputs, evidence items, or review packets that need Director acceptance, revision request, or archival.

### `GET /api/director/records`

Director function:

```text
record_keeping
```

View key:

```text
record_items
```

Purpose:

Read normalized durable records, DevLogs, memory-like records, or decisions that belong in Studio's record-keeping surface.

## Response Envelope

All Director read-only aliases return this envelope:

```json
{
  "ok": true,
  "director_api_version": "2026-06-04.readonly-v1",
  "function": "record_keeping",
  "view_key": "record_items",
  "source": "director_views",
  "generated_at": "2026-06-05T00:00:00.000Z",
  "count": 1,
  "items": []
}
```

Fields:

| Field | Meaning |
|---|---|
| `ok` | `true` for a successful read-only alias response. |
| `director_api_version` | Stable read-only API contract version. |
| `function` | Director function name for the endpoint. |
| `view_key` | `director_views` key used as the normalized source. |
| `source` | Always `director_views` for this contract. |
| `generated_at` | Summary generation timestamp. |
| `count` | Number of returned items after filters. |
| `items` | Filtered normalized Director view items. |

## Supported Query Filters

Filters are read-only and must not mutate source arrays.

### `status`

Filters by exact normalized `status` value.

Example:

```text
GET /api/director/records?status=recorded
```

### `source_type`

Filters by exact normalized `source_type` value.

Example:

```text
GET /api/director/records?source_type=devlog
```

### `q`

Case-insensitive text search across normalized item fields.

Example:

```text
GET /api/director/result-reviews?q=studio
```

### `limit`

Limits the response size. The current maximum is 100.

Example:

```text
GET /api/director/records?limit=2
```

If a larger value is requested, the implementation clamps it to the allowed maximum.

## Routing Contract

The route dispatcher must handle `/api/director/*` read-only aliases after `/api/summary` and before legacy/action route modules.

Required behavior:

```text
GET /api/summary
  -> returns full summary directly

GET /api/director/*
  -> returns read-only Director alias envelope

POST /api/director/*
  -> not handled by Director read-only alias layer
  -> remains unavailable unless a separately approved action model implements it
```

This order preserves existing legacy behavior while making Director-facing aliases stable for clients.

## UI Contract

The Studio UI should prefer `state.director_views` for the five primary Director pages.

The UI may keep safe fallback rendering while normalized arrays are empty, but new Director-facing UI should not depend on legacy artifact arrays as the primary contract.

Director view cards must preserve:

```text
source_id
source_type
href
```

when available.

The user-facing label should remain Director-friendly, but the source link should allow inspection of the original artifact.

## Validation Commands

Use these commands after changing this contract or its implementation:

```bash
node tools/aiworkflow/studio/studioDirectorApiAliases.test.js
node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js
node tools/aiworkflow/studio/studioDirectorViewModels.test.js
node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js
node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json
git diff --check
```

For live smoke, start the Studio server and fetch:

```text
/api/director/conversations
/api/director/decisions
/api/director/execution-requests
/api/director/result-reviews
/api/director/records
/api/director/records?source_type=devlog&limit=2
```

## Future Work

Future action routes require a separate Human Director approval boundary.

Potential future route families:

```text
/api/director/decisions/actions/*
/api/director/execution-requests/actions/*
/api/director/result-reviews/actions/*
/api/director/records/actions/*
```

Those must not be implemented under this read-only contract.

# Studio Goal C.3 Execution Request Readiness and Preflight Scope Packet

## Date

2026-06-05

## Status

Architecture and scope packet only.

This document does not approve implementation. It defines the first allowed mutation layer after Execution Request records are visible: readiness marking and dispatch preflight. It still does not approve worker dispatch.

## Goal

Allow the Human Director to mark an Execution Request as ready for worker preflight, then run deterministic preflight checks that decide whether the request is eligible for a future Goal E dispatch approval.

```text
Execution Request detail
  -> explicit Mark Ready action
  -> readiness state update
  -> preflight check
  -> ready_for_dispatch_candidate or preflight_failed
  -> no worker start
```

## Final-Form Architecture

Readiness and dispatch must remain separate:

```text
Execution Request content approval
  != readiness approval
  != dispatch approval
```

Responsibilities:

- Readiness action: records Human Director intent that the request is prepared for worker review.
- Preflight service: checks schema, safety flags, approval state, allowed worker metadata, and blocked paths.
- Dispatch service: future Goal E only; not part of C.3.

## Proposed State Meaning

Execution Request `status` may move among:

```text
draft
  -> director_review
  -> changes_requested
  -> ready_for_worker
  -> cancelled/superseded
```

C.3 may set:

```text
status: ready_for_worker
approval.approval_state: approved_for_worker_readiness
```

C.3 must not set:

```text
status: dispatched
status: result_ready
worker_dispatch_id
runner_run_id
```

## Proposed Action

Candidate route:

```text
POST /api/director/execution-requests/actions/mark-ready
```

Request body:

```json
{
  "execution_request_id": "ER-20260605-170000-example",
  "director_confirmation": true,
  "confirmation_summary": "Scope and validation plan reviewed.",
  "approved_worker_profile": "documentation",
  "approved_worker_executor": "none"
}
```

Response:

```json
{
  "ok": true,
  "execution_request_id": "ER-20260605-170000-example",
  "status": "ready_for_worker",
  "approval_state": "approved_for_worker_readiness",
  "preflight": {
    "ok": true,
    "errors": [],
    "warnings": []
  },
  "dispatch_approved": false
}
```

## Preflight Checks

Preflight must verify:

- record exists
- schema validation passes
- status is allowed for readiness
- risk level is supported
- `scope`, `non_goals`, `validation_plan`, and `return_format` are non-empty
- `allowed_files_or_areas` and `blocked_files_or_areas` are present
- `worker_intent.worker_executor` is allowlisted metadata only
- `worker_intent.dispatch_mode` is not `dispatch_now`
- no raw shell route or command string exists
- safety flags remain false for source/schema/save-load/build/git unless separately approved
- commit/push are not authorized

## Storage Mutation Rule

C.3 may update an existing Execution Request JSON file only to record readiness state and approval metadata.

It must not create or modify:

- worker dispatch records
- Backlog tasks
- ActiveTask state
- PC Runner plans/runs
- result review records
- git commits/pushes
- game source/data

## Tests Required

- mark-ready refuses missing id.
- mark-ready refuses invalid schema.
- mark-ready refuses already dispatched/result/closed records.
- mark-ready refuses raw shell worker intent.
- mark-ready refuses missing confirmation.
- mark-ready writes only the target Execution Request record.
- mark-ready does not create dispatch/runtime/backlog files.
- preflight returns structured errors/warnings.
- GET routes remain read-only.
- no worker process starts during tests.

## UI Requirements

The UI may show a disabled or enabled "Mark ready for worker" action only on the Execution Request detail page.

Before click, show:

- objective
- scope
- non-goals
- blocked areas
- validation plan
- worker profile/executor metadata
- warning: "This does not start a worker."

After success, show:

- readiness status
- preflight result
- next required approval: dispatch approval

## Non-Goals

C.3 must not implement:

- dispatch-worker
- PC Runner integration
- Codex/local execution
- result review generation
- automatic task done
- commit/push
- game source/data changes

## Fixed Implementation Recommendation

Based on the Human Director's established Studio direction, use this default unless explicitly superseded:

1. Allow readiness mutation only on the target Execution Request JSON record.
2. Use `status: ready_for_worker` and `approval.approval_state: approved_for_worker_readiness` for C.3 readiness.
3. Include both API and UI for mark-ready.
4. Show preflight failure summaries in normal UI.
5. Keep raw preflight details under internal/debug view.

## Recommended Approval Wording

```text
Approve Goal C.3.
Scope: mark-ready action and dispatch preflight for stored Execution Requests. It may update only the target Execution Request readiness/approval metadata. Include tests and UI/API as specified. Exclude worker dispatch, PC Runner, Codex/local execution, Backlog creation, result generation, commit/push, and game source/data changes.
```

# Studio Goal C.2 Execution Request Read-Only Surface Scope Packet

## Date

2026-06-05

## Status

Architecture and scope packet only.

This document does not approve implementation. It defines the next safe step after Goal C.1: expose stored Execution Request records to Studio as read-only Director-facing UI/API.

## Goal

Make `ExecutionRequest` records visible and reviewable in Studio without adding readiness mutation, worker dispatch, PC Runner integration, Backlog task creation, commit, or push.

```text
Execution Request store
  -> read-only API/view model
  -> Director-facing list/detail UI
  -> no mutation
  -> no worker execution
```

## Prerequisite

Goal C.1 has provided:

- `_Docs/AIWorkflow/Studio/ExecutionRequests/README.md`
- `execution_request.v1` validation
- `tools/aiworkflow/studio_execution_request_planner.js`
- `status`, `list`, `read`, `validate`, `store`
- `_Temp/AIWorkflowStudio/execution_requests/` validation override

## Final-Form Architecture

Studio should have a Director-facing Execution Request surface that reads from the durable store and presents contracts in human terms:

```text
ExecutionRequestStoreReader
  -> validates/summarizes records
  -> DirectorExecutionRequestViewModel
  -> Director Console Execution Request page
```

Responsibilities:

- Store reader: file/path discovery and JSON parsing only.
- Validator: `execution_request.v1` shape checks only.
- View model: Director-facing summary fields only.
- UI: list/detail, empty state, invalid-record warning.
- No state mutation.

## Reduced-Scope Implementation

Implement only:

1. Read-only service for default store `_Docs/AIWorkflow/Studio/ExecutionRequests/`.
2. Optional `_Temp` override for tests only, using the same C.1 boundary.
3. Director API alias candidates:
   - `GET /api/director/execution-requests`
   - `GET /api/director/execution-requests/:id`
4. Director UI page/list integration for Execution Request records.
5. Empty state copy when no records exist.
6. Invalid record warning that does not hide parse/validation issues.
7. Tests proving GET is read-only and no action endpoint exists.

## UI Requirements

The normal UI should show:

- title
- objective
- status
- risk level
- source type/ref
- scope summary
- non-goals summary
- validation plan summary
- approval state
- worker intent as metadata only
- safety boundary text

The normal UI should not show by default:

- raw runner JSON
- raw file paths as primary UX
- command ids as call-to-action
- internal task/session ids unless in debug detail
- any enabled dispatch or mark-ready button

## API Contract Candidate

List response:

```json
{
  "ok": true,
  "execution_requests": [
    {
      "execution_request_id": "ER-20260605-170000-example",
      "title": "Example",
      "status": "director_review",
      "risk_level": "medium",
      "source_type": "decision",
      "source_ref": "decision-id",
      "approval_state": "not_approved",
      "worker_profile": "documentation",
      "worker_executor": "none",
      "dispatch_mode": "not_dispatchable",
      "validation_ok": true
    }
  ]
}
```

Detail response:

```json
{
  "ok": true,
  "execution_request": { "...": "execution_request.v1 record" },
  "validation": { "ok": true, "errors": [] },
  "safety": {
    "read_only": true,
    "worker_dispatched": false,
    "git_changed": false
  }
}
```

## Tests Required

- List returns empty array when store does not exist.
- List summarizes valid records.
- Detail reads a valid record by id.
- Invalid id refuses path traversal.
- Invalid JSON/invalid schema is surfaced as a warning, not hidden.
- GET routes do not write files.
- No `POST /api/director/execution-requests/actions/*` is introduced in C.2.
- Existing Studio tests remain green.

## Non-Goals

C.2 must not implement:

- `mark-ready`
- readiness approval mutation
- worker dispatch
- PC Runner start
- Codex/local execution
- Backlog task creation
- result review generation
- commit/push
- game source/data edits

## Fixed Implementation Recommendation

Based on the Human Director's established Studio direction, use this default unless explicitly superseded:

1. Add read-only Execution Request API, view model, and UI.
2. Show list/detail on the existing Execution Request page.
3. Show a compact Home summary.
4. Show invalid records as normal UI warning summaries.
5. Keep raw invalid-record details under internal/debug view.

## Recommended Approval Wording

```text
Approve Goal C.2.
Scope: read-only Execution Request list/detail API and Director UI surface using the existing C.1 store and schema validation. Include empty/invalid states and tests. Exclude mark-ready, worker dispatch, PC Runner, Codex/local execution, Backlog creation, result generation, commit/push, and game source/data changes.
```

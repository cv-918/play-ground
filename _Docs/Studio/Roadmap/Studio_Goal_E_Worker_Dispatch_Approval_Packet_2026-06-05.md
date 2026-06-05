# Studio Goal E Worker Dispatch Approval Packet

## Date

2026-06-05

## Status

Final design packet for future Goal E approval.

This document does not approve implementation. It lists the required prerequisites, dispatch contract, implementation slices, and Human Director approvals needed before Studio may start a worker through the controlled runtime path.

## Goal

Connect a ready Execution Request to one safe, allowlisted worker dispatch path while preserving Director control and traceability.

```text
Execution Request ready_for_worker
  -> dispatch approval
  -> Worker Dispatch record
  -> allowlisted PC Runner / execution adapter path
  -> evidence collection
  -> Result Review
  -> Human Director decision
```

## Required Prerequisites

Goal E should not begin until these exist:

1. Goal C.1: Execution Request storage/schema/planner.
2. Goal C.2: read-only Execution Request Studio API/UI.
3. Goal C.3: mark-ready and dispatch preflight.
4. Goal D.1: Result Review storage/schema/read-only surface, or at minimum an approved fallback result-review record format.
5. A documented allowlist of worker profiles/executors/command ids.
6. A decision on dispatch mode:
   - Studio calls PC Runner directly, or
   - Studio writes a dispatch request for Hermes/runner to pick up.

## Final-Form Architecture

```text
Director Console
  -> presents ready Execution Request
  -> asks for dispatch approval

Dispatch Guard
  -> verifies readiness, preflight, allowlist, risk, approval, blocked paths

Worker Dispatch Store
  -> records dispatch attempt and runtime refs

Execution Adapter
  -> PC Runner / allowlisted adapter only

Evidence Collector
  -> records logs/metadata/artifact refs without judging acceptance

Result Review Builder
  -> produces Director-readable review
```

## Proposed Worker Dispatch Storage

Durable dispatch records:

```text
_Docs/AIWorkflow/Studio/WorkerDispatches/
```

Validation/smoke override:

```text
_Temp/AIWorkflowStudio/worker_dispatches/
```

Schema:

```text
worker_dispatch.v1
```

Id pattern:

```text
WD-YYYYMMDD-HHMMSS-short-slug.json
```

## Proposed Dispatch Fields

```text
worker_dispatch_id
schema_version
execution_request_id
dispatch_state
dispatch_mode
profile
executor
command_id_or_runner_route
preflight_result
approval
runner_plan_id
runner_run_id
evidence_refs
result_review_id
status_summary
created_at
updated_at
```

## Dispatch States

```text
draft
preflight_failed
ready_to_start
start_requested
starting
running
stopped_for_human_gate
result_ready
failed_to_start
failed_during_run
cancelled
closed
```

## Allowed First Dispatch Path

The first Goal E implementation should choose exactly one path.

Recommended safest first path:

```text
mode: dispatch_request_record_only
executor: none or pc_runner_dry_run
profile: documentation or validation
side effect: write Worker Dispatch request record only
```

Only after that is validated should Studio call a live runner.

Possible later path:

```text
mode: pc_runner_start
executor: pc_runner
profile: documentation or validation
command_id_or_runner_route: allowlisted only
```

## Blocked Inputs

Goal E must reject:

- raw shell commands
- user-provided command strings
- unapproved worker profiles
- unknown executors
- missing Execution Request
- invalid Execution Request schema
- not-ready status
- missing dispatch approval
- commit/push requests
- game source/data changes outside approved scope
- schema/save-load/build setting changes unless separately approved

## Candidate Routes

```text
POST /api/director/execution-requests/actions/dispatch-worker
GET  /api/director/execution-requests/:id/dispatch-status
GET  /api/director/worker-dispatches/:id
```

No GET route may mutate state.

## Dispatch Approval Request Body

```json
{
  "execution_request_id": "ER-20260605-170000-example",
  "director_confirmation": true,
  "approved_worker_profile": "documentation",
  "approved_worker_executor": "pc_runner",
  "approved_command_id_or_route": "studio.documentation.summarize",
  "approval_summary": "Dispatch approved for documentation-only smoke. No source edits, commits, or pushes."
}
```

## Tests Required

- dispatch refuses missing id
- dispatch refuses invalid schema
- dispatch refuses not-ready record
- dispatch refuses missing confirmation
- dispatch refuses missing preflight
- dispatch refuses raw shell command
- dispatch refuses unknown executor/profile/command id
- dispatch creates dispatch record only in request-record mode
- dispatch does not create Backlog tasks
- dispatch does not start runner unless the selected mode explicitly allows it
- dispatch never commits/pushes
- GET status/read routes do not mutate
- result-review linkage is present or explicitly pending

## Reduced-Scope Goal E.1 Recommendation

Implement the smallest safe Goal E slice first:

```text
Goal E.1: Worker Dispatch request-record foundation
```

Included:

- `WorkerDispatches/README.md`
- `worker_dispatch.v1` schema validation
- planner/service: `status`, `list`, `read`, `validate`, `store`
- dispatch guard that creates a dispatch request record from a ready Execution Request
- no live PC Runner start
- tests and WorkLog

Excluded:

- live worker process start
- Codex/local execution
- build/test execution
- Backlog task creation
- automatic Result Review generation
- commit/push

## Reduced-Scope Goal E.2 Recommendation

Only after E.1 is stable:

```text
Goal E.2: one live safe runner smoke
```

Included:

- one allowlisted profile
- one allowlisted command id/runner route
- one safe documentation or validation smoke
- no source mutation by default
- evidence refs linked to dispatch record
- Result Review stub or record generated

Excluded unless separately approved:

- implementation worker that edits source
- game data/schema changes
- build setting changes
- commit/push

## Fixed Implementation Recommendation

Based on the Human Director's established Studio direction, use this default unless explicitly superseded:

1. E.1 is dispatch request record only; do not start a live runner.
2. Use `_Docs/AIWorkflow/Studio/WorkerDispatches/` and `worker_dispatch.v1`.
3. First worker profile for E.2 should be documentation or validation.
4. First executor/route must be a single allowlisted safe route selected during E.2 approval.
5. Result Review linkage is required before any live run is treated as complete.
6. Studio writes dispatch requests for Hermes/runner pickup first; direct PC Runner calls are deferred.
7. Source-editing workers are not allowed in E.1/E.2.
8. Commit/push remain completely outside Studio dispatch.

## Remaining Explicit Approval Needed

Only one concrete value remains intentionally unset until E.2: the exact allowlisted executor and command id/runner route for the first live smoke.

## Recommended Approval Wording For E.1

```text
Approve Goal E.1 only.
Scope: Worker Dispatch request-record foundation. Add WorkerDispatch store/schema/validator/list/read/store and a dispatch guard that can create a dispatch request record from a ready Execution Request. Do not start PC Runner, Codex, local CLI, build/test commands, Backlog tasks, source edits, automatic Result Review acceptance, commit, or push.
```

## Recommended Approval Wording For E.2

```text
Approve Goal E.2 only after E.1 passes.
Scope: one live safe runner smoke using an approved profile, executor, and command id/route. No source edits, game data edits, Backlog creation, automatic completion, commit, or push. Evidence must be linked and Result Review must be generated or explicitly recorded as pending.
```

# Studio Goal E Worker Execution Integration Scope Packet

## Date

2026-06-05

## Status

Architecture and scope packet only.

This document does not approve implementation. It is the proposed approval packet for a future Goal E implementation.

## Goal

Define how Studio should connect Director-approved Execution Requests to bounded worker execution without turning Studio into a raw runner/session/command dashboard.

Goal E is not "add a Run button that executes arbitrary commands." Goal E is:

```text
Director-approved Execution Request
  -> bounded worker handoff
  -> allowlisted execution adapter
  -> evidence collection
  -> summarized Result Review
  -> explicit Director decision
```

## Final-Form Architecture

Studio should keep the responsibilities separated:

```text
Conversation
  -> collects intent and context

Decision
  -> records what direction the Human Director chose

Execution Request
  -> converts the decision into a bounded work contract

Worker Dispatch
  -> starts only an approved allowlisted execution path

Execution Adapter
  -> performs controlled work and records evidence

Result Review
  -> summarizes outputs, validation, risks, and next decisions

Record Keeping
  -> stores durable outcome and links to evidence
```

Studio is the Director console. Existing PC Runner / AIWorkflow runtime primitives remain the execution substrate.

## Reduced-Scope Goal E Proposal

The first Goal E implementation should be deliberately narrow:

```text
Approved Execution Request
  -> Studio dispatches or prepares one PC Runner start request
  -> PC Runner uses an allowlisted profile/executor
  -> Studio displays dispatch status and later result references
```

Recommended reduced-scope behavior:

1. Studio does not accept raw shell commands.
2. Studio does not run workers from conversation text alone.
3. Studio does not run workers from a decision alone.
4. Studio requires a stored Execution Request with approved scope.
5. Studio maps the request to a pre-approved runner profile and executor.
6. Studio starts or prepares a PC Runner operation using existing safe entrypoints.
7. Studio records a dispatch record and displays a Director-readable status.
8. Result Review remains separate and reads existing result/evidence artifacts.

## Proposed User Flow

```text
1. Human Director reviews a draft Execution Request.
2. Studio shows objective, scope, non-goals, validation plan, risk, and expected return format.
3. Human Director clicks Mark Ready For Worker.
4. Studio asks for a final confirmation of scope and worker profile.
5. Studio creates a worker dispatch record.
6. Studio calls the approved worker entrypoint or produces a ready-to-run handoff, depending on implementation mode.
7. Worker runs inside PC Runner / allowlisted adapter boundaries.
8. Studio shows compact status: queued/running/stopped/result-ready.
9. Studio shows Result Review when evidence and completion artifacts exist.
10. Human Director accepts, requests changes, rejects, defers, or records the outcome.
```

## Proposed API Family

Future candidate endpoints:

```text
POST /api/director/execution-requests/actions/mark-ready
POST /api/director/execution-requests/actions/dispatch-worker
GET  /api/director/execution-requests/:id/dispatch-status
GET  /api/director/result-reviews/:id
```

These are candidates only. Exact route names and schema require approval before implementation.

## Execution Request Required Fields

A worker-triggering Execution Request must include at least:

```text
execution_request_id
schema_version
title
objective
scope
non_goals
allowed_files_or_areas
blocked_files_or_areas
validation_plan
return_format
risk_level
approval_state
approved_by
approved_at
source_decision_id
source_conversation_id
worker_profile
worker_executor
worker_command_id_or_route
created_at
updated_at
```

Field meanings:

- `objective`: what worker success means.
- `scope`: what the worker may change or produce.
- `non_goals`: what the worker must not do.
- `allowed_files_or_areas`: positive boundary for file/system changes.
- `blocked_files_or_areas`: explicit forbidden paths/systems.
- `validation_plan`: commands or manual checks expected after work.
- `return_format`: required worker result format.
- `risk_level`: affects approval and worker profile selection.
- `approval_state`: draft, ready_for_worker, dispatched, running, result_ready, closed, cancelled.
- `worker_profile`: e.g. analysis, implementation, validation, documentation, build.
- `worker_executor`: e.g. codex_cli, local_cli, build_test_runner.
- `worker_command_id_or_route`: allowlisted route only; never raw shell.

## Approval Boundary

The Human Director must explicitly approve:

1. the Execution Request content
2. the worker profile/executor
3. the dispatch action

A previous decision approval is not enough by itself unless it explicitly created and approved the Execution Request.

Renewed approval is required if the worker needs to:

- expand scope
- touch files or systems outside approved boundaries
- change schema, save/load, migration, or build settings
- introduce new external dependencies
- use a non-allowlisted command or adapter
- commit, push, release, deploy, or mark task done

## Worker Dispatch Contract

Dispatch should create a small record before or during worker start:

```text
worker_dispatch_id
execution_request_id
task_id_or_runtime_id
profile
executor
command_id_or_runner_route
dispatch_state
preflight_result
runner_plan_id
runner_run_id
status_summary
result_review_id
created_at
updated_at
```

Dispatch states:

```text
draft
preflight_failed
ready_to_start
starting
running
stopped_for_human_gate
result_ready
cancelled
failed_to_start
```

The dispatch record is not a completion record. It is a traceability link between Studio and the runtime worker layer.

## Allowed Execution Paths

Allowed first candidates:

```text
pc_runner plan/start/continue/read
codex_cli execution adapter through PC Runner
local_cli allowlisted validation commands
build_test_runner allowlisted command_id entries
```

Blocked:

```text
raw command strings from UI
arbitrary user-provided shell execution
hidden GET-triggered mutation
direct Git commit/push
automatic task done
automatic approval
untracked local config writes outside _Local/
runtime artifacts outside _Temp/
```

## UI Requirements

The normal Studio UI should show Director-facing language:

- "Ready for worker"
- "Worker profile"
- "Approved scope"
- "Expected validation"
- "Result ready for review"
- "Request changes"

It should hide by default:

- raw session IDs
- raw runner JSON
- handoff queues
- low-level command logs
- adapter internals

Internal details may be linked under debug/internal panels only.

## Result Review Handoff

A dispatched worker must eventually produce or link to:

```text
execution summary
changed files summary
validation commands run
validation result observations
remaining risks
human decisions needed
record/development log links
commit recommendation only if appropriate
```

Result Review must not hide failed validation or convert evidence into acceptance automatically.

## Validation Requirements For Implementation

Any Goal E implementation must include:

```text
RED/GREEN tests for mark-ready and dispatch guards
GET routes do not mutate
missing approval refuses dispatch
unknown executor refuses dispatch
raw command input refuses dispatch
approved allowlisted dispatch creates only dispatch/runtime records
node --check for edited JavaScript modules
server smoke test if UI/API behavior changes
git diff --check
forbidden path check for _Temp, _Local, node_modules, .env, and local config tracking
WorkLog update
```

If a live worker smoke is included, it should use a safe validation or documentation profile first, not game source mutation.

## Non-Goals

Goal E must not implement:

- arbitrary command execution
- automatic approval
- automatic task done
- automatic commit/push
- generic terminal UI
- raw runner/session dashboard as the main product surface
- schema migration without separate approval
- game source/data changes as part of Studio infrastructure work

## Recommended Implementation Sequence After Approval

1. Define Execution Request storage and schema.
2. Add read-only display for Execution Request records.
3. Add `mark-ready` guard tests and handler.
4. Add worker dispatch record schema.
5. Add dispatch preflight that refuses unsafe states.
6. Add dispatch UI copy and confirmation.
7. Wire a single safe PC Runner profile path.
8. Add result-review status linking.
9. Run full Studio tests and one safe smoke.
10. Update WorkLog and request Human Director review.

## Human Approval Questions

Before implementation, the Human Director should decide:

1. Should Studio directly call PC Runner, or should Studio only create a dispatch request for Hermes/runner to pick up?
2. Where should Execution Request and Worker Dispatch records be stored?
3. Should first smoke use `validation`, `documentation`, or `analysis` profile?
4. Should implementation include UI only, API only, or both?
5. Should commit/push routes remain in Studio at all, or move fully to an internal/debug area?

## Recommendation

Approve Goal E implementation only after Goal C Execution Request storage is defined.

For immediate next work, implement neither worker execution nor mutation routes. Instead, use this packet as the approval boundary and proceed to C: Director UX Flow Review.

# Studio Goal C Execution Request Foundation Scope Packet

## Date

2026-06-05

## Status

Architecture and scope packet. Goal C.1 reduced-scope implementation was approved and implemented after this packet: storage README, `execution_request.v1` validation, planner status/list/read/validate/store, `_Temp` validation override, tests, README, and WorkLog updates.

This document does not approve worker dispatch. It defines the storage, schema, state model, and approval boundary for first-class Studio Execution Request records.

## Goal

Define a durable Execution Request foundation so Studio can turn an approved Director decision into a bounded execution contract before any worker dispatch is allowed.

Goal C is not worker execution. Goal C is the prerequisite data and governance layer for future Goal E worker execution.

```text
Conversation
  -> Decision
  -> Execution Request record
  -> readiness approval
  -> future worker dispatch
  -> Result Review
  -> Record Keeping
```

## Why This Comes Before Goal E

Goal E worker execution requires a stored, reviewable, approved Execution Request.

Without Goal C, Studio would have to infer execution scope from conversation text, decision records, WorkOrder drafts, or UI button state. That would blur responsibilities and could turn Studio into a runner dashboard or raw command surface.

Goal C provides the missing foundation:

- where Execution Requests live
- what fields they must contain
- which states are allowed
- when an Execution Request is only a draft
- when it is ready for worker preflight
- what must still be separately approved later

## Final-Form Architecture

Studio should treat Execution Request as its own Director-facing record type.

```text
Decision
  - records what the Human Director chose
  - does not by itself approve worker execution

Execution Request
  - records a bounded work contract
  - contains objective, scope, non-goals, validation, risks, and worker intent
  - can be reviewed, revised, marked ready, cancelled, superseded, or closed

Worker Dispatch
  - future separate record
  - starts only after an Execution Request is ready and dispatch is explicitly approved

Result Review
  - summarizes worker output and evidence
  - does not auto-complete the task
```

Responsibility separation:

```text
Decision = direction chosen
Execution Request = work contract prepared
Worker Dispatch = controlled runtime action
Evidence = raw/runtime proof
Result Review = Director-readable outcome
Record Keeping = durable decision/result memory
```

## Reduced-Scope Goal C Proposal

The first implementation should be documentation + data foundation + read/write-safe Studio behavior only.

Recommended reduced scope:

1. Define Execution Request storage path.
2. Define `execution_request.v1` schema.
3. Define allowed state transitions.
4. Add deterministic validation for the schema.
5. Add create/store/read/list behavior for Execution Requests.
6. Add read-only Director view consumption if needed.
7. Add UI copy for draft/review/ready states only.
8. Do not dispatch workers.
9. Do not create AIWorkflow Backlog tasks automatically.
10. Do not mark tasks complete.
11. Do not commit or push.

## Proposed Storage Path

Preferred durable store:

```text
_Docs/AIWorkflow/Studio/ExecutionRequests/
```

Rationale:

- It matches existing internal Studio stores such as WorkOrders and TaskBindings.
- It keeps runtime/automation records under the AIWorkflow runtime document tree.
- It avoids placing operational records directly in `_Docs/Studio/`, which is the product-direction source of truth.
- It can be surfaced through Director-friendly Studio views without making `_Docs/AIWorkflow/Studio/` the product-direction source.

Recommended supporting README:

```text
_Docs/AIWorkflow/Studio/ExecutionRequests/README.md
```

Validation/smoke override path:

```text
_Temp/AIWorkflowStudio/execution_requests/
```

Rules:

- Production Execution Request records go under `_Docs/AIWorkflow/Studio/ExecutionRequests/`.
- Test/smoke records may be written only under `_Temp/AIWorkflowStudio/execution_requests/`.
- `_Temp` records must not be tracked.
- Execution Request files should use UTF-8 JSON.
- File names should match the record id.

## Proposed File Naming

```text
ER-YYYYMMDD-HHMMSS-short-slug.json
```

Examples:

```text
ER-20260605-160000-studio-execution-request-foundation.json
ER-20260605-161230-fix-userdata-loader-scope.json
```

Rules:

- Prefix: `ER-`
- Timestamp: local timestamp at creation time
- Slug: lowercase alphanumeric and hyphen only
- Max slug length should be bounded for reviewable file names
- Duplicate ids must be rejected

## Proposed Schema: execution_request.v1

Required top-level fields:

```text
execution_request_id
schema_version
source_type
source_ref
title
objective
status
risk_level
scope
non_goals
allowed_files_or_areas
blocked_files_or_areas
constraints
required_context
expected_outputs
validation_plan
review_criteria
return_format
approval
worker_intent
safety
evidence_requirements
result_review
record_refs
created_at
updated_at
```

### Field Meanings

`execution_request_id`

- Stable id matching the file name without `.json`.
- Format: `ER-YYYYMMDD-HHMMSS-slug`.

`schema_version`

- Must be `execution_request.v1` for the first implementation.

`source_type`

Allowed values:

```text
conversation
decision
proposal
work_order
completion_review
manual
```

Meaning:

- Shows where this request came from.
- Does not grant approval by itself.

`source_ref`

- Id or path of the source record.
- Required for traceability.

`title`

- Short Director-readable title.

`objective`

- What success means.
- Required.

`status`

Allowed values:

```text
draft
director_review
changes_requested
ready_for_worker
superseded
cancelled
dispatched
result_ready
closed
```

Initial safe statuses:

- `draft`
- `director_review`

Goal C should not need to produce `dispatched`, `result_ready`, or `closed` except as accepted enum values for future compatibility.

`risk_level`

Allowed values:

```text
low
medium
high
blocked
```

Recommended interpretation:

- `low`: documentation, review, read-only analysis.
- `medium`: bounded source/data changes within approved scope.
- `high`: runtime behavior, schema, save/load, build settings, broad refactor, external tools.
- `blocked`: cannot proceed without renewed Director decision.

`scope`

- Array of allowed work statements.
- Required and non-empty before `ready_for_worker`.

`non_goals`

- Array of explicit exclusions.
- Required and non-empty before `ready_for_worker`.

`allowed_files_or_areas`

- Array of allowed file paths, directories, systems, or document areas.
- Empty means no file/system writes are approved.

`blocked_files_or_areas`

- Array of forbidden paths/systems.
- Should include local/security boundaries where relevant.

`constraints`

- Array of governing constraints from `AGENTS.md`, Studio docs, project constraints, or task-specific limits.

`required_context`

- Array of documents/files the worker must read before execution.

`expected_outputs`

- Array of outputs the worker must return.

`validation_plan`

- Array of commands or manual validation checks.
- Must state if validation is expected to be deferred.

`review_criteria`

- Array of criteria for diff/result review.

`return_format`

- Required worker result format.
- Should remain Director-reviewable.

`approval`

Object:

```json
{
  "approval_state": "not_approved",
  "approved_by": "",
  "approved_at": "",
  "approval_summary": "",
  "renewed_approval_triggers": []
}
```

Allowed `approval_state` values:

```text
not_approved
approved_for_draft_storage
approved_for_worker_readiness
revoked
```

Important boundary:

- `approved_for_worker_readiness` is not the same as dispatch approval.
- Dispatch still requires a future Goal E explicit action.

`worker_intent`

Object:

```json
{
  "worker_profile": "",
  "worker_executor": "",
  "worker_command_id_or_route": "",
  "dispatch_mode": "not_dispatchable"
}
```

Allowed initial `dispatch_mode` values:

```text
not_dispatchable
future_dispatch_required
```

Goal C should not start workers.

`worker_profile` candidate values:

```text
analysis
documentation
validation
implementation
build
```

`worker_executor` candidate values:

```text
none
codex_cli
local_cli
build_test_runner
pc_runner
```

Goal C should allow `none` and proposed future values, but it should not execute them.

`safety`

Object:

```json
{
  "source_write_authorized": false,
  "schema_change_authorized": false,
  "save_load_change_authorized": false,
  "build_setting_change_authorized": false,
  "external_tool_authorized": false,
  "commit_authorized": false,
  "push_authorized": false,
  "worker_dispatch_authorized": false
}
```

Default must be all false.

`evidence_requirements`

- Array of evidence expected after execution.
- Does not mean evidence already exists.

`result_review`

Object:

```json
{
  "result_review_id": "",
  "status": "not_started",
  "summary": ""
}
```

Allowed `result_review.status` values:

```text
not_started
waiting_for_worker
ready_for_review
accepted
changes_requested
rejected
deferred
```

Goal C should normally keep this as `not_started`.

`record_refs`

- Array of related records, paths, decisions, WorkOrders, or DevLogs.

`created_at`, `updated_at`

- ISO-like local timestamp or stable project timestamp format.
- Must be explicit.

## Minimal Example

```json
{
  "execution_request_id": "ER-20260605-160000-studio-execution-request-foundation",
  "schema_version": "execution_request.v1",
  "source_type": "decision",
  "source_ref": "decision-studio-goal-c",
  "title": "Define Studio Execution Request foundation",
  "objective": "Define and validate first-class Execution Request records before worker dispatch is implemented.",
  "status": "director_review",
  "risk_level": "medium",
  "scope": [
    "Define Execution Request storage and schema.",
    "Add validation and read/list/store behavior after approval."
  ],
  "non_goals": [
    "Do not dispatch workers.",
    "Do not create Backlog tasks automatically.",
    "Do not commit or push from Studio."
  ],
  "allowed_files_or_areas": [
    "_Docs/AIWorkflow/Studio/ExecutionRequests/",
    "tools/aiworkflow/studio_execution_request_planner.*",
    "tools/aiworkflow/studio/*ExecutionRequest*.test.js"
  ],
  "blocked_files_or_areas": [
    "PlayGround/ game source and data unless separately approved",
    "_Local/ tracked files",
    ".env",
    "node_modules/",
    "_Temp/ tracked files"
  ],
  "constraints": [
    "Execution Request storage is not worker dispatch approval.",
    "No raw command execution.",
    "No automatic task done, commit, or push."
  ],
  "required_context": [
    "AGENTS.md",
    "_Docs/Studio/Personal_AI_Game_Development_Operating_Rules.md",
    "_Docs/Studio/Studio_Goal_E_Worker_Execution_Integration_Scope_2026-06-05.md"
  ],
  "expected_outputs": [
    "Execution Request record stored or previewed.",
    "Validation result showing schema compliance."
  ],
  "validation_plan": [
    "Schema validation rejects missing required fields.",
    "Dry-run does not write records.",
    "Store writes only under approved store path or _Temp override."
  ],
  "review_criteria": [
    "No worker dispatch is possible from Goal C behavior.",
    "No raw shell command field is accepted as executable authority."
  ],
  "return_format": [
    "Implementation summary",
    "Files changed",
    "Validation commands run",
    "Validation results",
    "Known risks",
    "Human decisions needed"
  ],
  "approval": {
    "approval_state": "not_approved",
    "approved_by": "",
    "approved_at": "",
    "approval_summary": "",
    "renewed_approval_triggers": [
      "Need to dispatch a worker.",
      "Need to create Backlog tasks automatically.",
      "Need schema/save-load/build setting changes.",
      "Need commit or push."
    ]
  },
  "worker_intent": {
    "worker_profile": "documentation",
    "worker_executor": "none",
    "worker_command_id_or_route": "",
    "dispatch_mode": "not_dispatchable"
  },
  "safety": {
    "source_write_authorized": false,
    "schema_change_authorized": false,
    "save_load_change_authorized": false,
    "build_setting_change_authorized": false,
    "external_tool_authorized": false,
    "commit_authorized": false,
    "push_authorized": false,
    "worker_dispatch_authorized": false
  },
  "evidence_requirements": [],
  "result_review": {
    "result_review_id": "",
    "status": "not_started",
    "summary": ""
  },
  "record_refs": [],
  "created_at": "2026-06-05T16:00:00",
  "updated_at": "2026-06-05T16:00:00"
}
```

## State Transition Rules

Allowed first implementation transitions:

```text
draft -> director_review
director_review -> changes_requested
director_review -> ready_for_worker
director_review -> cancelled
changes_requested -> director_review
ready_for_worker -> cancelled
ready_for_worker -> superseded
```

Future Goal E transitions:

```text
ready_for_worker -> dispatched
dispatched -> result_ready
result_ready -> closed
result_ready -> changes_requested
```

Blocked transitions in Goal C:

```text
draft -> dispatched
director_review -> dispatched
changes_requested -> dispatched
cancelled -> ready_for_worker
superseded -> ready_for_worker
closed -> ready_for_worker
```

## Proposed Planner / Tool Surface

A future implementation may mirror the existing WorkOrder planner pattern:

```bat
tools\aiworkflow\studio_execution_request_planner.bat status
tools\aiworkflow\studio_execution_request_planner.bat list
tools\aiworkflow\studio_execution_request_planner.bat read <execution_request_id>
tools\aiworkflow\studio_execution_request_planner.bat validate <execution_request_json_path>
tools\aiworkflow\studio_execution_request_planner.bat store <execution_request_json_path> --execute
tools\aiworkflow\studio_execution_request_planner.bat mark-ready <execution_request_id> --execute
```

Reduced-scope implementation recommendation:

- Implement `status`, `list`, `read`, `validate`, and `store` first.
- Implement `mark-ready` only after validation and UI copy are approved.
- Do not implement `dispatch` in Goal C.

## Proposed API Surface

Future candidate endpoints:

```text
GET  /api/director/execution-requests
GET  /api/director/execution-requests/:id
POST /api/director/execution-requests/store
POST /api/director/execution-requests/actions/mark-ready
```

Rules:

- GET routes must be read-only.
- POST routes must return safety metadata.
- `store` writes only an Execution Request record.
- `mark-ready` changes only Execution Request state after guard validation.
- No endpoint in Goal C starts a worker.

## UI Requirements

Director-facing copy should use Korean-friendly labels:

```text
실행 요청 초안
검토 필요
수정 요청됨
작업 준비됨
취소됨
대체됨
```

The normal UI should show:

- title
- objective
- status
- risk
- scope
- non-goals
- allowed areas
- blocked areas
- expected validation
- worker intent as proposed metadata only
- next Director decision

The normal UI should not show by default:

- raw JSON
- runner internals
- shell command fields
- session IDs
- internal queue IDs

## Validation Requirements For Implementation

Any Goal C implementation should include tests for:

```text
valid Execution Request passes schema validation
missing required fields fail validation
invalid id format fails validation
invalid status fails validation
invalid approval_state fails validation
store dry-run writes nothing
store --execute writes only approved store path
store override is allowed only under _Temp
duplicate id is rejected
GET/list/read routes do not mutate
mark-ready refuses incomplete scope/non-goals/validation
mark-ready does not dispatch worker
```

Required validation commands after implementation:

```text
node --check edited JavaScript files
PowerShell planner syntax check if a PS1 planner is edited
planner validate/store smoke under _Temp
Studio route tests for read-only/mutation boundaries
git diff --check
security scan for secrets and dangerous execution patterns
WorkLog update
```

## Non-Goals

Goal C must not implement:

- worker dispatch
- PC Runner start
- Codex CLI start
- local shell command execution
- build/test command execution
- automatic Backlog task creation
- automatic approval
- automatic completion
- automatic commit/push
- game source/data changes
- schema migration for existing WorkOrder records
- replacement of WorkOrder or TaskBinding systems

## Relationship To Existing WorkOrder System

Execution Request should not immediately replace WorkOrder.

Recommended relationship:

```text
Execution Request = Director-facing execution contract
WorkOrder = existing internal Studio/AIWorkflow work planning record
TaskBinding = bridge from WorkOrder/TaskDraft to AIWorkflow Backlog task
```

In the reduced scope, Execution Request may reference a WorkOrder or be generated from a WorkOrder, but it should remain a distinct record type with its own approval state.

Later consolidation can decide whether WorkOrder becomes an internal representation behind Execution Request. That consolidation is not part of Goal C.

## Human Approval Questions

Before implementation, the Human Director should approve or revise:

1. Storage path: should durable records live at `_Docs/AIWorkflow/Studio/ExecutionRequests/`?
2. Schema name: should the first schema be `execution_request.v1`?
3. Status model: are the proposed statuses acceptable?
4. Approval model: is `approved_for_worker_readiness` enough for pre-dispatch readiness, while dispatch remains separate?
5. Relationship to WorkOrder: should Execution Request be a distinct record first, rather than replacing WorkOrder now?
6. Implementation slice: should the first implementation include only planner/status/list/read/validate/store, or also `mark-ready`?
7. UI scope: should Goal C include Director UI display, or only data/API foundation first?

## Recommended Approval Decision

Approve the first reduced-scope implementation as:

```text
Goal C.1: Execution Request storage/schema/planner foundation
```

Approved behavior would include:

- create `_Docs/AIWorkflow/Studio/ExecutionRequests/README.md`
- create `studio_execution_request_planner` tool
- validate and store `execution_request.v1` records
- list/read stored Execution Requests
- allow `_Temp` store override for tests
- add tests and WorkLog

Not approved yet:

- `mark-ready` UI/API if the user wants stricter staging
- worker dispatch
- PC Runner start
- Codex/local worker execution
- Backlog task creation
- commit/push automation

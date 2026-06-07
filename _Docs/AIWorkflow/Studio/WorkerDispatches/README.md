# Studio Worker Dispatches

This folder is the durable store for Studio `WorkerDispatch` request records.

A Worker Dispatch record is a Director-approved request for a future runner or
Hermes pickup path. In Goal E.1 it is request-record only.
In Goal E.2 a single allowlisted safe smoke runner may transition an eligible
validation request record into a linked result-ready smoke record.

## Boundary

Storing or reading a Worker Dispatch must not:

- start PC Runner
- start Codex CLI or local execution from Studio
- start a worker process
- run build/test commands as a dispatched worker
- create Backlog tasks automatically
- change ActiveTask state
- generate a Result Review automatically
- accept or reject a Result Review automatically
- close an Execution Request automatically
- modify game source or game data
- change save/load behavior or build settings
- commit or push

## Schema

Current schema:

```text
worker_dispatch.v1
```

Record id and file name:

```text
WD-YYYYMMDD-HHMMSS-short-slug.json
```

Example:

```text
WD-20260606-130000-worker-dispatch-foundation.json
```

## Required Fields

A valid v1 record includes:

- identity: `worker_dispatch_id`, `schema_version`, `created_at`, `updated_at`
- traceability: `execution_request_id`, `runner_plan_id`, `runner_run_id`, `evidence_refs`, `result_review_id`
- dispatch contract: `dispatch_state`, `dispatch_mode`, `profile`, `executor`, `command_id_or_runner_route`
- guard evidence: `preflight_result`, `approval`
- Director summary: `status_summary`

For Goal E.1, `dispatch_mode` is:

```text
dispatch_request_record_only
```

The E.1 allowlist is intentionally small:

```text
profiles: documentation, validation
executors: none
command_id_or_runner_route: studio.documentation.review, studio.validation.report
```

`result_review_id` must be either a real Result Review id or explicitly
`pending`. E.1 creates records with `result_review_id: "pending"` because it
does not generate Result Reviews automatically.

## Allowed Dispatch States

The final-form worker dispatch state model includes live lifecycle states for later
Goal E slices, but Goal E.1 request-record validation intentionally accepts only:

```text
ready_to_start
```

for `dispatch_mode: dispatch_request_record_only`.

Later live-run slices may re-enable additional states only after executor/runner
linkage is approved and implemented.

E.1 creates request records with:

```text
dispatch_state: ready_to_start
dispatch_mode: dispatch_request_record_only
executor: none
```

This means the request is recorded and ready for a future approved pickup path.
It does not mean a runner has started.

## E.2 Safe Smoke Mode

Goal E.2 adds only this live smoke route:

```text
profile: validation
executor: hermes_safe_smoke
command_id_or_runner_route: studio.validation.report
```

The smoke transition uses:

```text
dispatch_mode: safe_smoke_run
dispatch_state: result_ready
```

`dispatch_request_record_only` still accepts only `ready_to_start` and empty
runner refs. The E.2 safe smoke runner may update a valid pending validation
request record with deterministic safe-smoke runner ids, an evidence ref under
`_Docs/AIWorkflow/Studio/WorkerDispatchEvidence/`, and a linked Result Review.

The E.2 safe smoke route must not start PC Runner, Codex/local execution,
build/test dispatch, source or game data changes, Backlog/ActiveTask mutation,
automatic Result Review accept/reject, Execution Request close/done, commit,
or push.

## H Bounded Implementation Pickup Contract

Goal H adds a controlled implementation-worker contract as data only:

```text
profile: implementation
executor: hermes_bounded_codex
command_id_or_runner_route: studio.implementation.bounded_codex_cli
dispatch_mode: implementation_pickup_contract
dispatch_state: start_requested
```

This contract is for Hermes/runner pickup by a bounded Codex CLI worker. Studio
does not start the worker and does not expose raw shell execution.

The `pickup_contract` must include:

- `worker_kind: bounded_codex_cli`
- approved `allowed_files_or_areas`
- approved `blocked_files_or_areas`
- `raw_shell_allowed: false`
- `pc_runner_direct_call_allowed: false`
- `commit_push_allowed: false`
- `result_review_required: true`

Future worker edits are allowed only inside the approved Execution Request scope.

The H pickup contract must not:

- start PC Runner
- start Codex/local execution from Studio
- run build/test dispatch directly from Studio
- mutate source or game data by itself
- auto-create Backlog/ActiveTask entries
- auto-accept, auto-close, or mark done
- commit or push

## Local Tool

```bat
tools\aiworkflow\studio_worker_dispatch_planner.bat status
tools\aiworkflow\studio_worker_dispatch_planner.bat list
tools\aiworkflow\studio_worker_dispatch_planner.bat read <worker_dispatch_id>
tools\aiworkflow\studio_worker_dispatch_planner.bat validate <worker_dispatch_json_path>
tools\aiworkflow\studio_worker_dispatch_planner.bat store <worker_dispatch_json_path>
tools\aiworkflow\studio_worker_dispatch_planner.bat store <worker_dispatch_json_path> --execute
tools\aiworkflow\studio_safe_smoke_runner.bat status
tools\aiworkflow\studio_safe_smoke_runner.bat read <worker_dispatch_id>
tools\aiworkflow\studio_safe_smoke_runner.bat preflight <worker_dispatch_id>
tools\aiworkflow\studio_safe_smoke_runner.bat run <worker_dispatch_id>
tools\aiworkflow\studio_safe_smoke_runner.bat run <worker_dispatch_id> --execute
```

Use `--json` for machine-readable output.

Store is dry-run unless `--execute` is provided.

For validation smoke tests, use `--store-path` under:

```text
_Temp/AIWorkflowStudio/worker_dispatches/
```

Store overrides outside `_Temp/AIWorkflowStudio/worker_dispatches/` are
rejected.

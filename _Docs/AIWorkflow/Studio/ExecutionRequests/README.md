# Studio Execution Requests

This folder is the durable store for Studio `ExecutionRequest` records.

An Execution Request is a Director-facing execution contract. It converts an approved direction into bounded work scope before any worker dispatch is allowed.

## Boundary

An Execution Request is not worker execution.

Storing an Execution Request must not:

- start PC Runner
- start Codex CLI
- run local shell commands
- run build/test commands
- create AIWorkflow Backlog tasks automatically
- approve implementation automatically
- mark tasks complete
- commit or push
- change game source or game data by itself

Worker dispatch remains a separate future Goal E action and requires explicit Human Director approval.

## Schema

Current schema:

```text
execution_request.v1
```

Record id and file name:

```text
ER-YYYYMMDD-HHMMSS-short-slug.json
```

Example:

```text
ER-20260605-160000-studio-execution-request-foundation.json
```

## Required field groups

A valid v1 record includes:

- identity: `execution_request_id`, `schema_version`, `created_at`, `updated_at`
- traceability: `source_type`, `source_ref`, `record_refs`
- Director contract: `title`, `objective`, `scope`, `non_goals`, `expected_outputs`
- boundaries: `allowed_files_or_areas`, `blocked_files_or_areas`, `constraints`, `required_context`
- verification/review: `validation_plan`, `review_criteria`, `return_format`, `evidence_requirements`
- governance: `status`, `risk_level`, `approval`
- future execution metadata: `worker_intent`, `safety`, `result_review`

## Allowed statuses

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

Goal C.1 only provides the storage/schema/planner foundation. It does not implement worker dispatch.

## Approval boundary

`approval.approval_state` can describe whether the request is ready for worker-readiness review, but it does not approve dispatch.

Keep these decisions separate:

1. decision approval
2. Execution Request content approval
3. worker readiness approval
4. dispatch approval
5. result acceptance
6. commit/push approval

## Local tool

```bat
tools\aiworkflow\studio_execution_request_planner.bat status
tools\aiworkflow\studio_execution_request_planner.bat list
tools\aiworkflow\studio_execution_request_planner.bat read <execution_request_id>
tools\aiworkflow\studio_execution_request_planner.bat validate <execution_request_json_path>
tools\aiworkflow\studio_execution_request_planner.bat store <execution_request_json_path>
tools\aiworkflow\studio_execution_request_planner.bat store <execution_request_json_path> --execute
```

Use `--json` for machine-readable output.

For validation smoke tests, use `--store-path` under:

```text
_Temp/AIWorkflowStudio/execution_requests/
```

Store overrides outside `_Temp` are rejected.

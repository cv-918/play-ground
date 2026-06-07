# Studio Result Reviews

This folder is the durable store for Studio `ResultReview` records.

A Result Review is a Director-facing result summary. It turns worker report and evidence metadata into a readable review packet before the Human Director decides whether to accept, request changes, reject, defer, or keep reviewing.

## Boundary

A Result Review is not a Director decision by itself.

Storing or reading a Result Review must not:

- accept or reject work automatically
- request changes automatically
- mark tasks done or closed automatically
- close an Execution Request automatically
- start worker dispatch
- start PC Runner
- start Codex CLI or local execution from Studio
- run build/test commands
- commit or push
- change game source or game data by itself

`commit_recommendation` is advisory only. It does not authorize commit.

## Schema

Current schema:

```text
result_review.v1
```

Record id and file name:

```text
RR-YYYYMMDD-HHMMSS-short-slug.json
```

Example:

```text
RR-20260606-120000-studio-result-review-foundation.json
```

## Required Fields

A valid v1 record includes:

- identity: `result_review_id`, `schema_version`, `created_at`, `updated_at`
- traceability: `execution_request_id`, `worker_dispatch_id`, `source_evidence_refs`, `record_refs`
- Director summary: `summary`, `changed_files_summary`, `validation_commands`, `validation_results`, `risks`, `human_decisions_needed`
- next-step guidance: `recommended_next_action`, `commit_recommendation`
- state: `status`

The `summary` object must include:

- `implementation_summary`
- `behavior_or_model_summary`

Validation commands/results may be empty only when validation was not run or no validation evidence was recorded. The Director UI must show that explicitly.

## Allowed Statuses

```text
draft
ready_for_director_review
accepted
changes_requested
rejected
deferred
superseded
closed
```

Goal F adds explicit Director decision actions:

```text
accept
request_changes
reject
defer
supersede
close
```

These actions may update only the Result Review `status`, `decision`, `decision_history`, and `updated_at` fields.

They must not:

- commit or push
- rollback
- retry or start workers
- close Execution Requests
- mark tasks done
- mutate game source/data

Goal I adds a derived Evidence Collector metadata view and separate Verification Gate view. Evidence collection gathers metadata only. Verification Gate may judge `passed`, `failed`, `blocked`, or `deferred`, but it must not accept, close, commit, push, or start retries.

Goal J adds an advisory Completion Card view model derived from the Result Review, evidence metadata, and Verification Gate result. The card is a decision aid only.

## Local Tool

```bat
tools\aiworkflow\studio_result_review_planner.bat status
tools\aiworkflow\studio_result_review_planner.bat list
tools\aiworkflow\studio_result_review_planner.bat read <result_review_id>
tools\aiworkflow\studio_result_review_planner.bat validate <result_review_json_path>
tools\aiworkflow\studio_result_review_planner.bat store <result_review_json_path>
tools\aiworkflow\studio_result_review_planner.bat store <result_review_json_path> --execute
```

Use `--json` for machine-readable output.

Store is dry-run unless `--execute` is provided.

For validation smoke tests, use `--store-path` under:

```text
_Temp/AIWorkflowStudio/result_reviews/
```

Store overrides outside `_Temp/AIWorkflowStudio/result_reviews/` are rejected.

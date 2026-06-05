# Studio Goal D Result Review and Evidence Linkage Scope Packet

## Date

2026-06-05

## Status

Architecture and scope packet only.

This document does not approve implementation. It defines the Result Review foundation required before Goal E can be considered complete from the Human Director perspective.

## Goal

Define how Studio turns worker/runtime evidence into a Director-readable Result Review without automatically accepting, rejecting, completing, committing, or pushing anything.

```text
Execution Request
  -> future Worker Dispatch
  -> evidence artifacts
  -> Result Review record/view
  -> Human Director decision
  -> Record Keeping
```

## Why Goal D Is Needed Before Goal E Completion

Worker execution without result review would create opaque automation. The Human Director needs a stable review surface for:

- what was attempted
- what changed
- what validation ran
- what failed or was skipped
- what risks remain
- what decision is needed next

Goal E can start a worker only safely if the system already knows how the result will be shown and judged.

## Final-Form Architecture

```text
Evidence Collector
  -> raw logs, changed file metadata, validation command metadata

Result Review Builder
  -> Director-readable summary from evidence and worker report

Result Review Store
  -> durable review record

Result Review UI/API
  -> read-only review first, then explicit Director decisions later
```

Responsibilities:

- Evidence Collector does not judge pass/fail by itself.
- Result Review summarizes and links evidence.
- Human Director accepts/requests changes/rejects/defers.
- Git commit/push remain separate approvals.

## Proposed Storage

Durable Result Review records:

```text
_Docs/AIWorkflow/Studio/ResultReviews/
```

Validation/smoke override:

```text
_Temp/AIWorkflowStudio/result_reviews/
```

Record id:

```text
RR-YYYYMMDD-HHMMSS-short-slug.json
```

Schema:

```text
result_review.v1
```

## Proposed Result Review Fields

```text
result_review_id
schema_version
execution_request_id
worker_dispatch_id
source_evidence_refs
status
summary
changed_files_summary
validation_commands
validation_results
risks
human_decisions_needed
recommended_next_action
commit_recommendation
record_refs
created_at
updated_at
```

`commit_recommendation` is advisory only and must not authorize commit.

## Proposed Statuses

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

## Reduced-Scope Implementation Before Goal E

The first Goal D slice should be read/store/display only:

1. Define Result Review storage and schema.
2. Add validator for `result_review.v1`.
3. Add planner or service commands: `status`, `list`, `read`, `validate`, `store`.
4. Add read-only Studio API/UI surface.
5. Do not implement accept/reject/change-request mutation yet unless separately approved.

## Result Review Content Requirements

A useful Director-facing result must include:

- implementation summary
- files changed
- behavior/model summary
- validation commands run
- validation results
- known risks
- human decisions needed
- commit recommendation, if appropriate

It must explicitly say when validation was not run.

## Tests Required

- Valid `result_review.v1` passes validation.
- Missing required fields fail validation.
- Invalid status fails validation.
- Store is dry-run unless `--execute`.
- `_Temp` override is restricted.
- Read-only UI/API does not mutate files.
- Result Review does not mark Execution Request closed automatically.
- Result Review does not commit/push.

## Non-Goals

Goal D foundation must not implement:

- worker dispatch
- automatic acceptance
- automatic done/closed
- automatic commit/push
- raw log dashboard as primary UI
- hidden validation judgment
- game source/data changes

## Fixed Implementation Recommendation

Based on the Human Director's established Studio direction, use this default unless explicitly superseded:

1. Use `_Docs/AIWorkflow/Studio/ResultReviews/` as the durable store.
2. Use `result_review.v1` for the first schema.
3. Implement read/store/display only in D.1.
4. Defer accept/request-changes/reject decisions to a later explicit step.
5. Show normal UI summaries with expandable internal evidence details.

## Recommended Approval Wording

```text
Approve Goal D.1.
Scope: Result Review storage/schema/planner and read-only Director UI/API surface. It may store and display result review records but must not accept/reject/close automatically, dispatch workers, create commits/pushes, or change game source/data.
```

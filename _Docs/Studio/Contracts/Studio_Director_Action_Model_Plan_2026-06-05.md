# Studio Director Action Model Plan

## Date

2026-06-05

## Status

Plan-only.

This document does not approve implementation of mutation APIs, persisted schema changes, worker execution, automatic approval, or migration.

## Goal

Define the final-form action model that should follow the current read-only Studio Director surface.

Studio currently lets the Human Director read normalized Director views:

```text
Conversation
Decision
Execution Request
Result Review
Record Keeping
```

The next product step is to decide what actions the Human Director can take from those surfaces and which actions must remain gated by explicit approval.

## Final-Form Architecture

The final Studio action model should keep these responsibilities separate:

```text
Director decision surface
  -> shows choices, consequences, risks, and source evidence

Action intent
  -> records what the Human Director wants to do

Execution request
  -> bounded work contract for AI staff or tools

Execution adapter
  -> performs approved work only

Result review
  -> presents evidence and asks for accept / request changes / archive

Record keeping
  -> stores durable decisions, summaries, and audit links
```

Studio must not collapse all of these into a raw operations dashboard.

## Reduced-Scope Implementation Direction

The first implementation should not add mutation APIs immediately.

Recommended reduced-scope path:

1. Keep read-only `director_views` and `/api/director/*` aliases stable.
2. Add explicit action intent vocabulary in docs and UI copy.
3. Add plan-only approval boundaries for each action class.
4. Add tests for read-only contract stability.
5. Only after review, add narrowly scoped action endpoints one family at a time.

## Canonical Action Classes

### 1. Conversation Actions

Conversation is the intake and clarification layer.

Possible Director actions:

```text
summarize_conversation
extract_decision_candidate
extract_execution_request_candidate
extract_record_candidate
link_source_context
```

Initial status:

```text
Plan-only. Do not implement mutation routes yet.
```

Approval boundary:

- Safe to preview extracted candidates.
- Requires explicit Director approval to turn a candidate into a durable decision, execution request, or record.

Non-goals:

- Do not auto-create work orders from conversation text.
- Do not treat conversation summary as approval.

### 2. Decision Actions

Decision is where the Human Director chooses a direction.

Possible Director actions:

```text
approve_decision
defer_decision
reject_decision
request_clarification
promote_to_record
```

Expected effect:

- `approve_decision` records a Director decision.
- `defer_decision` keeps it visible without execution.
- `reject_decision` records a negative decision and reason.
- `request_clarification` sends the item back to conversation/exploration.
- `promote_to_record` stores the decision in durable record keeping.

Approval boundary:

- The Human Director must choose the action explicitly.
- Approval of a decision does not automatically authorize source edits unless it also creates or approves a bounded Execution Request.

Non-goals:

- Do not auto-run workers after a decision alone.
- Do not canonize project/game/IP facts without explicit record/canon action.

### 3. Execution Request Actions

Execution Request is the contract layer between Director decision and worker execution.

Possible Director actions:

```text
create_execution_request
revise_execution_scope
mark_ready_for_worker
cancel_execution_request
split_execution_request
```

Expected fields for a future execution request:

```text
title
objective
scope
non_goals
allowed_files_or_areas
blocked_files_or_areas
validation_plan
return_format
approval_state
source_decision_id
source_conversation_id
```

Approval boundary:

- Creating a draft request may be safe.
- Marking it ready for worker requires explicit Director approval.
- Running a worker requires a bounded approved execution request.

Non-goals:

- Do not execute arbitrary user-provided shell commands.
- Do not modify game source/data unless the execution request explicitly includes that scope.
- Do not create commits automatically unless separately approved.

### 4. Result Review Actions

Result Review is where the Human Director judges completed work.

Possible Director actions:

```text
accept_result
request_changes
reject_result
archive_result
promote_result_to_record
prepare_commit
```

Expected effect:

- `accept_result` records Director acceptance of the result.
- `request_changes` creates a follow-up execution request or returns work to a worker.
- `reject_result` records that the result should not be used.
- `archive_result` keeps the evidence without making it active.
- `promote_result_to_record` turns the outcome into durable memory/devlog/record.
- `prepare_commit` may stage or recommend a commit only if commit scope is explicitly approved.

Approval boundary:

- Result acceptance is not the same as git commit approval.
- Commit, push, release, deployment, and publication remain separate explicit decisions.

Non-goals:

- Do not auto-merge result evidence into project canon.
- Do not hide failed validation.

### 5. Record Keeping Actions

Record Keeping preserves durable decisions, outcomes, and audit evidence.

Possible Director actions:

```text
promote_to_record
link_evidence
summarize_record
mark_superseded
archive_record
```

Expected effect:

- Records should explain why a decision was made, what changed, what validation ran, and what risk remains.
- Records should link back to source artifacts rather than copying raw internal state as the main UX.

Approval boundary:

- Durable memory/canon/project-direction records require explicit Director intent.
- Temporary session progress should not be promoted to durable memory unless it will remain useful.

Non-goals:

- Do not store secrets.
- Do not treat generated Handoff timestamps as meaningful records.

## Proposed Future API Families

These are future candidates only:

```text
POST /api/director/conversations/actions/extract-candidates
POST /api/director/decisions/actions/approve
POST /api/director/decisions/actions/defer
POST /api/director/decisions/actions/reject
POST /api/director/execution-requests/actions/create
POST /api/director/execution-requests/actions/mark-ready
POST /api/director/result-reviews/actions/accept
POST /api/director/result-reviews/actions/request-changes
POST /api/director/records/actions/promote
```

Do not implement these until a specific action family is approved.

## Action Envelope Proposal

A future action endpoint should use a consistent envelope:

```json
{
  "action": "approve_decision",
  "source_type": "proposal",
  "source_id": "proposal-id",
  "reason": "Human Director decision reason",
  "scope": {
    "allowed": [],
    "blocked": []
  },
  "approval": {
    "human_director_confirmed": true,
    "confirmed_at": "2026-06-05T00:00:00.000Z"
  }
}
```

Response envelope:

```json
{
  "ok": true,
  "director_action_version": "draft-v1",
  "action": "approve_decision",
  "result_id": "record-id",
  "record_path": "_DevLog/...",
  "next_state": "recorded"
}
```

The final field names must be approved before implementation.

## Safety Rules

1. Read-only endpoints remain separate from action endpoints.
2. Action endpoints must be explicit `POST` routes, never hidden behind `GET`.
3. Every action must state whether it is draft-only, record-writing, worker-triggering, or git-affecting.
4. Worker-triggering actions require an approved Execution Request.
5. Git-affecting actions require separate commit/push approval.
6. Save/load, persisted schema, and migration changes require separate approval.
7. Handoff remains an internal Work Packet layer, not the default Director UI.
8. Generated timestamp-only Handoff diffs must not be treated as meaningful Director actions.

## Recommended Implementation Order

### Goal A: Action Vocabulary and UI Copy

Plan/implement only labels and disabled affordance placeholders.

Allowed:

```text
- UI copy
- help text
- disabled buttons with explicit "not implemented" state
- tests proving no mutation route exists
```

Blocked:

```text
- POST routes
- file writes
- worker execution
```

### Goal B: Decision Action Draft Records

Implement only one narrow family after approval:

```text
Decision approve/defer/reject/request_clarification
```

Should write a small, reviewable record only if the storage location and schema are approved first.

### Goal C: Execution Request Draft Creation

Implement draft creation from a selected decision/conversation.

Must define:

```text
- storage path
- schema
- validation
- invalid-data behavior
- approval state
```

### Goal D: Result Review Action Records

Implement accept/request-changes/reject as record-writing actions only after result review storage is approved.

### Goal E: Worker Execution Integration

Only after Action Model and Execution Request storage are stable.

Must not run arbitrary commands. Must use bounded allowlisted execution paths.

## Validation Requirements for Future Action Work

Every future action implementation must include:

```text
- RED/GREEN tests for the action handler
- invalid-method tests proving GET does not mutate
- invalid-source tests
- approval-required tests
- node --check for edited modules
- server --once summary check if summary output changes
- live browser/API smoke if UI/server behavior changes
- git diff --check
- WorkLog update
```

## Open Questions for Human Director

1. Where should first-class Studio action records be stored?
2. Should action records remain under `_DevLog/` initially, or use a Studio-specific record path?
3. Which action family should be implemented first: Decision, Execution Request, or Result Review?
4. Should Studio ever trigger workers directly, or should Hermes remain the execution orchestrator while Studio records intent?
5. What is the minimum acceptable UI for reviewing action consequences before confirmation?

## Current Recommendation

Implemented first reduced-scope step:

```text
Action Vocabulary and UI Copy
```

Current implementation status:

- Studio Director Desk shows a preview-only `Director Action Vocabulary` panel.
- The panel names the allowed future action language for Conversation, Decision, Execution Request, Result Review, and Record Keeping.
- Preview buttons are disabled and marked with `data-director-action-preview`.
- No action endpoint, write route, file mutation, worker execution, commit, push, or durable record write is wired to the vocabulary panel.

Next source-behavior step, if approved:

```text
Decision Action Draft Records
```

Before that step, storage path and approval boundary must be explicitly approved.

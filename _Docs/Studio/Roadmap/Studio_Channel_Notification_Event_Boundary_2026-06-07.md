# Studio Channel Notification Event Boundary

## Date

2026-06-07

## Status

Implemented as a read-only Studio notification record model.

## Purpose

Studio may create notification records for important workflow facts so the Human Director can notice them in Studio or through future delivery channels.

Notification records are not governance decisions.

```text
Studio stage fact
  -> notification record
  -> optional delivery channel message
  -> link back to Studio
  -> Human Director decision in Studio
```

## Delivery Channel Boundary

Allowed delivery channels:

- Studio
- Discord
- OpenClaw
- mobile
- voice

Allowed channel behavior:

- notify that a stage changed
- notify that a blocker exists
- notify that an approval is waiting
- notify that a result or completion card is ready
- link the Human Director back to Studio

Forbidden channel behavior:

- approve or reject work
- close, mark done, supersede, or defer work
- pause, stop, retry, or replan runtime execution
- start PC Runner, Codex/local execution, or build/test dispatch
- commit, push, release, or deploy
- bypass Result Review, Record Keeping, or Studio approval gates
- expose secrets, tokens, credentials, auth codes, or local channel config

## Events That Should Notify The Human Director

Notify for stage changes when:

- an Execution Request becomes ready for Worker Dispatch request-record review
- a Worker Dispatch is requested, picked up, running, result ready, blocked, failed, closed, or superseded
- a Result Review becomes ready for Director judgment
- a Completion Card is available for review
- a Commit/Push Request is waiting for separate approval

Notify for blockers when:

- any Studio record is invalid
- an implementation-worker result lacks validation commands or validation results
- validation was skipped
- Verification Gate outcome is `fail`, `warning`, `blocked`, or `skipped`
- runtime observation marks a worker/session as stalled
- evidence or Result Review handoff is missing

Notify for approval waits when:

- Execution Request readiness or dispatch-request creation needs Human Director approval
- Result Review needs accept/request-changes/reject/defer/supersede/close judgment
- Record Keeping promotion needs confirmation
- commit or push is requested

Notify for completion when:

- Worker Dispatch has linked evidence and Result Review
- Result Review has a Director decision
- Completion Card is ready for final human review

## Current Reduced-Scope Implementation

The current implementation is data/model only:

- notification records are generated in memory from existing Studio facts
- records are included in `/api/summary`
- Director Console shows notification records on the home surface
- no external delivery is started
- no external channel receives governance authority

## Current Model

Each notification record includes:

- `schema_version`
- `notification_id`
- `event_type`
- `source_type`
- `source_id`
- `severity`
- `stage`
- `title`
- `summary`
- `director_action`
- `recommended_surface`
- `delivery_channel_candidates`
- `channel_boundary`
- `governance_authority`
- `created_from_facts_only`
- `updated_at`

## Safety Statement

Notification records are facts for attention routing only.

They must not approve, reject, close, mark done, retry, commit, push, release, deploy, create Backlog/ActiveTask entries, ingest Director Brain/Obsidian records, or mutate game source/data.

## AIWorkflow User Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is required in this change because no Discord command name, command option, approval behavior, PC Runner profile, task finalization step, commit/push procedure, or regular AIWorkflow intervention point changed.

This document records a Studio-only notification record boundary and future delivery-channel policy.

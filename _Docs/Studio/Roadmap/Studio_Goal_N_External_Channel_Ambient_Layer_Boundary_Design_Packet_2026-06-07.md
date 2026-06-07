# Studio Goal N External Channel / Ambient Layer Boundary Design Packet

## Date

2026-06-07

## Status

Design packet only. No external channel integration implementation is approved.

## Goal

Define how Discord, OpenClaw, mobile, voice, and chat channels may route inbound requests, progress alerts, blockers, approval waits, and completion notices into Studio workflow without bypassing governance.

## Final-Form Architecture

```text
External channel
  -> intake/notification adapter
  -> Studio Conversation / Decision / Execution Request / Result Review
  -> Human Director decision record
  -> bounded Worker Dispatch or Record Keeping
```

## Channel Responsibilities

Allowed:

- inbound natural-language intake
- progress notification
- blocker notification
- approval-wait notification
- completion-card notification
- links back into Studio

Not allowed:

- direct source edits
- direct PC Runner default starts
- direct commit/push/release/deploy approval
- bypassing Result Review or Record Keeping
- exposing secrets, tokens, auth codes, or local channel config

## OpenClaw Future Role

OpenClaw may become an ambient presence layer for cross-device conversation, reminders, and notifications.

OpenClaw must not become:

- Studio governance authority
- default implementation worker
- Director Brain
- direct command path around Studio approval gates

## Discord Boundary

Discord commands and natural-language triggers must route into the same Studio workflow.

Discord must not create an alternate command-driven operating path for approval, execution, completion, commit, push, release, or deployment.

## Validation Criteria For Future Implementation

- external messages produce Studio intake or notification records only
- every approval-wait message links back to a Studio decision surface
- commit/push/release/deploy cannot be approved directly in external channels
- no token/config/secrets appear in docs, logs, records, or UI payloads

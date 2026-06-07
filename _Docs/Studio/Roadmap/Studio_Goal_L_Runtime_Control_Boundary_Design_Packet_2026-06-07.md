# Studio Goal L Runtime Control Boundary Design Packet

## Date

2026-06-07

## Status

Design packet only. No implementation approval is granted by this document.

## Goal

Define future runtime control boundaries for pause, stop, retry, and replan request records without implementing live worker control.

## Final-Form Architecture

```text
Human Director decision
  -> Runtime Control Request record
  -> Runtime Control review/preflight
  -> approved adapter action in a later goal
  -> evidence collection
  -> Result Review / Completion Card
```

## Reduced-Scope Design

Goal L defines request records only:

- `pause_request`
- `stop_request`
- `retry_request`
- `replan_request`

Each request must include:

- target Execution Request / Worker Dispatch / runner reference
- requested control action
- human reason
- expected effect
- blocked side effects
- approval state
- evidence required after action

## Responsibility Boundaries

- Progress and heartbeat collection only observes runtime activity.
- Evidence Collector records metadata and artifacts.
- Verification Gate judges evidence after the fact.
- Runtime Control would request pause/stop/retry/replan only after explicit approval.
- Result Review and Human Director decisions remain separate.

## Non-Goals

- no live stop or process kill implementation
- no automatic retry
- no automatic replan
- no runtime control mutation API
- no PC Runner direct-control default path
- no automatic done/close/accept
- no commit/push

## Validation Criteria For Future Implementation

- request records validate without executing control actions
- invalid target ids are rejected
- missing Director confirmation is rejected
- retry/replan cannot bypass Execution Request scope
- stop/pause requests do not mark worker results passed or failed
- no source, git, Backlog, or ActiveTask mutation occurs from record creation

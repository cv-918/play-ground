# Studio Goal M AI Staff Orchestration Design Packet

## Date

2026-06-07

## Status

Design packet only. No autonomous multi-worker implementation is approved.

## Goal

Define AI staff roles and Director-facing orchestration summaries while keeping agent/session/queue internals out of the main Studio UI.

## Final-Form Architecture

```text
Conversation / Decision
  -> role recommendation
  -> Execution Request or Result Review context
  -> bounded staff assignment summary
  -> Worker Dispatch / evidence / Result Review linkage
  -> Record Keeping
```

## Role Model

Initial Director-facing roles:

- architect: scope, architecture, lifecycle risk, schema risk
- implementer: approved bounded source/data work
- reviewer: diff, behavior, regression, policy review
- tester: validation plan, build/test evidence, repro checks
- documenter: DevLog, guide, roadmap, release-note support
- researcher: external facts, tool/product research, source attribution

## Director-Facing Summary Model

Studio should summarize orchestration by outcome:

- what role is needed
- what decision the role supports
- what Execution Request or Result Review it links to
- what evidence the role must return
- what the Human Director must decide next

Agent ids, queue ids, nested worker trees, and raw session internals belong in internal/debug views only.

## Non-Goals

- no generic multi-agent dashboard
- no autonomous worker spawning
- no recursive scheduling or nested delegation
- no agent/session/queue internals as the main UI
- no governance bypass around Execution Request, Worker Dispatch, Result Review, or commit/push gates

## Validation Criteria For Future Implementation

- role summaries can be read without raw queue/session ids
- staff assignment cannot start execution without an approved Execution Request
- multi-role evidence remains linked to Result Review records
- no automatic Backlog/ActiveTask creation
- no automatic accept/reject/done/close

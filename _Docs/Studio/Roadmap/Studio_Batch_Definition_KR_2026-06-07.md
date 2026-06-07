# Studio Batch Definition

## Date

2026-06-07

## Definition

A Studio Batch is a bounded, Human Director-approved bundle of related Studio goals that Hermes may execute end-to-end after approval.

In Korean operational terms:

```text
배치 = 관련 목표들을 하나의 결재 단위로 묶고,
       승인 후 Hermes/Codex가 끝까지 실행하는 작업 묶음.
```

## Why This Term Exists

Before this term, the workflow could become vague:

- list of things to do
- next items
- needed pieces
- remaining implementation
- several related tasks

`Batch` replaces that ambiguity with a clear operating unit.

## Batch Properties

A Batch must have:

1. Clear goal group
2. Approved scope
3. Explicit non-goals
4. Execution order
5. Validation plan
6. Review plan
7. Notification policy
8. Stop conditions
9. Commit/push policy

## Batch Execution Model

Default Studio/AIWorkflow execution model:

```text
Human Director approves Batch
  -> Hermes writes bounded handoff(s)
  -> Codex/Hermes implements inside approved scope
  -> Hermes reviews diff
  -> Hermes runs validation
  -> Hermes checks scope/security
  -> Hermes reports PASS / PASS_WITH_NOTES / BLOCKED
  -> commit/push waits for explicit approval unless pre-approved
```

## Batch Stop Conditions

Hermes must stop the Batch or the affected sub-scope when:

- approved scope would expand
- source edits would exceed Execution Request scope
- direct unrestricted shell execution would be needed from Studio
- PC Runner/default runtime authority would be added without approval
- automatic accept/reject/done/close would be introduced
- automatic commit/push/release/deploy would be introduced without approval
- Director Brain/Obsidian automatic ingest would be introduced without approval
- validation cannot be run or fails in a way that blocks correctness
- security/scope scan finds a Critical/Major issue

## Batch Notification Policy

For Studio/AIWorkflow batches, Hermes should notify Discord when available:

- Batch approved
- Batch started
- Each major stage started
- Codex worker completed or stalled
- Validation passed or failed
- Blocker found
- Batch completed
- Commit/push completed, if separately approved

## Batch vs Goal

```text
Goal  = one bounded product/workflow objective.
Batch = one or more related goals approved and executed together.
```

Example:

```text
Goal F = Result Review decision actions
Goal G = Record Keeping foundation
Batch F~K = Result Review, Record Keeping, Worker boundary, Evidence, Completion, Commit boundary
```

## Batch vs Commit

A Batch is not necessarily one commit.

Recommended policy:

```text
Batch approval controls execution scope.
Commit boundaries should still be split by coherent goal/task groups.
```

## Current Next Batch

Current prepared next Batch:

```text
Batch 1. Studio UX Operational Polish
Batch 2. Controlled Implementation Worker v2
Batch 3. Evidence / Verification Hardening
Batch 4. Minimal Runtime Observation, read-only only
Batch 5. Channel Notification Integration Boundary
```

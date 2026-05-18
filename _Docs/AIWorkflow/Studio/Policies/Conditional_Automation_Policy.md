# Conditional Automation Policy

## Purpose

This policy defines the first Studio-level conditional automation gate.

It does not grant broad autonomy. It defines when a low-risk repetitive action
can be considered automation-eligible, when Human Director approval is required,
and when the action must be blocked.

The core rule is:

```text
automation eligibility is deterministic, replayable, and auditable
```

## Decisions

| Decision | Meaning |
|---|---|
| `auto_allowed` | The case is low-risk and may proceed through an automation path if the caller explicitly supports it. |
| `human_required` | The action is not blocked, but Human Director approval is required first. |
| `blocked` | The action must not proceed through automation. |

## Auto-Allowed Requirements

All of these must be true:

- priority is `P2` or `P3`
- risk is `low`
- requested actions are non-destructive
- scope is explicit
- non-goals are explicit
- validation plan exists
- no source write
- no data write
- no schema change
- no canon write
- no asset import
- no external call
- no possible cost
- no commit or push

## Human-Required Triggers

Any of these require Human Director approval:

- priority is `P0` or `P1`
- risk is `medium` or `high`
- source or data write
- canon write
- canon approval request before the write has happened
- asset import
- external tool use
- possible cost
- commit or push
- missing validation plan
- missing rollback plan for a change-capable action
- WorkOrder, MeetingSession, or RoleRunOutput still has unresolved approval
  items

## Blocked Triggers

Any of these block automation:

- destructive action
- schema change without a decision reference
- request attempts to approve, finalize, commit, or push itself
- missing scope and missing non-goals at the same time

Canon-changing work without a decision reference is `human_required` when it is
requesting approval or preparing a proposal. It becomes `blocked` only if the
automation request attempts to silently write or finalize canon as its own
side effect.

External/cost-capable work is `human_required` by default. It becomes `blocked`
only when the request tries to spend money or call an external provider without
an approval path, scope, non-goals, and validation evidence.

## Replay Requirement

Every automation decision must be reproducible from:

- policy version
- input case
- computed decision
- reasons
- blockers
- timestamp

The replay tool must be able to recompute the decision and compare it with the
recorded decision.

## Repair Plan Requirement

When replay fails or a case is blocked, the system must produce a repair plan
instead of mutating workflow state.

Repair plans may suggest:

- add missing scope
- add missing non-goals
- add validation plan
- add rollback plan
- request Human Director decision
- split the task into a safer WorkOrder
- keep the action manual

Repair plans must not:

- approve work
- create tasks
- start runners
- write canon
- commit or push

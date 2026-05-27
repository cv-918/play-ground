# Handoff Operations Checklist

## Purpose

This document defines the Phase 14 daily operating checklist for the AI Role Handoff System.

It answers one practical question:

```text
When the Handoff System is in use, what should the human developer or an assistant check first?
```

This checklist does not add new automation authority.

## Primary Operating Surfaces

Use these files in this order.

1. `_Docs/Handoff/Dashboard.md`
2. `_Docs/Handoff/Violations/Open.md`
3. `_Docs/Handoff/Queues/<Role>.md`
4. `_Docs/Handoff/00_Index.md`
5. The referenced Packet documents

`Dashboard.md` is the first stop.

`Violations/Open.md` is the safety stop.

Role Queues are work intake surfaces.

`00_Index.md` is the durable table of contents.

Packet documents are the decision and evidence surface.

## Normal Health Check

Run:

```bat
tools\aiworkflow\handoff_supervisor.bat status
```

Healthy output usually means:

- Supervisor runs without script errors.
- `Consistency Issues` is `0`.
- `Waiting Approval` count is either `0` or all items are intentional.
- `Ready Work` items have matching request documents.
- Done Packets have completion notices.

`Waiting Approval` greater than `0` is not automatically a problem.

It means the user has a decision to make.

## User Action Matrix

| Surface | If You See | User Action |
| --- | --- | --- |
| Dashboard | `Waiting User Approval` item | Open the request path and choose approve, reject, or modify scope. |
| Dashboard | `Consistency Issues` greater than `0` | Open `Violations/Open.md` before starting or approving work. |
| Role Queue | `Ready Work` item | The target role may inspect and plan. It is not implementation approval. |
| Role Queue | `Waiting User Approval` item | The target role must not implement until the user decision is recorded. |
| Violations | Missing manifest/index/request document | Fix the Handoff document state before execution work. |
| Packet Results | DeveloperPlan or approval request | Decide the specific requested scope, not a generic gate label. |
| CompletionNotice | Completed work | Review validation notes and decide whether to commit or push. |

## Supervisor Automation State

As of Phase 14:

```text
playground-handoff-supervisor = ACTIVE
```

Expected behavior:

- runs on its configured recurrence
- updates Dashboard, Queues, and Violations
- does not edit game source, gameplay JSON, assets, approval evidence, commit, or push

The Supervisor is an operations assistant, not an executor.

## Low-Risk Role Worker Automation State

As of Phase 14:

```text
playground-handoff-role-worker-low-risk = PAUSED
```

Expected behavior when activated later:

- reads Dashboard, Queues, Violations, Packets, and Role Worker docs
- writes automation run reports only
- does not write Packet Results drafts unless separately approved
- does not edit manifests, approval evidence, source, JSON, assets, build, commit, or push

## Approval Decision Checklist

Before approving a waiting item, confirm the linked request document explains:

- what will change
- why it matters
- expected files or systems
- what is not in scope
- risks
- validation plan
- approve, reject, and modify-scope choices
- suggested user response sentences

If any of these are missing, ask for the approval request to be rewritten.

The Phase 13C Supervisor lint should catch obvious missing sections, but the user still decides whether the request is good enough.

## End-Of-Work Checklist

Before considering a Handoff task complete, confirm:

- requested scope was followed
- validation was run or explicitly deferred
- result document exists
- completion notice exists when the Packet is `Done`
- remaining risks are recorded
- DevLog exists for meaningful work
- unrelated changes are not included in the commit

## Commands

```bat
tools\aiworkflow\handoff_supervisor.bat status
tools\aiworkflow\handoff_supervisor.bat scan --role Developer
tools\aiworkflow\handoff_supervisor.bat write-docs
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

Use `write-docs` without `--execute` to preview generated surface updates.

Use `write-docs --execute` only when updating:

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`

## Phase 14 Completion Criteria

Phase 14 is complete when:

- daily operating surfaces are documented
- user action matrix is documented
- automation states are documented
- approval decision checklist is documented
- Handoff guide and index link this checklist

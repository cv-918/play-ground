# Handoff v2 Scope-Based Execution Principle

## Summary

Recorded the user's desired Handoff v2 approval standard: implementation approval is based on approved scope, not on source code modification itself.

## Background

The previous Handoff v1 wording was intentionally conservative and could be read as requiring a new user approval whenever Developer work changed source code.

The user clarified that this is too much micro-approval for a game-team style workflow. Once planning and implementation scope are approved, the Developer should implement inside that scope. If something goes wrong, review, validation, fixes, or rollback are the normal response.

## Scope

Changed Handoff and repository workflow documentation only.

No game source, gameplay JSON, assets, build settings, automation schedules, commits, or pushes were changed by this work.

## Files Changed

- `AGENTS.md`
- `_Docs/Handoff/Handoff_V2_Scope_Based_Execution_Principle.md`
- `_Docs/Handoff/Handoff_V2_Scope_Based_Execution_Principle_KR.md`
- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Handoff_System_Principles.md`
- `_Docs/Handoff/Handoff_System_Principles_KR.md`
- `_Docs/Handoff/Role_Routines/Developer_Routine.md`
- `_Docs/Handoff/Role_Routines/Role_Routine_Overview.md`
- `_Docs/Handoff/Approval_Waiting_Flow.md`
- `_Docs/Handoff/Approval_Waiting_Flow_KR.md`
- `_Docs/Handoff/Handoff_Guide_KR.md`
- `_Docs/Handoff/Handoff_V1_Finalization.md`
- `_Docs/Handoff/Handoff_V1_Finalization_KR.md`
- `_Docs/Handoff/Guide/Handoff_System_User_Guide_KR.html`

## Policy Notes

New rule:

```text
Approval is triggered by scope departure, not by source code modification itself.
```

An approved Handoff Packet, DeveloperPlan, work order, or equivalent execution scope covers normal source edits and non-schema data edits needed to complete that work.

Renewed approval is required when implementation expands beyond the approved scope or needs unapproved schema, save/load, lifecycle, build, Git, or workflow-rule changes.

## AIWorkflow Guide Decision

This change adjusts repository-level Handoff and AGENTS approval interpretation. The AIWorkflow user guide itself was not changed because this work does not alter Discord commands, PC Runner behavior, AIWorkflow task-state behavior, or AIWorkflow Studio UI.

## Validation

Commands run:

- `tools\aiworkflow\handoff_supervisor.bat status`
- `git diff --check -- <touched workflow files>`

Results:

- Supervisor reported 4 Packets, 0 active Packets, 0 waiting approvals, and 0 consistency issues.
- `git diff --check` reported no whitespace errors for the touched files. Git printed normal CRLF conversion warnings only.

## Remaining Risks

Future v2 implementation still needs to encode this scope-based interpretation in any role-worker automation or Supervisor lint that evaluates implementation boundaries.

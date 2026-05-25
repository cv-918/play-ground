# AI Role Handoff System Phase 3 Role Routines

## Summary

Defined role-specific Handoff routines for Planner, Developer, Artist, Reviewer, and QA.

## Background

Phase 1 established operating principles. Phase 2 defined Packet and manifest structure. Phase 3 explains how each role chat should use that structure without introducing automation or execution expansion.

## Scope

- Added shared role routine overview.
- Added Planner routine.
- Added Developer routine.
- Added Artist routine.
- Added Reviewer routine.
- Added QA routine.
- Added Role_Routines folder purpose documents.
- Updated Handoff index and Korean guide.

## Files Changed

- `_Docs/Handoff/Role_Routines/_FolderPurpose.md`
- `_Docs/Handoff/Role_Routines/_FolderPurpose_KR.md`
- `_Docs/Handoff/Role_Routines/Role_Routine_Overview.md`
- `_Docs/Handoff/Role_Routines/Planner_Routine.md`
- `_Docs/Handoff/Role_Routines/Developer_Routine.md`
- `_Docs/Handoff/Role_Routines/Artist_Routine.md`
- `_Docs/Handoff/Role_Routines/Reviewer_Routine.md`
- `_Docs/Handoff/Role_Routines/QA_Routine.md`
- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Handoff_Guide_KR.md`
- `_DevLog/WorkLog/2026-05-25_AI_Role_Handoff_System_Phase3_Role_Routines.md`

## Architecture Notes

Role routines are instructions for human-assisted or role-chat operation. They do not implement automation, background scanning, code execution, commit, or push.

The routines preserve AIWorkflow as the approval, risk, validation, and completion safety engine.

## Implementation Notes

- All roles share a common routine: inspect index, read manifest, claim manually, plan, risk-classify, request approval when needed, record results, update status.
- Developer routine stops before source, data, runtime, build, or Git changes without explicit approval.
- Artist routine keeps large resources out of Handoff and uses resource notes.
- Reviewer and QA routines emphasize evidence and do not mark unverified work as passed.

## User Guide Update Decision

The Korean Handoff guide was updated because role routines are part of the regular Handoff usage path. The canonical AIWorkflow user guide was not updated because no AIWorkflow command, runner, executor, approval gate, or finalization behavior changed.

## Review Summary

This phase changed documentation only.

## Validation Summary

Ran trailing whitespace and `git diff --check` validation after edits. No build or runtime validation is required for this documentation-only phase.

## Remaining Risks

- Phase 4 should create a manual pilot Packet to test whether the role routines are too heavy or missing practical steps.
- Role routines may need refinement after real Planner to Developer handoff use.

## Next Tasks

- Phase 4: create and run a manual pilot Handoff Packet.

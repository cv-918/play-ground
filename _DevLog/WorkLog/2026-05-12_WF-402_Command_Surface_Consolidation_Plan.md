# WF-402 Command Surface Consolidation Plan

## Summary

Defined the command surface categories and deprecation plan after the WF-401
workflow audit.

## Background

The workflow has accumulated normal task commands, diagnostic/admin commands,
manual bootstrap commands, local runtime primitives, and compatibility aliases.
Before removing or hiding anything, the command surface needs an explicit
classification and approval model.

## Scope

In scope:

- Classify commands by regular path, future runner-owned path, diagnostic/admin
  surface, and compatibility/manual escalation surface.
- Record deprecation candidates.
- Record removal rules and Human Director decisions needed before cleanup.
- Update Backlog, ActiveTask, README map, and DevLog.

Out of scope:

- Removing commands.
- Renaming commands.
- Changing command behavior.
- Changing slash command metadata.
- Implementing PC Runner orchestration.
- Automatic approval, done, commit, or push.
- Game source or game data changes.

## Files Changed

- `_Docs/AIWorkflow/FinalBlueprint/WF_Command_Surface_Consolidation_Plan.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_DevLog/WorkLog/2026-05-12_WF-402_Command_Surface_Consolidation_Plan.md`

## Review Summary

The plan keeps compatibility/manual-escalation commands available for now and
prevents command removal until a replacement, documentation update, explicit
approval, and validation are all present.

## Validation Summary

Completed validation:

- Reviewed consolidation plan content and Backlog/ActiveTask updates.
- Ran `git diff --check` on the changed workflow documentation set; it passed
  with line-ending warnings only.
- Confirmed no command removal, command rename, slash command metadata change,
  or behavior change was made by this task.
- Confirmed no game source/data changes were made by this task.

## Remaining Risks

- The deprecation plan still requires Human Director decisions before WF-408
  cleanup.
- The final command shape may change after WF-406/WF-407 define and implement
  the unified PC Runner orchestration entrypoint.

## Next Tasks

1. WF-403 Write end-to-end workflow technical specification.
2. WF-404 Write Human Director workflow operation guide.
3. WF-405 Run end-to-end workflow smoke and validation pack.

# WF-401 Workflow Audit and Pruning Report

## Summary

Audited the post-WF-309 workflow surface and recorded command categories,
regular-path gaps, documentation drift, user intervention points, and pruning
or consolidation candidates.

## Background

The workflow now has intake, task management, execution primitives, runtime
control, result collection, verification, completion, finalization,
auto-approval evaluation, and follow-up candidate generation. The next concern
is not whether primitives exist, but whether the Human Director-facing workflow
is clear, short, and product-like.

## Scope

In scope:

- Inspect Discord command surface.
- Inspect local workflow script surface.
- Compare README/playbook/Discord README operating paths.
- Record unnecessary, optional, bootstrap, and deprecation candidates.
- Update Backlog, ActiveTask, README map, and DevLog.

Out of scope:

- Removing commands.
- Changing command behavior.
- Changing slash command metadata.
- Implementing PC Runner orchestration.
- Automatic approval, done, commit, or push.
- Game source or game data changes.

## Files Changed

- `_Docs/AIWorkflow/FinalBlueprint/WF_Workflow_Audit_And_Pruning_Report.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_DevLog/WorkLog/2026-05-12_WF-401_Workflow_Audit_And_Pruning_Report.md`

## Review Summary

Findings:

- The command surface now mixes primary workflow commands, diagnostics, admin
  commands, bootstrap/manual escalation paths, and future runtime primitives.
- `tools/discord-orchestrator/README.md` has stale regular-path and validation
  checklist statements after Codex CLI assisted `/ai intake` and Phase 3.
- `tools/aiworkflow/README.md` does not yet document the WF-308/WF-309 local
  scripts.
- `/ai intake-create`, `/ai prepare codex`, `/ai prepare goal`, and
  `/ai result audit` should remain available for now, but should be labeled as
  compatibility/bootstrap/manual-escalation paths in the final guide.

## Validation Summary

Completed validation:

- Reviewed audit report content and Backlog/ActiveTask updates.
- Ran `git diff --check` on the changed workflow documentation set; it passed
  with line-ending warnings only.
- Confirmed no command removal, slash command metadata change, or behavior
  change was made by this task.
- Confirmed no game source/data change was made by this task.

Known working-tree note:

- Existing unrelated changes are present in `PlayGround/Data/UserData.json`,
  `PlayGround/Project/Gameplay/Components/PlayerMovement.cpp`, and
  `PlayGround/Project/Gameplay/GamePlaySystems/Dialogue/DialogueSystem.cpp`.
  They were left untouched by this workflow audit.

## Remaining Risks

- The audit is based on the current docs and command files. WF-402 should make
  the actual deprecation plan explicit before any cleanup.
- No live Discord command execution was performed for this audit.

## Next Tasks

1. WF-402 Define command surface consolidation and deprecation plan.
2. WF-403 Write end-to-end workflow technical specification.
3. WF-404 Write Human Director workflow operation guide.

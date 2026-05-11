# WF-307 ApprovalHistory and FinalizationLog

## Summary

Implemented WF-307 ApprovalHistory and FinalizationLog runtime artifacts.

This adds explicit Human Director completion-decision records after
CompletionReport and Completion Card review. The implementation records accept,
reject, request-changes, and defer decisions without automatically marking tasks
done, changing Backlog/ActiveTask lifecycle state, committing, or pushing.

## Background

WF-305/306 added CompletionReport and Completion Card. WF-307 records the next
decision layer: whether the Human Director accepted completion, requested
changes, rejected completion, or deferred review.

## Scope

- Add local `finalization_log.bat` status/record/read APIs.
- Store ApprovalHistory and FinalizationLog artifacts under `_Temp`.
- Update TaskRunState runtime projections for approval/finalization display.
- Add Discord `/ai finalization status/accept/request-changes/reject/defer/read`.
- Add compact Discord embed formatters for finalization output.
- Document WF-307 boundaries and command usage.

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Approval_History_And_Finalization_Log.md`
- `tools/aiworkflow/finalization_log.ps1`
- `tools/aiworkflow/finalization_log.bat`
- `tools/aiworkflow/README.md`
- `tools/discord-orchestrator/README.md`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/finalizationService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `_DevLog/WorkLog/2026-05-12_WF-307_ApprovalHistory_FinalizationLog.md`

## Implementation Notes

Allowed decisions:

| Decision | Finalization state |
|---|---|
| accept_completion | completion_accepted_pending_task_done |
| reject_completion | completion_rejected |
| request_changes | changes_requested |
| defer_completion | completion_deferred |

`accept_completion` requires a CompletionReport whose readiness allows manual
done review. Other decisions may be recorded against blocked or incomplete
evidence so the Human Director decision remains auditable.

## Review Summary

No Critical or Major issue is currently known.

Boundary checks:

- Finalization commands create runtime artifacts only.
- No Backlog/ActiveTask lifecycle transition is applied.
- No `/ai task done` is run automatically.
- No Auto Approval Policy or Follow-up Task Generator behavior is implemented.
- No commit/push automation is implemented in workflow tools.

## Validation Summary

Validation run during implementation:

- PowerShell parser check for `finalization_log.ps1`.
- `node --check` for `finalizationService.js`.
- `node --check` for `commands/ai.js`.
- `node --check` for `responseFormatter.js`.
- `task_workspace_manager.bat create WF-307 --json`.
- `finalization_log.bat status WF-307 --json`.
- Accept smoke against existing WF-304 ready CompletionReport.
- Expected rejection: accept against blocked WF-305-306 CompletionReport failed.
- Request-changes smoke against blocked WF-305-306 CompletionReport passed.

- Service/formatter smoke passed for finalization status/read/defer payloads.
- Slash command schema check confirmed `/ai finalization` with status, accept,
  request-changes, reject, defer, and read subcommands.
- Discord command registration passed with `npm run register`.
- Managed bot restart/status passed.
- Generated JSON parse checks passed.
- Invariant checks passed for no task done, no auto approval, no follow-up
  generator, no commit, and no push side effects.

- `git diff --check` passed with line-ending warnings only.
- Forbidden/private path checks passed for `_Temp`, `_Local`, `node_modules`,
  and `PlayGround/` source/data paths.

## Remaining Risks

- Live Discord command behavior depends on local Discord bot configuration and
  command registration availability.
- Finalization records capture current git/worktree observation; they do not
  decide whether a commit is allowed.

## Next Tasks

- WF-308 Auto Approval Policy.
- WF-309 Follow-up Task Generator.

## AI Assistance

Codex implemented and validated this workflow-tooling change under Human
Director approval for WF-307 scope.

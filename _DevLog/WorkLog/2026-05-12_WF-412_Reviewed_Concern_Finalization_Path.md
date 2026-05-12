# WF-412 Reviewed Concern Finalization Path

## Summary

Implemented an explicit reviewed-concern finalization path for CompletionReport
`CONCERNS` results that have no blockers and no failed checks.

This closes the friction found in WF-411: a reviewed and expected large-diff
concern could not be accepted through FinalizationLog, even though it was not a
verification blocker.

## Background

WF-411 full runner validation reached `completion_review_required` with:

```text
verification_verdict: CONCERNS
completion_readiness: NEEDS_DECISION
concern: DiffAnalysis includes large-file diff.
blockers: 0
failed_checks: 0
```

The existing `accept_completion` path correctly rejected that report because it
was not ready for clean manual done review. However, there was no explicit way
to record "the concern was reviewed and accepted" while keeping blockers and
failed checks protected.

## Scope

Approved scope was limited to:

- FinalizationLog decision model
- PC Runner continue guardrails
- Auto Approval Policy and Follow-up Task Generator interpretation of accepted
  finalization
- Discord command wiring and Korean command metadata
- workflow documentation updates
- DevLog and validation

No automatic task done, automatic commit/push, release, deploy, or game
source/data change was implemented.

## Files Changed

- `tools/aiworkflow/finalization_log.ps1`
- `tools/aiworkflow/finalization_log.bat`
- `tools/aiworkflow/pc_runner.ps1`
- `tools/aiworkflow/auto_approval_policy.ps1`
- `tools/aiworkflow/follow_up_task_generator.ps1`
- `tools/aiworkflow/README.md`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/finalizationService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/09_Operational_Playbook.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Approval_History_And_Finalization_Log.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Auto_Approval_Policy.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_End_To_End_Workflow_Technical_Spec.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_End_To_End_Workflow_Technical_Spec_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Human_Director_Operation_Guide_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Unified_PC_Runner_Orchestration_Entrypoint.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Unified_PC_Runner_Orchestration_Entrypoint_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Command_Surface_Consolidation_Plan.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Command_Surface_Consolidation_Plan_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Workflow_Audit_And_Pruning_Report.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Workflow_Audit_And_Pruning_Report_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Workflow_Cleanup_Application_Report_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Reviewed_Concern_Finalization_Path.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Reviewed_Concern_Finalization_Path_KR.md`
- `_DevLog/WorkLog/2026-05-12_WF-412_Reviewed_Concern_Finalization_Path.md`

## Architecture Notes

The new decision is:

```text
accept_with_concerns
```

It maps to:

```text
completion_accepted_with_concerns_pending_task_done
```

The decision is allowed only when:

- CompletionReport exists.
- `verification_summary.verdict` is `CONCERNS`.
- `completion_state` is `needs_human_decision`.
- `human_decision_required` is true.
- at least one concern exists.
- no blockers exist.
- no failed checks exist.

`accept_completion` still requires a clean ready CompletionReport. Blocked,
failed, missing, or unrelated states remain rejected.

PC Runner `continue` now requires an accepted finalization state. It does not
continue after `request_changes`, `reject_completion`, `defer_completion`,
missing finalization, or malformed finalization.

## Implementation Notes

`finalization_log.ps1` now records reviewed concern acceptance metadata in both
ApprovalHistory and FinalizationLog:

- accepted concerns
- blocker count
- failed-check count
- guardrail text

`pc_runner.ps1` now reads the latest FinalizationLog before post-finalization
steps and stops at:

```text
finalization_not_accepted
```

unless the finalization state is one of:

```text
completion_accepted_pending_task_done
completion_accepted_with_concerns_pending_task_done
```

Discord gained:

```text
/ai finalization accept-concerns
```

## Validation Summary

Commands run:

```powershell
git status --short --branch
PowerShell parser checks for finalization_log.ps1, pc_runner.ps1, auto_approval_policy.ps1, follow_up_task_generator.ps1
node --check tools\discord-orchestrator\src\commands\ai.js
node --check tools\discord-orchestrator\src\services\finalizationService.js
node --check tools\discord-orchestrator\src\services\responseFormatter.js
tools\aiworkflow\finalization_log.bat record WF-411 accept_completion completion-wf-411-20260512-145256-277 actor_codex_app --json
tools\aiworkflow\finalization_log.bat record WF-411 request_changes completion-wf-411-20260512-145256-277 actor_codex_app --json
tools\aiworkflow\pc_runner.bat continue WF-411 --runner-run-id runner-run-wf-411-20260512-145256-277 --json
tools\aiworkflow\finalization_log.bat record WF-411 accept_with_concerns completion-wf-411-20260512-145256-277 actor_codex_app --json
tools\aiworkflow\pc_runner.bat continue WF-411 --runner-run-id runner-run-wf-411-20260512-145256-277 --json
Discord command schema smoke via buildAiCommand().toJSON()
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
git diff --check
git status --short -- _Temp _Local node_modules .env *.local.json
```

Observed results:

```text
PowerShell parser checks: passed
Node syntax checks: passed
accept_completion on WF-411 needs_human_decision report: rejected as expected
request_changes finalization: recorded
pc_runner continue after request_changes: stopped at finalization_not_accepted
accept_with_concerns finalization: recorded reviewed concern acceptance
pc_runner continue after accept_with_concerns: reached done_or_commit_decision
auto_approval_decision after continue: human_approval_required
follow_up_candidate_count after continue: 6
Discord command schema smoke: accept-concerns present
npm register: passed, /ai command registered
bot restart/status: passed, managed bot running
```

## Remaining Risks

- Live Discord slash-command invocation was not performed in-chat. Command schema
  registration and bot restart passed locally.
- `accept_with_concerns` intentionally does not make a task auto-done or
  commit-ready by itself. The manual task done and commit decision gates remain.
- WF-411 runtime artifacts under `_Temp` were updated during smoke validation;
  no `_Temp` file is tracked.

## Next Tasks

- Use the regular runner path on the first bounded game validation task,
  starting with the existing GAME-001 GameDataLoader runtime validation target.

## AI Assistance

Codex App implemented, reviewed, validated, registered the Discord command
schema, restarted the managed bot, and prepared the WF-412 commit within the
approved workflow automation scope.

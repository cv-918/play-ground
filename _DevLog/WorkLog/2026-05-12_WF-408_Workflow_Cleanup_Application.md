# WF-408 Workflow Cleanup Application

## Summary

Applied the approved non-destructive workflow cleanup after WF-407.

## Scope

- Make `/ai runner` the regular workflow surface in docs and slash metadata.
- Relabel manual bridge commands as manual escalation.
- Relabel run helpers as diagnostic/recovery commands.
- Mark `/ai intake-create` as a compatibility alias.
- Hide unsupported runner profiles from Discord choices.
- Update English and Korean workflow documents.

## Non-Goals

- No command removal.
- No command rename.
- No task lifecycle authority change.
- No automatic approval, task done, Backlog task creation, commit, or push.
- No arbitrary shell execution.
- No game source/data changes.

## Files Changed

- `_Docs/AIWorkflow/09_Operational_Playbook.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Command_Surface_Consolidation_Plan.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Command_Surface_Consolidation_Plan_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_End_To_End_Workflow_Technical_Spec.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_End_To_End_Workflow_Technical_Spec_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Human_Director_Operation_Guide_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Workflow_Cleanup_Application_Report.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Workflow_Cleanup_Application_Report_KR.md`
- `_DevLog/WorkLog/2026-05-12_WF-408_Workflow_Cleanup_Application.md`
- `tools/discord-orchestrator/README.md`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`

## Validation Plan

- JavaScript syntax check for changed Discord files.
- Slash command schema smoke for runner choices and descriptions.
- Markdown/diff whitespace check.
- Review changed docs for conflicts between English source-of-truth and Korean
  user-facing companions.
- Forbidden path check for `_Temp`, `_Local`, `node_modules`, `.env`, and local
  config files.

## Remaining Risks

- Existing command count is still large. WF-408 intentionally avoids deletion.
- Real implementation runner profile remains future work and should be handled
  as a separate approved automation task.

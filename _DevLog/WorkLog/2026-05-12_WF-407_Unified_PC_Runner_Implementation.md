# WF-407 Unified PC Runner Implementation

## Summary

Implemented the unified PC Runner orchestration entrypoint and Discord runner
command surface.

## Scope

- Add local `tools\aiworkflow\pc_runner.bat` and `pc_runner.ps1`.
- Add runner status, plan, start, continue, stop, and read commands.
- Add Discord `/ai runner` command group.
- Add Discord service and compact response formatter for runner output.
- Preserve Human Director gates for approval, finalization, task done, commit,
  and push.

## Non-Goals

- No automatic task approval.
- No automatic task done.
- No Backlog task creation.
- No commit or push automation.
- No command removal or deprecation.
- No arbitrary shell execution.
- No game source/data changes.

## Files Changed

- `_Docs/AIWorkflow/FinalBlueprint/WF_Unified_PC_Runner_Implementation_Report.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Unified_PC_Runner_Implementation_Report_KR.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md`
- `_DevLog/WorkLog/2026-05-12_WF-407_Unified_PC_Runner_Implementation.md`
- `tools/aiworkflow/README.md`
- `tools/aiworkflow/pc_runner.bat`
- `tools/aiworkflow/pc_runner.ps1`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/pcRunnerService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`

## Implementation Notes

The runner writes its own plan, run, checkpoint, and config artifacts under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/runner/
```

The validation profile coordinates existing primitives instead of replacing
them. It stops at completion review, and a separate `continue` command requires
FinalizationLog before generating AutoApprovalPolicy and FollowUpPlan artifacts.

## Validation Summary

Validation performed:

- `node --check` for changed Discord JavaScript files.
- PowerShell parser check for `pc_runner.ps1`.
- `pc_runner.bat status WF-407 --json`.
- `pc_runner.bat plan WF-407 --profile validation --json`.
- `pc_runner.bat start WF-407 --profile validation --json`.
- `pc_runner.bat read WF-407 --runner-run-id runner-run-wf-407-20260512-115750-240 --json`.
- `pc_runner.bat continue WF-407 --runner-run-id runner-run-wf-407-20260512-115750-240 --json`.
- `pc_runner.bat start WF-408 --profile validation --json` refusal smoke.
- Discord slash command builder smoke.
- `pcRunnerService` status/plan smoke.
- JSON parse check for generated WF-407 runner artifacts.
- `git diff --check`.

## Review Summary

No blocking issues were found in the implemented WF-407 scope.

## Remaining Risks

- WF-408 still needs to decide cleanup/deprecation behavior for legacy bootstrap
  and manual-escalation command surfaces.
- Runtime artifacts under `_Temp` are validation evidence only and are not
  tracked.

## Next Tasks

- WF-408 Apply approved workflow cleanup.

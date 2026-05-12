# WF-309 Follow-up Task Generator

## Summary

Implemented the WF-309 Follow-up Task Generator layer.

The layer produces reviewable FollowUpPlan artifacts from completion,
finalization, and policy evidence. It does not create Backlog tasks or mutate
workflow lifecycle state.

## Background

Phase 3 now has CompletionReport, Completion Card, ApprovalHistory,
FinalizationLog, and AutoApprovalPolicy layers. WF-309 closes the first loop by
turning unresolved evidence into candidate follow-up work for human review.

## Scope

Included:

- local Follow-up Task Generator status/generate/read commands
- runtime FollowUpPlan artifacts under `_Temp/AIWorkflowRuntime/`
- Discord `/ai follow-up status/generate/read`
- response formatting for follow-up status and candidate cards
- workflow source-of-truth documentation
- Backlog and ActiveTask state records

Excluded:

- automatic Backlog task creation
- ActiveTask selection
- task approval
- task done
- auto approval apply action
- commit/push automation
- arbitrary shell execution
- game source or data changes

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Follow_Up_Task_Generator.md`
- `_DevLog/WorkLog/2026-05-12_WF-309_Follow_Up_Task_Generator.md`
- `tools/aiworkflow/follow_up_task_generator.ps1`
- `tools/aiworkflow/follow_up_task_generator.bat`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/followUpTaskService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`

## Architecture Notes

WF-309 is a candidate-generation layer.

It reads:

- Backlog task context
- CompletionReport
- FinalizationLog
- AutoApprovalPolicy evaluation

It writes:

- `follow_up_manifest.json`
- `plans/<follow_up_plan_id>.json`
- `task_run_state.follow_up_task_generator`
- a display-only progress event

It does not write:

- Backlog task rows
- ActiveTask selection
- approval state
- done state
- auto approval application state
- git commits or pushes

## Implementation Notes

Candidates may be generated from:

- CompletionReport failed checks
- CompletionReport blockers
- CompletionReport concerns
- CompletionReport human decisions
- CompletionReport blocked states
- FinalizationLog `request_changes`, `reject_completion`, or
  `defer_completion`
- AutoApprovalPolicy blockers

Each candidate includes suggested category, priority, risk, kind, workflow path,
title, reason, validation notes, and explicit safety fields:

- `create_backlog_task = false`
- `requires_human_acceptance = true`

## Review Summary

Reviewed the implementation for boundary leaks:

- no call path to intake or task creation commands
- no call path to task approve/done commands
- no Backlog/ActiveTask lifecycle mutation in runtime command
- no auto approval apply action
- no commit/push/release/deploy path
- Discord command descriptions are Korean-facing

No critical or major issues were found during self-review.

## Validation Summary

Validation performed:

- PowerShell parser check for `follow_up_task_generator.ps1`
- `node --check` for:
  - `tools/discord-orchestrator/src/services/followUpTaskService.js`
  - `tools/discord-orchestrator/src/commands/ai.js`
  - `tools/discord-orchestrator/src/services/responseFormatter.js`
- `follow_up_task_generator.bat status WF-305-306 --json`
- `follow_up_task_generator.bat generate WF-305-306 followup-wf309-candidates-smoke --json`
- `follow_up_task_generator.bat read WF-305-306 followup-wf309-candidates-smoke --json`
- `follow_up_task_generator.bat generate WF-015 followup-wf309-no-candidates-smoke --json`
- service and response formatter smoke test
- slash command schema smoke test for `follow-up` subcommands
- generated JSON invariant checks
- `npm --prefix tools\discord-orchestrator run register`
- `tools\discord-orchestrator\restart_bot.bat`
- `tools\discord-orchestrator\status_bot.bat`
- `git diff --check`

Observed validation result:

- WF-305-306 produced follow-up candidates from blocked completion, deferred
  finalization, and auto-approval blockers.
- WF-015 fixture produced no follow-up candidates when completion was accepted,
  READY, and policy was eligible.

## Remaining Risks

No Discord live command screenshot was captured in this Codex run. Command
registration and bot restart are covered locally.

The candidate generator is conservative and may suggest redundant review items
when multiple source layers point at the same unresolved evidence.

## Next Tasks

- Review the completed Phase 2/3 execution harness loop.
- Decide the next autonomous execution hardening task before expanding any
  apply layer that mutates Backlog/ActiveTask state.

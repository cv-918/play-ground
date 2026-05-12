# WF-308 Auto Approval Policy

## Summary

Implemented the WF-308 deterministic Auto Approval Policy evaluation layer.

The layer records whether a task is a candidate for future conditional auto
approval. It does not apply approval, mark tasks done, change Backlog/ActiveTask
lifecycle state, create follow-up tasks, commit, push, release, or deploy.

## Background

WF-307 introduced ApprovalHistory and FinalizationLog records. WF-308 consumes
those records with CompletionReport and Backlog task context to provide a
traceable policy decision.

The user's operating goal is to reduce unnecessary future approvals without
giving approval authority to an LLM or to an unreviewable side effect.

## Scope

Included:

- local Auto Approval Policy status/evaluate/read commands
- runtime policy evaluation artifacts under `_Temp/AIWorkflowRuntime/`
- Discord `/ai auto-approval status/evaluate/read`
- response formatting for policy status and evaluation cards
- workflow source-of-truth documentation
- Backlog and ActiveTask state records

Excluded:

- automatic task approval
- automatic task done
- automatic Backlog/ActiveTask lifecycle changes
- Follow-up Task Generator
- commit/push automation
- arbitrary shell execution
- game source or data changes

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Auto_Approval_Policy.md`
- `_DevLog/WorkLog/2026-05-12_WF-308_Auto_Approval_Policy.md`
- `tools/aiworkflow/auto_approval_policy.ps1`
- `tools/aiworkflow/auto_approval_policy.bat`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/autoApprovalPolicyService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`

## Architecture Notes

WF-308 is an evaluate-only policy layer.

It reads:

- Backlog task context
- CompletionReport
- FinalizationLog
- linked ApprovalHistory

It writes:

- `auto_approval_policy_manifest.json`
- `evaluations/<policy_evaluation_id>.json`
- `task_run_state.auto_approval_policy`
- a display-only progress event

It does not write:

- task approval state
- task done state
- finalization logs
- follow-up tasks
- git commits or pushes

## Implementation Notes

The policy uses strict deterministic rules:

- Backlog task must exist.
- Priority must be P2 or P3.
- Kind must be documentation, validation, maintenance, automation, or workflow.
- Status must not be blocked or deferred.
- CompletionReport must allow manual done review.
- CompletionReport readiness must be READY without notes.
- FinalizationLog must record `accept_completion`.
- ApprovalHistory must be linked.

`eligible_candidate` means the task can be recorded as a candidate for future
conditional auto approval. It does not mean this command can approve it now.

For WF-308, `can_auto_approve_now` is always `false`.

## Review Summary

Reviewed the implementation for boundary leaks:

- no call path to task approve/done commands
- no Backlog/ActiveTask lifecycle mutation in runtime command
- no FinalizationLog write from policy evaluation
- no follow-up task creation
- no commit/push/release/deploy path
- Discord command descriptions are Korean-facing

No critical or major issues were found during self-review.

## Validation Summary

Validation performed:

- PowerShell parser check for `auto_approval_policy.ps1`
- `node --check` for:
  - `tools/discord-orchestrator/src/services/autoApprovalPolicyService.js`
  - `tools/discord-orchestrator/src/commands/ai.js`
  - `tools/discord-orchestrator/src/services/responseFormatter.js`
- `auto_approval_policy.bat status WF-304 --json`
- `auto_approval_policy.bat evaluate WF-304 autoeval-wf308-wf304-smoke --json`
- `auto_approval_policy.bat evaluate WF-305-306 autoeval-wf308-blocked-smoke --json`
- generated `_Temp` eligible fixture for WF-015
- `auto_approval_policy.bat evaluate WF-015 autoeval-wf308-eligible-smoke --json`
- `auto_approval_policy.bat read WF-015 autoeval-wf308-eligible-smoke --json`
- service and response formatter smoke test
- slash command schema smoke test for `auto-approval` subcommands
- `npm --prefix tools\discord-orchestrator run register`
- `tools\discord-orchestrator\restart_bot.bat`
- `tools\discord-orchestrator\status_bot.bat`
- `git diff --check`

Observed results:

- WF-304 produced `human_approval_required` because P1 remains human-controlled.
- WF-305-306 produced `human_approval_required` because evidence was blocked and
  finalization was not accepted.
- WF-015 fixture produced `eligible_candidate` while `can_auto_approve_now`
  remained `false`.
- Discord command registration passed.
- Bot restarted and reported running.
- `git diff --check` passed with line-ending warnings only.

## Remaining Risks

The policy is intentionally strict and may classify some safe work as
`human_approval_required` until more historical rules are added.

No Discord live command screenshot was captured in this Codex run. Command
registration and bot restart passed locally.

## Next Tasks

- WF-309 Implement Follow-up Task Generator.

WF-309 may read AutoApprovalPolicy evaluations, but it must not create or
approve follow-up tasks automatically unless that scope is explicitly approved.

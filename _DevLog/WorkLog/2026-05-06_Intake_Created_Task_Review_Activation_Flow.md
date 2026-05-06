# 2026-05-06 Intake-Created Task Review Activation Flow

## Summary

Implemented WF-043: a read-only Discord review command for intake-created
Backlog tasks.

## Background

WF-040 added `/ai intake`, WF-041 added Task Draft output, and WF-042 added
explicit `/ai intake-create` Backlog task creation. WF-043 adds a review step
before the human decides whether to activate or approve a created task.

## Scope

- Add `/ai task review-intake id:<task_id>`.
- Read Backlog task data by id.
- Detect intake-created markers when present.
- Provide a generic activation review for non-intake Backlog tasks.
- Reuse role router recommendation logic.
- Do not write Backlog.md or ActiveTask.md.
- Do not approve, set active, mark done, execute Codex, execute agents, commit,
  or push.

## Files Changed

- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/intakeTaskReviewService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/Discord_Task_Intake_Command.md`
- `_Docs/AIWorkflow/Intake_Created_Task_Review_Activation_Flow.md`
- `_Docs/AIWorkflow/README.md`
- `_DevLog/WorkLog/2026-05-06_Intake_Created_Task_Review_Activation_Flow.md`

## Implementation Notes

`intakeTaskReviewService` uses `taskService.getBacklogTaskById` for lookup and
`roleRouterService.getRoleRouterRecommendationForTask` for roles, gates,
validation, execution route, path reminders, and verdict guidance.

The review command only suggests manual commands:

```text
/ai task set-active id:<task_id>
/ai task approve id:<task_id> note:"..."
/ai prepare goal id:<task_id> mode:analysis context:standard
```

It does not execute those commands.

## Validation Summary

Validation should confirm JavaScript syntax, Discord command registration, bot
restart/status, read-only local mock behavior for intake and non-intake task
ids, clear unknown-id errors, and Git safety checks.

## Remaining Risks

- Discord UI smoke testing is required after registration.
- Activation readiness is advisory only; the Human Director must still decide
  whether to approve or set active.

## Commit Guidance

Do not commit until the Discord smoke test and Git diff review pass.

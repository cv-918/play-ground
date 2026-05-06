# 2026-05-06 Intake Approval Task Creation Flow

## Summary

Implemented WF-042: explicit intake-to-task creation for the Discord
AIWorkflow orchestrator.

## Background

WF-040 added read-only `/ai intake` suggestions. WF-041 added Task Draft output.
WF-042 adds a human-invoked creation command while preserving approval and
ActiveTask boundaries.

## Scope

- Keep `/ai intake` read-only.
- Add `/ai intake-create text:<request>` as the explicit write command.
- Reuse intake classification and Task Draft fields.
- Append a Backlog row through `taskService`.
- Do not update ActiveTask, approve the task, execute agents, execute Codex CLI,
  commit, or push.

## Files Changed

- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/intakeTaskCreationService.js`
- `tools/discord-orchestrator/src/services/taskService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/Discord_Task_Intake_Command.md`
- `_Docs/AIWorkflow/Intake_Approval_Task_Creation_Flow.md`
- `_Docs/AIWorkflow/README.md`
- `_DevLog/WorkLog/2026-05-06_Intake_Approval_Task_Creation_Flow.md`

## Implementation Notes

Discord cannot register both `/ai intake text:<...>` and
`/ai intake create text:<...>` with the same `intake` option name. The approved
reduced-scope command is `/ai intake-create text:<...>`.

`intakeTaskCreationService` bridges classification to Backlog creation. The
Backlog append, markdown pipe escaping, table preservation, backup creation, and
write-path checks remain owned by `taskService`.

`taskService.createTask` now accepts optional `toolRoute` and `validation`
fields so intake-created tasks can record draft risk and workflow path in the
Backlog validation column.

## Validation Summary

Validation must include JavaScript syntax checks, Discord command registration,
bot restart/status, local mock checks for Backlog append and ActiveTask
immutability, and Git safety checks.

Build or runtime game validation is not applicable because no game source or
game data files are in scope.

## Remaining Risks

- Discord validation must confirm `/ai intake-create` is visible after command
  registration.
- The local mock creation intentionally appends a Backlog row; that row should be
  reviewed as part of the WF-042 diff before committing.

## Commit Guidance

Do not commit until command registration, bot status, local mock validation, and
Git diff review pass.

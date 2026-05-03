# 2026-05-04 Discord Task Status Commands

## Summary

Implemented Release C / WF-023 Discord task status commands:

```text
/ai task approve
/ai task block
/ai task defer
/ai task done
```

## Background

Release B added Discord task visibility, task creation, and active task selection. Release C adds controlled workflow document writes for human approval/status notes without adding execution, build, commit, push, release, computer-use, project-selection writes, or safe script execution.

## Scope

Changed:

```text
tools/discord-orchestrator/src/commands/ai.js
tools/discord-orchestrator/src/services/taskService.js
tools/discord-orchestrator/src/services/responseFormatter.js
tools/discord-orchestrator/README.md
_Docs/AIWorkflow/Discord_Task_Management_Commands.md
_Docs/AIWorkflow/Discord_Task_Status_Commands.md
_DevLog/WorkLog/2026-05-04_Discord_Task_Status_Commands.md
```

Not changed:

```text
game source code
_Local/
node_modules/
_Temp/ except runtime backups produced by bot commands
```

## Architecture Notes

Command registration and routing remain in `commands/ai.js`.

Backlog and ActiveTask read/write behavior remains in `services/taskService.js`.

Discord response text remains in `services/responseFormatter.js`.

The status transition implementation updates only the matching Backlog row's Status and Validation cells. It updates ActiveTask metadata and the Latest Status Note section only when the target id matches the current ActiveTask metadata task_id.

## Implementation Notes

Task ids are validated with:

```text
^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$
```

Status commands create timestamped backups before writing:

```text
_Temp/AIWorkflowDiscordBot/backups/Backlog_YYYYMMDD_HHMMSS.md
_Temp/AIWorkflowDiscordBot/backups/ActiveTask_YYYYMMDD_HHMMSS.md
```

Markdown table pipe characters are escaped by the table row formatter when the updated row is written.

## Review Summary

Review focus:

```text
allowed write paths
Backlog table preservation
ActiveTask metadata update
Latest Status Note upsert behavior
Discord response clarity
absence of execution/commit/build/release behavior
```

## Validation Summary

Live Discord validation passed on 2026-05-04.

Validation setup:

```bat
cd /d C:\Users\kalux\workStation\play-ground
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
```

Validated commands and results:

```text
/ai task create: passed
created validation task id WF-20260504-005850: passed
/ai task set-active id:WF-20260504-005850: passed
/ai task approve id:WF-20260504-005850: passed
/ai task current after approve status ready_for_implementation: passed
/ai task block id:WF-20260504-005850: passed
/ai task current after block status blocked: passed
/ai task defer id:WF-20260504-005850: passed
/ai task current after defer status deferred: passed
/ai task done id:WF-20260504-005850: passed
/ai task current after done status done: passed
/ai task list: passed
/ai status: passed
/ai active: passed
git diff --check: passed
private files not tracked: passed
```

## Remaining Risks

Backlog and ActiveTask writes are sequential file writes, not transactional multi-file writes.

Discord slash command registration and bot restart require the local Discord configuration and token, which must not be printed or committed.

## Next Tasks

Release D / WF-024 should implement Discord safe script execution commands after the status command writes remain stable.

Alternative next task: WF-021, harden Discord bot Node warnings and commandRunner shell usage.

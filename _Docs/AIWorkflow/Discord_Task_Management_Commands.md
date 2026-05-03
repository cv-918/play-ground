# Discord Task Management Commands

## Purpose

Release B adds limited Discord task management commands under:

```text
/ai task
```

These commands support workflow task visibility, Backlog task creation, and ActiveTask selection.

Release C adds controlled status note commands for approval, blocking, deferral, and completion.

For the dedicated Release C command reference, see:

```text
Discord_Task_Status_Commands.md
```

---

## Safety Scope

Allowed writes:

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Temp/AIWorkflowDiscordBot/backups/
```

Forbidden operations:

```text
- Do not write `_Local/`.
- Do not write `node_modules/`.
- Do not modify game source code.
- Do not execute arbitrary shell commands.
- Do not expose or print the Discord bot token.
- Do not implement run/codex/computer-use/build/test/commit/push/release commands.
```

---

## Commands

### `/ai task current`

Reads:

```text
_Docs/AIWorkflow/ActiveTask.md
```

Shows:

```text
task_id
title
status
priority
risk_level
workflow_path
next recommended task, if present
```

This command is read-only.

### `/ai task list`

Reads:

```text
_Docs/AIWorkflow/Backlog.md
```

Shows top open tasks with:

```text
ID
priority
status
kind
item/title
```

Optional filters:

```text
status
kind
```

This command is read-only.

### `/ai task create`

Writes one new row to:

```text
_Docs/AIWorkflow/Backlog.md
```

Required option:

```text
title
```

Optional options:

```text
category: WF | GAME | DOC | VAL | UNITY
priority: P0 | P1 | P2 | P3
kind: automation | implementation | documentation | validation | maintenance | game
reason
```

Defaults:

```text
category = WF
priority = P2
kind = automation
status = todo
reason = Created from Discord task command
tool route = Discord -> human review
validation = pending
```

Before writing, the bot creates:

```text
_Temp/AIWorkflowDiscordBot/backups/Backlog_YYYYMMDD_HHMMSS.md
```

Task ID format:

```text
<CATEGORY>-YYYYMMDD-HHMMSS
```

### `/ai task set-active`

Required option:

```text
id
```

The bot validates `id` with:

```text
^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$
```

It finds the matching Backlog row and writes:

```text
_Docs/AIWorkflow/ActiveTask.md
```

Before writing, the bot creates:

```text
_Temp/AIWorkflowDiscordBot/backups/ActiveTask_YYYYMMDD_HHMMSS.md
```

Release B does not automatically update the Backlog row status.

### `/ai task approve`

Required option:

```text
id
```

Optional option:

```text
note
```

The bot updates the matching Backlog row:

```text
Status = ready_for_implementation
Validation = approved: <note>
```

If `note` is omitted:

```text
Validation = approved: approved from Discord
```

If the task is the current ActiveTask, the bot also updates ActiveTask metadata status and the Latest Status Note section.

### `/ai task block`

Required options:

```text
id
reason
```

The bot updates the matching Backlog row:

```text
Status = blocked
Validation = blocked: <reason>
```

If the task is the current ActiveTask, the bot also updates ActiveTask metadata status and the Latest Status Note section.

### `/ai task defer`

Required option:

```text
id
```

Optional option:

```text
reason
```

The bot updates the matching Backlog row:

```text
Status = deferred
Validation = deferred: <reason>
```

If `reason` is omitted:

```text
Validation = deferred: deferred from Discord
```

If the task is the current ActiveTask, the bot also updates ActiveTask metadata status and the Latest Status Note section.

### `/ai task done`

Required option:

```text
id
```

Optional option:

```text
evidence
```

The bot updates the matching Backlog row:

```text
Status = done
Validation = done: <evidence>
```

If `evidence` is omitted:

```text
Validation = done: done from Discord
```

If the task is the current ActiveTask, the bot also updates ActiveTask metadata status and the Latest Status Note section.

All four status commands validate `id` with:

```text
^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$
```

All four status commands create a timestamped Backlog backup before writing:

```text
_Temp/AIWorkflowDiscordBot/backups/Backlog_YYYYMMDD_HHMMSS.md
```

If ActiveTask.md is updated, they also create:

```text
_Temp/AIWorkflowDiscordBot/backups/ActiveTask_YYYYMMDD_HHMMSS.md
```

Markdown table pipe characters in status notes are escaped before the updated row is written.

---

## Architecture Notes

Responsibilities are separated as follows:

```text
commands/ai.js
  Discord command registration and routing

services/taskService.js
  Backlog and ActiveTask read/write logic, backup creation, task ID validation, status transitions

services/responseFormatter.js
  Discord response formatting
```

Markdown table updates are intentionally limited to appending one Backlog row or updating one matching Backlog row. Existing unrelated sections are preserved.

---

## Validation Commands

Run from repository root:

```bat
cd /d C:\Users\kalux\workStation\play-ground
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
```

Discord validation:

```text
/ai task current
/ai task list
/ai task create title:"Test Discord task management command" category:WF priority:P2 kind:automation reason:"Release B validation"
/ai task list
/ai task set-active id:<created task id>
/ai task current
/ai status
/ai active
```

Release C Discord validation:

```text
/ai task create title:"Test Discord approval and status commands" category:WF priority:P2 kind:automation reason:"Release C validation"
/ai task set-active id:<created task id>
/ai task approve id:<created task id> note:"Release C approve validation"
/ai task current
/ai task block id:<created task id> reason:"Release C block validation"
/ai task current
/ai task defer id:<created task id> reason:"Release C defer validation"
/ai task current
/ai task done id:<created task id> evidence:"Release C done validation"
/ai task current
/ai task list
/ai status
/ai active
```

Git validation:

```bat
git status --short
git diff --check
git diff --stat
```

---

## Acceptance Criteria

```text
[ ] Slash command registration succeeds.
[ ] Bot restarts successfully.
[ ] /ai task current works.
[ ] /ai task list works.
[ ] /ai task create appends one valid backlog row.
[ ] /ai task create creates a backup before writing.
[ ] /ai task set-active updates ActiveTask.md.
[ ] /ai task set-active creates a backup before writing.
[ ] /ai task approve updates Backlog status to ready_for_implementation.
[ ] /ai task block updates Backlog status to blocked.
[ ] /ai task defer updates Backlog status to deferred.
[ ] /ai task done updates Backlog status to done.
[ ] Status commands update ActiveTask.md when the target task is active.
[ ] Status commands create backups before Backlog.md and ActiveTask.md writes.
[ ] /ai task current reflects the new active task.
[ ] /ai status and /ai active still work.
[ ] _Local/, node_modules/, _Temp/, .env, discord_bot.local.json are not tracked or staged.
[ ] git diff --check passes.
```

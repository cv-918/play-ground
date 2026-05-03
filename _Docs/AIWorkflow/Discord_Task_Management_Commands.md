# Discord Task Management Commands

## Purpose

Release B adds limited Discord task management commands under:

```text
/ai task
```

These commands support workflow task visibility, Backlog task creation, and ActiveTask selection.

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
- Do not implement approval/block/done/run/codex/computer-use commands in Release B.
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

---

## Architecture Notes

Responsibilities are separated as follows:

```text
commands/ai.js
  Discord command registration and routing

services/taskService.js
  Backlog and ActiveTask read/write logic, backup creation, task ID validation

services/responseFormatter.js
  Discord response formatting
```

Markdown table updates are intentionally limited to appending one Backlog row. Existing sections are preserved.

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
[ ] /ai task current reflects the new active task.
[ ] /ai status and /ai active still work.
[ ] _Local/, node_modules/, _Temp/, .env, discord_bot.local.json are not tracked or staged.
[ ] git diff --check passes.
```

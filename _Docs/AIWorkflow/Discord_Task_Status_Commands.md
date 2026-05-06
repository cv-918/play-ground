# Discord Task Status Commands

## Purpose

Release C / WF-023 adds controlled Discord writes for workflow task status transitions.
WF-045 enhances `/ai task approve` responses with approval safety guidance.

The commands are available under:

```text
/ai task
```

They update workflow documents only. They do not execute implementation, Codex, Copilot, scripts, builds, tests, commits, pushes, or releases.

---

## Allowed Writes

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Temp/AIWorkflowDiscordBot/backups/
```

Forbidden write targets include:

```text
_Local/
node_modules/
_Temp/ except AIWorkflowDiscordBot backup output
game source code
.env
discord_bot.local.json
```

---

## Shared Rules

All status commands require a Backlog task id matching:

```text
^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$
```

Each command finds the matching row in:

```text
_Docs/AIWorkflow/Backlog.md
```

Before writing Backlog.md, the bot creates:

```text
_Temp/AIWorkflowDiscordBot/backups/Backlog_YYYYMMDD_HHMMSS.md
```

If the target task is the current ActiveTask task_id, the bot also updates:

```text
_Docs/AIWorkflow/ActiveTask.md
```

Before writing ActiveTask.md, the bot creates:

```text
_Temp/AIWorkflowDiscordBot/backups/ActiveTask_YYYYMMDD_HHMMSS.md
```

The Backlog table format is preserved. Only the matching row's Status and Validation cells are updated.

Status notes are stored in the existing Validation column. Markdown table pipe characters are escaped when the row is written.

---

## Commands

### `/ai task approve`

Required option:

```text
id
```

Optional option:

```text
note
```

Backlog update:

```text
Status = ready_for_implementation
Validation = approved: <note>
```

Default note:

```text
approved from Discord
```

WF-045 response contract:

```text
1. Task Status Updated
2. Task Summary
3. Approval Summary
4. Recommended Roles
5. Human Decision Gates
6. Required Validation
7. Suggested Execution Route
8. Safety Note
9. Next Recommended Commands
```

The next commands are suggestions only. The bot does not execute them:

```text
/ai role status
/ai prepare goal id:<task_id> mode:analysis context:standard
/ai prepare goal id:<task_id> mode:implementation context:standard
/ai status
/ai active
```

Approval records Human Director scope acceptance only. It does not execute
Codex CLI, execute agents, implement changes, mark the task done, commit, push,
or modify game source code.

### `/ai task block`

Required options:

```text
id
reason
```

Backlog update:

```text
Status = blocked
Validation = blocked: <reason>
```

### `/ai task defer`

Required option:

```text
id
```

Optional option:

```text
reason
```

Backlog update:

```text
Status = deferred
Validation = deferred: <reason>
```

Default reason:

```text
deferred from Discord
```

### `/ai task done`

Required option:

```text
id
```

Optional option:

```text
evidence
```

Backlog update:

```text
Status = done
Validation = done: <evidence>
```

Default evidence:

```text
done from Discord
```

---

## ActiveTask Sync

When the target id equals ActiveTask metadata `task_id`, the bot updates:

```text
status
last_updated
```

It also adds or replaces:

```text
## Latest Status Note
```

The note records:

```text
status
note
updated_at
source
```

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
1. /ai task create
   title: Test Discord approval and status commands
   category: WF
   priority: P2
   kind: automation
   reason: Release C validation

2. /ai task set-active id:<created task id>

3. /ai task approve id:<created task id> note:"Release C approve validation"

4. /ai task current

5. /ai task block id:<created task id> reason:"Release C block validation"

6. /ai task current

7. /ai task defer id:<created task id> reason:"Release C defer validation"

8. /ai task current

9. /ai task done id:<created task id> evidence:"Release C done validation"

10. /ai task current

11. /ai task list

12. /ai status

13. /ai active
```

Git validation:

```bat
git status --short
git diff --check
git diff --stat
```

---

## Expected Result

```text
[x] Slash command registration succeeds.
[x] Bot restarts successfully.
[x] /ai task approve updates Backlog status to ready_for_implementation.
[x] /ai task approve response includes approval safety guidance.
[x] /ai task block updates Backlog status to blocked.
[x] /ai task defer updates Backlog status to deferred.
[x] /ai task done updates Backlog status to done.
[x] If target task is current ActiveTask, ActiveTask status is updated.
[x] Backups are created before Backlog.md and ActiveTask.md writes.
[x] /ai task current reflects the latest status.
[x] /ai status and /ai active still work.
[x] _Local/, node_modules/, _Temp/, .env, discord_bot.local.json are not tracked or staged.
[x] git diff --check passes.
```

---

## Validation Result

Release C live Discord validation passed on 2026-05-04.

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

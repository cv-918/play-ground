# Discord AIWorkflow Bot

## Purpose

This is the Discord adapter for the AIWorkflow system.

The original v1 command set is read-only. Release B adds limited task management writes.
Release C adds controlled task status note writes.

It can read:

```text
read workflow status
read active task
read backlog summary
read project profiles
format Discord responses
```

It can write only:

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Temp/AIWorkflowDiscordBot/backups/
```

It must not:

```text
edit source
edit game source code
edit _Local/
edit node_modules/
run Copilot
run Codex write mode
run build
run game/runtime
implement run/codex/computer-use/build/test/commit/push/release commands
commit
push
release
delete files
```

---

## Requirements

```text
Node.js 22.12.0 or newer
npm
Discord application + bot token
Private Discord server/channel for testing
```

---

## Local Config

Create this file manually:

```text
_Local/AIWorkflow/discord_bot.local.json
```

Use `config.example.json` as the template.

Do not commit `_Local/`.

---

## Supported Commands

```text
/ai status
/ai active
/ai backlog
/ai next
/ai blockers
/ai docs
/ai project list
/ai project profile
/ai task current
/ai task list
/ai task create
/ai task set-active
/ai task approve
/ai task block
/ai task defer
/ai task done
```

For project profile:

```text
/ai project profile
/ai project profile id:dustland_custom_cpp_prototype
/ai project profile id:unity_project_template
```

Default behavior:

```text
/ai project profile
```

uses:

```text
_Docs/AIWorkflow/ActiveProject.json
```

Explicit `id:` overrides the active project selector for that request only.

For task commands:

```text
/ai task current
/ai task list
/ai task list status:todo
/ai task list kind:automation
/ai task create title:"Test Discord task management command" category:WF priority:P2 kind:automation reason:"Release B validation"
/ai task set-active id:WF-20260503-231500
/ai task approve id:WF-20260503-231500 note:"Approval note"
/ai task block id:WF-20260503-231500 reason:"Block reason"
/ai task defer id:WF-20260503-231500 reason:"Defer reason"
/ai task done id:WF-20260503-231500 evidence:"Validation evidence"
```

See:

```text
_Docs/AIWorkflow/Discord_Task_Management_Commands.md
_Docs/AIWorkflow/Discord_Task_Status_Commands.md
```

---

## Validation

After starting the bot:

```text
[ ] Unauthorized user is rejected.
[ ] Unauthorized channel is rejected.
[ ] /ai status works.
[ ] /ai active works.
[ ] /ai backlog works.
[ ] /ai next works.
[ ] /ai project list works.
[ ] /ai project profile shows Source: ActiveProject.json.
[ ] /ai project profile id:unity_project_template shows Source: explicit project id.
[ ] /ai task current works.
[ ] /ai task list works.
[ ] /ai task create appends one Backlog.md row and creates a backup.
[ ] /ai task set-active updates ActiveTask.md and creates a backup.
[ ] /ai task approve updates Backlog.md and creates a backup.
[ ] /ai task block updates Backlog.md and creates a backup.
[ ] /ai task defer updates Backlog.md and creates a backup.
[ ] /ai task done updates Backlog.md and creates a backup.
[ ] Status commands update ActiveTask.md when the target task is active.
[ ] Git status remains unchanged after commands.
```

---

## Always-On Windows Operation

For background local operation, use the wrapper commands:

```bat
start_bot.bat
status_bot.bat
restart_bot.bat
stop_bot.bat
```

Optional Windows Scheduled Task install/uninstall wrappers are also available:

```bat
install_startup_task.bat
uninstall_startup_task.bat
```

See:

```text
_Docs/AIWorkflow/Discord_Bot_Always_On_Guide.md
```

---

## Notes

This bot runs local scripts:

```text
tools/aiworkflow/workflow_status.bat --json
tools/aiworkflow/project_profile_status.bat --json
tools/aiworkflow/project_profile_status.bat --project <id> --json
```

It does not execute arbitrary shell commands.

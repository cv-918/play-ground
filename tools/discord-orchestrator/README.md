# Discord AIWorkflow Bot

## Purpose

This is the Discord adapter for the AIWorkflow system.

The original v1 command set is read-only. Release B adds limited task management writes.
Release C adds controlled task status note writes. Release D adds allowlisted workflow
script execution commands. Release E adds Codex App prompt package generation.

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
_Temp/AIWorkflowReports/
_Temp/AIWorkflowDiffs/
_Temp/AIWorkflowTaskRequests/
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
run arbitrary shell commands
expose direct npm/git/codex/copilot/build/test/computer-use/commit/push/release commands
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
/ai run workflow-status
/ai run active-project
/ai run project-profile
/ai run json-smoke
/ai run capture-diff
/ai prepare codex
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
_Docs/AIWorkflow/Discord_Safe_Script_Execution_Commands.md
_Docs/AIWorkflow/Discord_Codex_Task_Routing_Commands.md
```

For safe script execution:

```text
/ai run workflow-status
/ai run active-project
/ai run project-profile
/ai run project-profile id:unity_project_template
/ai run json-smoke
/ai run capture-diff
```

`/ai run capture-diff include-untracked:true` is available but should be used only
when intentionally approved because the underlying script may mark untracked files
with intent-to-add.

For Codex prompt preparation:

```text
/ai prepare codex
/ai prepare codex id:GAME-001 mode:analysis context:standard
/ai prepare codex id:GAME-002 mode:implementation context:standard
/ai prepare codex id:WF-021 mode:review context:compact
```

`/ai prepare codex` writes a manual Codex App prompt markdown file under:

```text
_Temp/AIWorkflowTaskRequests/
```

It does not execute Codex, Copilot, computer-use, build/test commands, commits,
pushes, or releases.

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
[ ] /ai run workflow-status works.
[ ] /ai run active-project works.
[ ] /ai run project-profile works.
[ ] /ai run project-profile id:unity_project_template works.
[ ] /ai run json-smoke works.
[ ] /ai run capture-diff works.
[ ] /ai prepare codex works with ActiveTask.md default.
[ ] /ai prepare codex id:GAME-001 mode:analysis context:standard works.
[ ] /ai prepare codex id:GAME-002 mode:implementation context:standard works.
[ ] /ai prepare codex id:WF-021 mode:review context:compact works.
[ ] Generated Codex prompt files are created under _Temp/AIWorkflowTaskRequests/.
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
tools/aiworkflow/active_project_status.bat --json
tools/aiworkflow/project_profile_status.bat --json
tools/aiworkflow/project_profile_status.bat --project <id> --json
tools/aiworkflow/json_smoke_check.bat
tools/aiworkflow/capture_diff.bat
```

It does not execute arbitrary shell commands.

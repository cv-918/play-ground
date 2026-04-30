# Discord Bot v1 Operation Guide

## 1. Purpose

This guide defines the daily operation procedure for Discord Read-Only Bot v1.

The bot is currently a read-only remote visibility layer for AIWorkflow.

It is not an implementation agent.
It is not a commit bot.
It is not a build runner.
It is not a release tool.

---

## 2. Current Capability

Discord Bot v1 can answer:

```text
current workflow status
active task
backlog summary
next recommended action
project profile list
active project profile
explicit project profile
key workflow document paths
```

Supported commands:

```text
/ai status
/ai active
/ai backlog
/ai next
/ai blockers
/ai docs
/ai project list
/ai project profile
/ai project profile id:unity_project_template
```

---

## 3. Required Local State

The bot depends on the local repository and local scripts.

Required files:

```text
_Docs/AIWorkflow/ProjectStatus.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/ActiveProject.json
_Docs/AIWorkflow/ProjectProfiles/*.json
tools/aiworkflow/workflow_status.bat
tools/aiworkflow/project_profile_status.bat
tools/aiworkflow/active_project_status.bat
tools/discord-orchestrator/
```

Private local files:

```text
_Local/AIWorkflow/discord_bot.local.json
```

Environment variable:

```text
AIWORKFLOW_DISCORD_BOT_TOKEN
```

---

## 4. Start Procedure

From a new CMD:

```bat
cd /d C:\Users\kalux\workStation\play-ground\tools\discord-orchestrator
npm start
```

Expected console output:

```text
[OK] Discord AIWorkflow bot logged in as ...
[INFO] Read-only mode: enabled
```

The CMD window must remain open.

If the CMD window is closed, the bot stops.

---

## 5. Daily Status Check

In Discord, run:

```text
/ai status
```

Use this to check:

```text
workflow level
active task
task status
top backlog items
git dirty state
```

Then run:

```text
/ai active
/ai next
```

Use this to decide the next human action.

---

## 6. Project Profile Check

Default active project:

```text
/ai project profile
```

Expected source:

```text
Source: ActiveProject.json
```

Explicit Unity template check:

```text
/ai project profile id:unity_project_template
```

Expected source:

```text
Source: explicit project id
```

If `/ai project profile` does not show `Source: ActiveProject.json`, the Discord bot or project profile scripts are out of sync.

---

## 7. Before Starting Work

Recommended pre-work sequence:

```text
/ai status
/ai active
/ai project profile
```

Then locally run if needed:

```bat
tools\aiworkflow\status.bat
tools\aiworkflow\workflow_status.bat
tools\aiworkflow\active_project_status.bat
```

Use Discord for visibility.
Use local scripts for detailed validation.
Use Git for final review.

---

## 8. After Completing Work

Recommended post-work sequence:

```bat
git status --short
git diff --check
git diff --stat
```

Then update workflow state files:

```text
ActiveTask.md
Backlog.md
ProjectStatus.md if the change affects project/workflow state
```

Then Discord check:

```text
/ai status
/ai active
/ai backlog
/ai next
```

Commit only after state files match the actual work.

---

## 9. Safety Rules

Discord Bot v1 must remain read-only.

Forbidden:

```text
file writes from Discord
source edits from Discord
workflow document edits from Discord
build/test execution from Discord
Copilot execution from Discord
commit from Discord
push from Discord
release from Discord
store upload from Discord
```

Allowed:

```text
read local workflow state
run read-only status scripts
format Discord responses
```

---

## 10. Secret Handling

Never commit:

```text
_Local/
node_modules/
.env
.env.local
discord_bot.local.json
Discord bot token
```

Recommended check:

```bat
git status --short
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Expected result for `git ls-files`:

```text
no output
```

If a token was exposed:

```text
reset token immediately in Discord Developer Portal
update AIWORKFLOW_DISCORD_BOT_TOKEN
restart CMD
restart bot
```

---

## 11. Normal Shutdown

In the bot CMD window:

```text
Ctrl + C
```

This stops the bot.

No repository files should change from shutting down the bot.

---

## 12. Known Limitations

Discord Bot v1 does not:

```text
modify ActiveProject.json
approve tasks
change Backlog.md
capture diffs
run validation scripts from Discord
run builds
start game runtime
trigger Copilot/Codex
commit or push
```

These are later-stage workflow capabilities.

---

## 13. Recommended Expansion Order

Recommended order:

```text
1. Read-only visibility
2. Active project selection visibility
3. Approval note design
4. Safe script execution design
5. Controlled validation execution
6. Agent-routing prompt generation
7. Build/test support
8. Release support
```

Do not skip directly to implementation automation.

---

## 14. Troubleshooting Quick Reference

If slash command is missing:

```bat
npm run register
```

If bot does not start:

```bat
echo %AIWORKFLOW_DISCORD_BOT_TOKEN%
npm start
```

If token is invalid:

```text
Reset token in Discord Developer Portal.
Set AIWORKFLOW_DISCORD_BOT_TOKEN again.
Open a new CMD.
```

If `/ai project profile` is wrong:

```bat
tools\aiworkflow\active_project_status.bat
tools\aiworkflow\project_profile_status.bat --json
```

If Discord output is stale:

```text
Check ActiveTask.md and Backlog.md.
The bot only reports what the state files currently say.
```

---

## 15. Completion Criteria

This operation guide is valid when:

```text
[ ] Discord Bot v1 start procedure is documented.
[ ] Daily usage commands are documented.
[ ] Safety rules are documented.
[ ] Secret handling is documented.
[ ] Troubleshooting path is documented.
[ ] README.md Document Map includes this guide.
[ ] Backlog.md marks WF-018 done.
```

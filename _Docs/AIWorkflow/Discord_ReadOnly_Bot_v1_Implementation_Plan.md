# Discord Read-Only Bot v1 Implementation Plan

## 1. Purpose

This document converts `Discord_ReadOnly_Bot_v1_Spec.md` into an implementation plan.

This is not the bot implementation itself.

The goal is to define a safe, minimal, local-first Discord Bot v1 that exposes AI workflow status remotely without modifying the repository.

---

## 2. v1 Scope

Discord Bot v1 is read-only.

Allowed:

```text
read workflow state
read project profiles
run read-only local scripts
format status summaries
send Discord responses
```

Forbidden:

```text
write files
edit source
edit docs
run Copilot
run Codex write mode
run build
run game
commit
push
release
store upload
delete files
```

---

## 3. Runtime Deployment Model

Use:

```text
Local PC Bot
```

The bot runs on the developer workstation where the repository exists.

Reason:

```text
The workflow state, uncommitted diffs, and local scripts currently live on the local PC.
A VPS bot would not see uncommitted local work.
```

Future server/VPS deployment can be considered after repository sync policy is defined.

---

## 4. Recommended Tech Stack

Recommended v1 stack:

```text
Language: Node.js
Discord library: discord.js
Runtime: local terminal process
Config: local ignored JSON file
Execution: child_process spawn/execFile
```

Reason:

```text
discord.js has stable slash command support.
Node.js is sufficient for command routing and script invocation.
The bot does not need complex backend infrastructure in v1.
```

Alternative:

```text
Python + discord.py
```

Acceptable, but Node.js is recommended for Discord slash command ergonomics.

---

## 5. Folder Structure

Recommended local folder structure:

```text
tools/discord-orchestrator/
  package.json
  src/
    index.js
    config.js
    commands/
      status.js
      active.js
      backlog.js
      next.js
      blockers.js
      docs.js
      project.js
    services/
      commandRunner.js
      workflowStatusService.js
      projectProfileService.js
      responseFormatter.js
    safety/
      authorization.js
      commandAllowlist.js
  README.md
```

Local private config:

```text
_Local/AIWorkflow/discord_bot.local.json
```

This config must not be committed.

---

## 6. Local Config Template

Required config fields:

```json
{
  "discord_token_env": "AIWORKFLOW_DISCORD_BOT_TOKEN",
  "client_id": "",
  "guild_id": "",
  "repo_root": "C:/Users/kalux/workStation/play-ground",
  "default_project_id": "dustland_custom_cpp_prototype",
  "allowed_user_ids": [],
  "allowed_channel_ids": [],
  "scripts": {
    "workflow_status_json": "tools/aiworkflow/workflow_status.bat --json",
    "project_profile_list": "tools/aiworkflow/project_profile_status.bat --list",
    "project_profile_json": "tools/aiworkflow/project_profile_status.bat --json"
  }
}
```

Token must be read from environment variable, not from committed config.

---

## 7. Command Set

Implement v1 commands:

```text
/ai status
/ai active
/ai backlog
/ai next
/ai blockers
/ai project list
/ai project profile
/ai docs
```

Do not implement approval/write/build commands in v1.

---

## 8. Command Mapping

| Discord Command | Local Source | Output |
|---|---|---|
| `/ai status` | `workflow_status.bat --json` | compact overall summary |
| `/ai active` | `workflow_status.bat --json` | active task only |
| `/ai backlog` | `workflow_status.bat --json` | top backlog items |
| `/ai next` | `workflow_status.bat --json` | next recommended task/action |
| `/ai blockers` | `workflow_status.bat --json` | blocked count/items if available |
| `/ai project list` | `project_profile_status.bat --list` | available project profiles |
| `/ai project profile` | `project_profile_status.bat --project <id> --json` | profile summary |
| `/ai docs` | static paths | key doc paths |

---

## 9. Authorization

Every command must check:

```text
user ID is allowed
channel ID is allowed
```

Unauthorized command result:

```text
Not authorized.
```

Do not reveal local paths or workflow state to unauthorized users.

---

## 10. Command Execution Safety

Use only predeclared command entries.

Do not allow arbitrary command strings from Discord.

Safe pattern:

```text
Discord command
-> internal command key
-> fixed script path + fixed arguments
-> spawn/execFile
-> parse output
-> format response
```

Do not pass user input into shell commands except validated project ID from known profile list.

For project ID:

```text
allow only [A-Za-z0-9_-]
```

---

## 11. Response Formatting Rules

Discord responses should be concise.

Default max:

```text
10-20 lines
```

Use:

```text
status headline
active task
next action
top backlog
dirty state
```

Avoid dumping full JSON by default.

For long results:

```text
summarize
or attach as text file later
```

Attachments can be deferred until v2.

---

## 12. Error Handling

If script execution fails, respond with:

```text
Command failed.
Script:
Exit code:
Short error:
Next action:
```

Do not retry automatically.

Common failure cases:

```text
repo path missing
PowerShell execution issue
state file missing
project profile missing
invalid JSON
unauthorized user
unauthorized channel
```

---

## 13. Local Script Dependencies

The bot depends on these scripts:

```text
tools/aiworkflow/workflow_status.bat
tools/aiworkflow/workflow_status.ps1
tools/aiworkflow/project_profile_status.bat
tools/aiworkflow/project_profile_status.ps1
```

Before implementing the bot, confirm:

```bat
tools\aiworkflow\workflow_status.bat --json
tools\aiworkflow\project_profile_status.bat --list
tools\aiworkflow\project_profile_status.bat --project unity_project_template --json
```

---

## 14. Environment Variables

Required:

```text
AIWORKFLOW_DISCORD_BOT_TOKEN
```

Optional future variables:

```text
AIWORKFLOW_DISCORD_CONFIG
AIWORKFLOW_ACTIVE_PROJECT_ID
```

The token must never be committed.

---

## 15. .gitignore Requirements

Recommended ignored paths:

```text
_Local/
node_modules/
tools/discord-orchestrator/.env
tools/discord-orchestrator/.env.local
```

If `tools/discord-orchestrator/package-lock.json` is created, it may be committed if the Node.js project is committed.

---

## 16. Implementation Phases

## Phase 1 — Skeleton

Create:

```text
tools/discord-orchestrator/package.json
tools/discord-orchestrator/src/index.js
tools/discord-orchestrator/src/config.js
tools/discord-orchestrator/README.md
```

Capabilities:

```text
load config
login bot
register slash commands manually or via script
respond to ping/status placeholder
```

## Phase 2 — Read Workflow Status

Implement:

```text
commandRunner
workflowStatusService
/ai status
/ai active
/ai backlog
/ai next
```

Uses:

```text
tools/aiworkflow/workflow_status.bat --json
```

## Phase 3 — Read Project Profiles

Implement:

```text
projectProfileService
/ai project list
/ai project profile
```

Uses:

```text
tools/aiworkflow/project_profile_status.bat
```

## Phase 4 — Safety Hardening

Implement:

```text
allowed users
allowed channels
command allowlist
project id validation
error sanitization
```

## Phase 5 — Documentation and Validation

Write:

```text
setup guide
test checklist
known limitations
Dev Log
```

---

## 17. Validation Plan

Minimum validation:

```text
[ ] Bot starts locally.
[ ] Unauthorized user is rejected.
[ ] Unauthorized channel is rejected.
[ ] /ai status returns workflow summary.
[ ] /ai active returns active task summary.
[ ] /ai backlog returns top backlog items.
[ ] /ai next returns next action.
[ ] /ai project list returns profiles.
[ ] /ai project profile returns Dust Land profile.
[ ] /ai project profile unity_project_template returns Unity profile.
[ ] Bot performs no repository writes.
[ ] Git status remains unchanged after read-only commands.
```

---

## 18. Non-Goals

Do not implement in v1:

```text
approval commands
document writes
source writes
build execution
runtime execution
Copilot execution
automatic task transitions
commit/push/release
multi-server deployment
```

---

## 19. Recommended Next Task

After this plan is approved:

```text
WF-014:
Implement Discord Read-Only Bot v1 skeleton.
```

Recommended route:

```text
ChatGPT implementation plan
-> user approval
-> Copilot bounded implementation or manual implementation
-> local bot validation
-> document update
-> commit
```

---

## 20. Summary

Discord Bot v1 is a read-only remote visibility layer.

It should answer:

```text
What is the current workflow status?
What task is active?
What should I do next?
What project profile is active?
Are there blockers?
```

It must not execute development work.

# Discord Read-Only Bot v1 Spec

## 1. Purpose

This document defines Discord Bot v1 for the AI Orchestrator workflow.

v1 is read-only.

It must not modify repository files, run builds, trigger Copilot, commit, push, or release.

---

## 2. v1 Goal

Allow the human director to check workflow and project status from Discord.

Primary use case:

```text
I am away from my main workstation.
I want to know:
- What is the active task?
- What is the next action?
- Is anything blocked?
- What project profile is active?
- What are the top backlog items?
```

---

## 3. v1 Command List

| Command | Purpose | Source |
|---|---|---|
| `/ai status` | Overall workflow summary | `workflow_status.bat --json` |
| `/ai active` | Active task summary | `ActiveTask.md` / workflow status JSON |
| `/ai backlog` | Top backlog items | `Backlog.md` / workflow status JSON |
| `/ai next` | Next recommended action | `ActiveTask.md` |
| `/ai blockers` | Blocked items and known risks | `Backlog.md`, `ProjectStatus.md` |
| `/ai project list` | List project profiles | `project_profile_status.bat --list` |
| `/ai project profile` | Show selected/default project profile | `project_profile_status.bat --json` |
| `/ai docs` | Show key workflow document paths | static config |

---

## 4. Command Behavior

## `/ai status`

Output:

```text
Workflow level
Active task
Task status
Next human action
Top backlog items
Git dirty state
Active project profile
```

Do not include long raw diffs.

---

## `/ai active`

Output:

```text
task_id
title
status
priority
risk
human action required
completion criteria
```

---

## `/ai backlog`

Output:

```text
top P0/P1 open items
blocked items count
deferred items omitted by default
```

---

## `/ai next`

Output:

```text
single recommended next action
whether approval is needed
whether validation is needed
```

---

## `/ai blockers`

Output:

```text
blocked backlog items
known ProjectStatus blockers
missing required files
```

---

## `/ai project list`

Output:

```text
available project profiles
engine
project type
profile file
```

---

## `/ai project profile`

Output:

```text
project_id
display_name
engine
project_type
release_targets
validation profiles
forbidden operations
```

---

## `/ai docs`

Output:

```text
AGENTS.md
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/ProjectStatus.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Task_State_Model.md
_Docs/AIWorkflow/Project_Profile_Schema.md
```

---

## 5. v1 Safety Rules

v1 must be read-only.

Forbidden:

```text
file writes
source edits
document edits
git add
git commit
git push
build execution
runtime execution
Copilot execution
Codex write mode
release actions
store upload
```

Allowed:

```text
read files
run read-only scripts
format output
send Discord messages
```

---

## 6. Runtime Model Options

## Option A — Local PC Bot

```text
Discord Bot runs on developer PC.
It can read the local repo directly.
```

Pros:

```text
simple
no remote repo sync
direct access to local scripts
```

Cons:

```text
PC must be on
network/session stability matters
```

Recommended for first v1.

---

## Option B — VPS Bot + Git Mirror

```text
Discord Bot runs on VPS.
It reads a cloned repository.
```

Pros:

```text
always available
independent from workstation
```

Cons:

```text
requires sync/pull policy
cannot reflect uncommitted local work
higher security burden
```

Not recommended for first v1.

---

## 7. Recommended v1 Deployment

Use:

```text
Local PC Bot
```

Reason:

```text
The workflow state and uncommitted local changes currently live on the developer machine.
```

Later, a VPS/server variant can be added.

---

## 8. Output Format

Discord responses should be concise.

Long reports should be summarized, not dumped.

Recommended max default response:

```text
10 to 20 lines
```

For longer output:

```text
send file attachment
or split into sections
or provide path to generated report
```

---

## 9. Configuration

v1 bot should have config fields:

```json
{
  "repo_root": "C:/Users/kalux/workStation/play-ground",
  "default_project_id": "dustland_custom_cpp_prototype",
  "allowed_discord_user_ids": [],
  "allowed_channel_ids": [],
  "scripts": {
    "workflow_status": "tools/aiworkflow/workflow_status.bat --json",
    "project_profile_status": "tools/aiworkflow/project_profile_status.bat --json"
  }
}
```

Do not hardcode repo paths directly in command handlers.

---

## 10. v1 Completion Criteria

Discord Read-Only Bot v1 is complete when:

```text
[ ] Bot connects to Discord.
[ ] Only allowed user/channel can use commands.
[ ] /ai status works.
[ ] /ai active works.
[ ] /ai backlog works.
[ ] /ai project list works.
[ ] /ai project profile works.
[ ] Bot performs no writes.
[ ] Bot command outputs match local script outputs.
[ ] Failure cases are handled with clear messages.
```

---

## 11. Next Stage After v1

After v1 is stable:

```text
Stage 3:
Discord Approval Notes
```

Do not add write operations before v1 read-only behavior is stable.

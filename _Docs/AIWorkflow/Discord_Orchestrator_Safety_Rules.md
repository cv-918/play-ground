# Discord Orchestrator Safety Rules

## 1. Purpose

This document defines safety rules for Discord-connected AI workflow orchestration.

The goal is to enable remote workflow visibility and control without allowing unsafe automation.

---

## 2. Core Rule

```text
Remote convenience must not bypass local review, validation, approval, or commit control.
```

Discord is a control surface, not a replacement for the human director.

---

## 3. Permission Classes

## Class 0 — Read-Only

Allowed without per-command approval if user/channel is authorized.

Examples:

```text
read workflow status
read active task
read backlog
read project profile
read git status
```

## Class 1 — Write Workflow Docs

Requires explicit confirmation.

Examples:

```text
mark task approved
mark task blocked
update ActiveTask.md status
add Backlog note
```

## Class 2 — Run Safe Local Script

Requires explicit confirmation unless script is read-only.

Examples:

```text
capture diff
json smoke check
generate DevLog draft
```

## Class 3 — Build/Test Execution

Requires explicit approval.

Examples:

```text
run build
run Unity tests
run package check
```

## Class 4 — Source Modification

Not allowed in early Discord versions.

Examples:

```text
run coding agent
edit source files
modify Unity scenes
modify assets
```

## Class 5 — Git/Release

Human-only.

Examples:

```text
commit
push
tag
release
store upload
Steam publish
Google Play upload
```

---

## 4. User and Channel Restrictions

The bot must restrict usage by:

```text
allowed user IDs
allowed channel IDs
```

For v1, reject all commands from unauthorized users/channels.

---

## 5. Command Allowlist

The bot must use an allowlist.

Allowed v1 commands:

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

Any unknown command must fail closed.

---

## 6. Script Allowlist

The bot must not execute arbitrary shell commands.

Allowed scripts are defined in config and/or active project profile.

Examples:

```text
tools/aiworkflow/workflow_status.bat --json
tools/aiworkflow/project_profile_status.bat --json
```

---

## 7. No Secrets in Repo

Do not commit:

```text
Discord bot token
user tokens
API keys
webhook secrets
```

Use environment variables or local ignored config.

Recommended ignored config path:

```text
_Local/AIWorkflow/discord_bot.local.json
```

---

## 8. Logging

Bot logs should include:

```text
timestamp
command
user id
channel id
project id
result
error message if any
```

Logs should not include secrets.

---

## 9. Failure Behavior

If a command fails, the bot should report:

```text
what failed
which script failed
exit code
short error output
next manual action
```

Do not retry write operations automatically.

---

## 10. Summary

Safe Discord orchestration begins with:

```text
read-only status
explicit permissions
command allowlist
script allowlist
human-only commit/release
```

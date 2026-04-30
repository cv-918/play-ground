# Discord Read-Only Bot v1

## Purpose

This is the first Discord adapter for the AIWorkflow system.

v1 is read-only.

It can:

```text
read workflow status
read active task
read backlog summary
read project profiles
format Discord responses
```

It must not:

```text
write files
edit source
edit docs
run Copilot
run Codex write mode
run build
run game/runtime
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

## Environment Variable

Set the bot token as an environment variable.

CMD example:

```bat
setx AIWORKFLOW_DISCORD_BOT_TOKEN "YOUR_TOKEN_HERE"
```

Then open a new CMD window.

To check:

```bat
echo %AIWORKFLOW_DISCORD_BOT_TOKEN%
```

---

## Install

From repository root:

```bat
cd tools\discord-orchestrator
npm install
```

---

## Register Slash Commands

```bat
npm run register
```

This registers one `/ai` command with subcommands.

---

## Start Bot

```bat
npm start
```

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
```

For project profile:

```text
/ai project profile id:dustland_custom_cpp_prototype
/ai project profile id:unity_project_template
```

---

## Safety

The bot checks:

```text
allowed_user_ids
allowed_channel_ids
```

If either list is empty or does not contain the caller/channel, the command is rejected.

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
[ ] /ai project profile works.
[ ] Git status remains unchanged after commands.
```

---

## Notes

This bot runs local scripts:

```text
tools/aiworkflow/workflow_status.bat --json
tools/aiworkflow/project_profile_status.bat --list --json
tools/aiworkflow/project_profile_status.bat --project <id> --json
```

It does not execute arbitrary shell commands.

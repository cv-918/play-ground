# Discord Bot Always-On Guide

## Purpose

This guide documents the local Windows operation layer for the AIWorkflow
Discord Orchestrator bot.

These scripts only start, stop, restart, inspect, and optionally register local
Windows Scheduled Tasks for the existing bot process. They do not bypass command
permissions or workflow safety gates.

The current bot includes controlled workflow write commands such as intake,
task approval, PC Runner control, and git command helpers. Those capabilities
remain governed by the Discord command handlers and workflow policy, not by the
start/stop scripts in this guide.

## Commands

Run commands from the repository root:

```bat
cd /d C:\Users\kalux\workStation\play-ground
tools\discord-orchestrator\start_bot.bat
tools\discord-orchestrator\status_bot.bat
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\stop_bot.bat
```

The start command is idempotent. If the recorded bot PID is already running as `node.exe`, it reports the existing process instead of starting a duplicate.

The stop command is scoped to the recorded PID in `_Temp/AIWorkflowDiscordBot/state.json`. It does not kill arbitrary `node.exe` processes.

## Scheduler Install and Uninstall

Scheduler setup is explicit and user-run only. Normal start, stop, status, and restart commands do not install Scheduled Tasks.

Install startup and watchdog tasks:

```bat
cd /d C:\Users\kalux\workStation\play-ground
tools\discord-orchestrator\install_startup_task.bat
```

Uninstall startup and watchdog tasks:

```bat
cd /d C:\Users\kalux\workStation\play-ground
tools\discord-orchestrator\uninstall_startup_task.bat
```

Task names:

```text
AIWorkflowDiscordBot-Startup
AIWorkflowDiscordBot-Watchdog
```

The startup task runs `start_bot.bat` at user logon. The watchdog task runs `start_bot.bat` every 5 minutes. Because start is idempotent, the watchdog should not create duplicate bot processes.

## Logs and State

Runtime state is stored under:

```text
_Temp/AIWorkflowDiscordBot/
```

State file:

```text
_Temp/AIWorkflowDiscordBot/state.json
```

Logs:

```text
_Temp/AIWorkflowDiscordBot/logs/
```

Each start creates timestamped stdout and stderr log files. The state file records:

```text
PID
started_at
command
working_directory
stdout_log
stderr_log
```

`status_bot.bat` prints running or stopped state, the PID when running, log paths, and the last 30 lines of available stdout/stderr logs.

## Secret Safety

The scripts check that this environment variable exists but never print its value:

```text
AIWORKFLOW_DISCORD_BOT_TOKEN
```

Do not commit:

```text
_Local/
_Temp/
node_modules/
.env
.env.local
Discord bot tokens
```

The required local config remains:

```text
_Local/AIWorkflow/discord_bot.local.json
```

Do not store tokens in logs. If a token is ever exposed, reset it immediately in the Discord Developer Portal, update the environment variable, and restart the bot.

## Troubleshooting

If start says `Run npm install first.`, install dependencies:

```bat
cd /d C:\Users\kalux\workStation\play-ground\tools\discord-orchestrator
npm install
```

If start says the local config is missing, create:

```text
_Local/AIWorkflow/discord_bot.local.json
```

Use:

```text
tools/discord-orchestrator/config.example.json
```

as the template.

If start says `AIWORKFLOW_DISCORD_BOT_TOKEN` is missing, set it outside the repository:

```bat
set AIWORKFLOW_DISCORD_BOT_TOKEN=YOUR_TOKEN_FOR_THIS_CMD
```

or for future CMD sessions:

```bat
setx AIWORKFLOW_DISCORD_BOT_TOKEN "YOUR_TOKEN"
```

Then open a new CMD before starting the bot.

If Discord slash commands are missing, register commands manually:

```bat
cd /d C:\Users\kalux\workStation\play-ground\tools\discord-orchestrator
npm run register
```

If status shows a stale PID, run:

```bat
tools\discord-orchestrator\stop_bot.bat
tools\discord-orchestrator\start_bot.bat
```

## Validation Checklist

Run:

```bat
cd /d C:\Users\kalux\workStation\play-ground
tools\discord-orchestrator\start_bot.bat
tools\discord-orchestrator\status_bot.bat
tools\discord-orchestrator\start_bot.bat
tools\discord-orchestrator\status_bot.bat
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
tools\discord-orchestrator\stop_bot.bat
tools\discord-orchestrator\status_bot.bat
git status --short
git diff --check
git diff --stat
```

Expected results:

```text
[ ] start_bot.bat starts the bot in the background.
[ ] Running start_bot.bat twice does not create duplicate node processes.
[ ] status_bot.bat shows running state and PID.
[ ] Discord /ai status works after start_bot.bat.
[ ] stop_bot.bat stops the bot.
[ ] status_bot.bat shows stopped after stop.
[ ] restart_bot.bat works.
[ ] Logs are created under _Temp/AIWorkflowDiscordBot/logs/.
[ ] No token is printed or written to logs by the scripts.
[ ] _Local/, node_modules/, _Temp/, and .env files are not staged or tracked.
[ ] git diff --check passes.
```

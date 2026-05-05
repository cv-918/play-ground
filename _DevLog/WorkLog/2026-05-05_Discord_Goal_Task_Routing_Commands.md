# Discord Goal Task Routing Commands Work Log

## Summary

Implemented WF-026 reduced-scope support for generating Codex CLI `/goal`
request markdown files from Discord.

The new command is:

```text
/ai prepare goal
```

## Background

WF-025 added manual Codex App prompt package generation. WF-026 adds a parallel
manual routing path for Codex CLI `/goal` requests while keeping execution
manual and preserving AIWorkflow safety gates.

## Scope

Included:

```text
tools/discord-orchestrator/src/commands/ai.js
tools/discord-orchestrator/src/services/goalPromptService.js
tools/discord-orchestrator/src/services/responseFormatter.js
tools/discord-orchestrator/README.md
_Docs/AIWorkflow/Discord_Goal_Task_Routing_Commands.md
_Docs/AIWorkflow/Discord_Codex_Task_Routing_Commands.md
_DevLog/WorkLog/2026-05-05_Discord_Goal_Task_Routing_Commands.md
```

Excluded:

```text
game source changes
_Local/
node_modules/
Codex CLI automatic execution
OpenClaw execution
Claude execution
subagents
Unity AI
computer-use
commit/push/release actions
Backlog.md changes
ActiveTask.md changes
```

## Architecture Notes

Responsibilities remain separated:

```text
commands/ai.js
  Slash command registration and routing

services/goalPromptService.js
  Task/project data loading, /goal markdown generation, and _Temp output writes

services/taskService.js
  Existing task parsing and task lookup

services/responseFormatter.js
  Short Discord response formatting
```

The new command does not embed prompt-generation logic in command dispatch.

## Implementation Notes

- Added `/ai prepare goal` under the existing `/ai prepare` command group.
- Added goal modes: `analysis`, `implementation`, `prototype`, and `review`.
- Added context levels: `compact`, `standard`, and `full`.
- Added output files under `_Temp/AIWorkflowTaskRequests/`.
- Added file names using `goal_request_<task_id>_<YYYYMMDD_HHMMSS>.md`.
- Added generated markdown files that start with a first-line `/goal` command.
- Added required sections for Objective, Context, Scope, Non-goals, Required
  safety constraints, Human decision gates, Validation plan, Stop conditions,
  and Required return format.

## Review Summary

Self-review focus:

```text
- Command dispatch remains thin.
- Goal request generation is service-owned.
- Backlog.md and ActiveTask.md are read-only for this command.
- Output write path is constrained to _Temp/AIWorkflowTaskRequests/.
- No Discord token or local config data is printed.
- No automatic Codex CLI, OpenClaw, Claude, subagent, Unity AI, computer-use,
  commit, push, or release action was added.
```

## Validation Summary

Validation performed:

```text
node --check tools\discord-orchestrator\src\commands\ai.js: passed
node --check tools\discord-orchestrator\src\services\goalPromptService.js: passed
node --check tools\discord-orchestrator\src\services\responseFormatter.js: passed
slash command JSON smoke check: passed; prepare goal exists with id/mode/context options
goalPromptService smoke checks: passed for ActiveTask default, GAME-001 analysis standard, GAME-005 implementation standard, WF-021 review compact
/ai prepare goal handler smoke checks: passed for ActiveTask default, GAME-001 analysis standard, GAME-005 implementation standard, WF-021 review compact
/ai status handler smoke check: passed after approved elevated run for local workflow_status.bat
/ai active handler smoke check: passed after approved elevated run for local workflow_status.bat
generated file section check: passed
git check-ignore for generated _Temp goal request file: passed
npm --prefix tools\discord-orchestrator run register: passed
tools\discord-orchestrator\restart_bot.bat: failed in default sandbox because recorded PID stop failed; passed after approved elevated rerun
tools\discord-orchestrator\status_bot.bat: passed; bot running with PID 43588
git status --short: reviewed; pre-existing ActiveTask.md and Backlog.md changes remain
git diff --check: passed with LF-to-CRLF warnings only
git diff --stat: reviewed
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json": no matches
git ls-files _Temp: no tracked files
```

Live Discord UI command validation was not performed in this environment. The
same command inputs were validated through `goalPromptService` smoke checks and
slash command registration succeeded.

## Remaining Risks

- Generated request files are runtime artifacts under `_Temp/` and must remain
  ignored by Git.
- The Discord command registration and live Discord slash-command behavior still
  require local bot validation.
- Manual bridge remains: the human opens the generated file and pastes/reviews
  it in Codex CLI.

## Next Tasks

```text
1. Run the required local registration and bot validation commands.
2. Run the required Discord command tests.
3. Review final git diff and decide whether to commit after validation passes.
```

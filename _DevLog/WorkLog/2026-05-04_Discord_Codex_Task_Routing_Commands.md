# Discord Codex Task Routing Commands Work Log

## Summary

Implemented Release E / WF-025 command support for generating Codex App task
request prompt files from Discord.

The new command is:

```text
/ai prepare codex
```

## Background

Release D completed safe script execution commands. WF-025 extends the Discord
workflow by preparing manual Codex App prompt packages from existing workflow
task data without executing Codex or modifying workflow state files.

## Scope

Included:

```text
tools/discord-orchestrator/src/commands/ai.js
tools/discord-orchestrator/src/services/codexPromptService.js
tools/discord-orchestrator/src/services/responseFormatter.js
tools/discord-orchestrator/src/services/taskService.js
tools/discord-orchestrator/README.md
_Docs/AIWorkflow/Discord_Codex_Task_Routing_Commands.md
_Docs/AIWorkflow/Discord_Safe_Script_Execution_Commands.md
```

Excluded:

```text
game source changes
_Local/
node_modules/
Codex execution
Copilot execution
computer-use
build/test execution
commit/push/release actions
Backlog.md changes
ActiveTask.md changes
```

## Architecture Notes

Responsibilities remain separated:

```text
commands/ai.js
  Slash command registration and routing

services/codexPromptService.js
  Task/project data loading, prompt generation, and _Temp output writes

services/taskService.js
  Existing task parsing helpers and backlog task lookup

services/responseFormatter.js
  Short Discord response formatting
```

Prompt generation logic is not embedded in `commands/ai.js`.

## Implementation Notes

- Added `/ai prepare codex` under the new `/ai prepare` group.
- Added strict task id resolution through the existing task id validation path.
- Added prompt output under `_Temp/AIWorkflowTaskRequests/`.
- Added mode handling for `analysis`, `implementation`, and `review`.
- Added context handling for `compact`, `standard`, and `full`.
- Added recommended model and reasoning output.
- Added deterministic markdown prompt sections for execution settings, task,
  project context, scope, safety constraints, expected Codex output, validation,
  and return instructions.

## Review Summary

Self-review focus:

```text
- Command dispatch remains thin.
- Prompt generation is service-owned.
- Backlog.md and ActiveTask.md are read-only for this command.
- Output write path is constrained to _Temp/AIWorkflowTaskRequests/.
- No Discord token or local config data is printed.
```

## Validation Summary

Local static validation performed:

```text
node slash command JSON check: passed
node --check syntax checks: passed
prompt service generation smoke checks: passed
required prompt phrase check: passed
git check-ignore for _Temp/AIWorkflowTaskRequests output: passed
trailing whitespace scan: passed
git diff --check: passed
git diff --stat: reviewed
git status --short: reviewed
git ls-files _Temp: no tracked files
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json": no matches
```

Live Discord validation passed on 2026-05-04:

```bat
cd /d C:\Users\kalux\workStation\play-ground
npm run register: passed
restart_bot.bat: passed
status_bot.bat running: passed
```

Discord command validation passed:

```text
1. /ai prepare codex
2. /ai prepare codex id:GAME-001 mode:analysis context:standard
3. /ai prepare codex id:GAME-002 mode:implementation context:standard
4. /ai prepare codex id:WF-021 mode:review context:compact
5. /ai status
6. /ai active
```

Generated prompt files were created under:

```text
_Temp/AIWorkflowTaskRequests/
```

Finalization validation:

```text
git diff --check: passed
private files not tracked: passed
```

## Remaining Risks

- Generated prompt files are runtime artifacts under `_Temp/` and must remain
  ignored by Git.
- Release E still uses a manual bridge: the human opens the generated prompt
  file and pastes/reviews it in Codex App.
- Release E does not execute Codex, Copilot, build/test, game runtime,
  computer-use, commit, push, or release.

## Next Tasks

```text
1. GAME-001B: Runtime validate GameDataLoader after JSON syntax smoke check.
2. WF-021: Harden Discord bot Node warnings and commandRunner shell usage.
```

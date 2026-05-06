# 2026-05-06 Role-Aware Goal Prompt Injection

## Summary

Implemented WF-038 reduced-scope role-aware prompt injection for `/ai prepare
goal`.

Generated `goal_request_*.md` files now include a supplemental role router block
for the selected task.

## Background

WF-031 standardized Codex Goal Prompt Contract v2.
WF-036 added the local read-only role router status script.
WF-037 exposed the current ActiveTask role router result through Discord as
`/ai role status`.

WF-038 connects the same role-routing responsibility to `/ai prepare goal` so a
manual Codex `/goal` request contains routing and validation guidance before the
human pastes it into Codex CLI.

## Scope

Changed only Discord-orchestrator service code and AIWorkflow documentation.

No game source, gameplay data, `_Local/`, `node_modules/`, release/deploy
scripts, commits, pushes, or task-state completion changes were made.

## Files Changed

- `tools/discord-orchestrator/src/services/goalPromptService.js`
- `tools/discord-orchestrator/src/services/roleRouterService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `tools/discord-orchestrator/src/services/taskService.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Discord_Goal_Task_Routing_Commands.md`
- `_Docs/AIWorkflow/Role_Aware_Goal_Prompt_Injection.md`
- `_DevLog/WorkLog/2026-05-06_Role_Aware_Goal_Prompt_Injection.md`

## Architecture Notes

Responsibilities remain separated:

```text
command dispatch: commands/ai.js
task loading: taskService.js
role routing: roleRouterService.js
goal prompt generation: goalPromptService.js
Discord response formatting: responseFormatter.js
```

`/ai role status` still uses the existing read-only local role router script for
the current ActiveTask.

`/ai prepare goal` now calls `roleRouterService` with the selected Backlog task
so explicit task IDs receive recommendations for that selected task rather than
only the current ActiveTask.

Prompt task lookup also accepts a leading task label in the Backlog item text
when no exact Backlog row ID exists, which supports smoke-test inputs such as
`WF-037`.

## Implementation Notes

The generated goal request adds:

```text
Role Router Recommendations
  Recommended Roles
  Role Rationale
  Human Decision Gates
  Required Validation
  Suggested Execution Route
  Verdict Format Reminder
  Path-Scoped Rule Reminders
```

The block is advisory and does not execute agents, Codex CLI, approval,
completion, commits, pushes, or runtime tools.

## Review Summary

Diff review found the implementation stayed in Discord-orchestrator service
code and AIWorkflow documentation. No PlayGround source or data files were
modified.

`_Docs/AIWorkflow/ActiveTask.md` and `_Docs/AIWorkflow/Backlog.md` were already
dirty at task start and record the WF-038 active task/approval state.

## Validation Summary

Run:

```text
npm --prefix tools\discord-orchestrator run register
node import smoke check for goalPromptService.js
node selected-task role recommendation smoke check
direct prepareGoalPrompt generation for GAME-001 analysis
direct prepareGoalPrompt generation for WF-037 review
Select-String checks for required generated sections
tools\aiworkflow\role_router_status.bat
tools\aiworkflow\role_router_status.bat --json
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Results:

```text
npm register: passed
Node import smoke checks: passed
Direct goal generation: passed
Required generated section checks: passed
role_router_status text/json: passed
restart_bot.bat: failed inside default sandbox, then passed with approved elevated execution
status_bot.bat: passed; bot running as PID 47996
git diff --check: passed with line-ending warnings only
private/local tracked file check: no matches
```

Discord UI slash-command tests were not run from this environment. The bot was
registered and restarted, and direct service-level generation covered the two
requested prepare-goal cases.

## Remaining Risks

- Discord UI slash-command validation still needs to be performed by the human
  in Discord.
- The JavaScript selected-task role recommendation intentionally mirrors the
  current small role-router heuristics at reduced scope; deeper path detection may
  need a future approved task.

## Next Tasks

1. Run register, bot, role router, diff, and private-file checks.
2. Run Discord smoke tests if local Discord bot access is available.
3. Review generated goal request files for all required role-aware sections.
4. Human Director decides whether to commit after validation evidence is
   reviewed.

## AI Assistance

Codex implemented the reduced-scope service and documentation changes under the
approved WF-038 constraints.

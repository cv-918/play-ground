# 2026-05-06 Path Rule Checklist Goal Prompt Injection

## Summary

Implemented WF-039 reduced-scope path-scoped rule checklist injection for
`/ai prepare goal`.

Generated `goal_request_*.md` files now include a dedicated Path-Scoped Rule
Reminders section with concrete checklist items selected from the likely task
scope.

## Background

WF-035 defined Path-Scoped Rule Mapping for Dust Land v1.
WF-038 injected selected-task role router guidance into `/ai prepare goal`
output.

WF-039 adds concrete path-specific review and validation reminders to the
generated manual Codex `/goal` request files.

## Scope

Changed Discord-orchestrator prompt generation service code and AIWorkflow
documentation only.

No game source files, gameplay data files, `_Local/`, `node_modules/`,
release/deploy scripts, commits, pushes, or task-state completion changes were
made by this implementation.

## Files Changed

- `tools/discord-orchestrator/src/services/goalPromptService.js`
- `tools/discord-orchestrator/src/services/pathRuleReminderService.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Discord_Goal_Task_Routing_Commands.md`
- `_Docs/AIWorkflow/Path_Rule_Checklist_Goal_Prompt_Injection.md`
- `_DevLog/WorkLog/2026-05-06_Path_Rule_Checklist_Goal_Prompt_Injection.md`

## Architecture Notes

Responsibilities remain separated:

```text
command dispatch: commands/ai.js
task loading: taskService.js
role routing: roleRouterService.js
path-rule selection: pathRuleReminderService.js
goal prompt generation: goalPromptService.js
Discord response formatting: responseFormatter.js
```

`/ai prepare goal` still writes only manual request markdown under
`_Temp/AIWorkflowTaskRequests/`.

## Implementation Notes

`pathRuleReminderService.js` selects path scopes from task id/category, kind,
workflow path, task title, task reason, tool route, validation text, and active
task metadata.

Reduced-scope coverage includes:

```text
PlayGround/Project/Gameplay/**
PlayGround/Project/EngineSystems/**
PlayGround/Data/**
PlayGround/Data/Resources/**
tools/aiworkflow/**
tools/discord-orchestrator/**
_Docs/AIWorkflow/**
_DevLog/**
AGENTS.md
README.md
.editorconfig
.gitattributes
```

When no specific path scope is inferred, the generated prompt includes global
path safety reminders.

## Review Summary

Diff review confirmed the implementation stayed in approved service/docs scope,
did not modify game source or data paths, and did not add execution behavior to
Discord commands.

`_Docs/AIWorkflow/ActiveTask.md` and `_Docs/AIWorkflow/Backlog.md` were already
dirty before implementation and were not edited for WF-039.

## Validation Summary

Run:

```text
node --check tools\discord-orchestrator\src\services\goalPromptService.js
node --check tools\discord-orchestrator\src\services\pathRuleReminderService.js
direct prepareGoalPrompt generation for GAME-001 analysis
direct prepareGoalPrompt generation for WF-037 review
direct prepareGoalPrompt generation for WF-038 review
Select-String checks for generated Contract v2, Role Router Recommendations, Path-Scoped Rule Reminders, and concrete checklist items
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
tools\aiworkflow\role_router_status.bat
tools\aiworkflow\role_router_status.bat --json
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Results:

```text
node --check: passed for goalPromptService.js and pathRuleReminderService.js
direct prepareGoalPrompt generation: passed for GAME-001 analysis, WF-037 review, and WF-038 review
generated request section checks: passed; generated files include Contract v2, role-aware routing guidance, dedicated Path-Scoped Rule Reminders, and concrete checklist items
npm register: passed
role_router_status text/json: passed
restart_bot.bat: failed once in default sandbox while stopping prior PID 47996, then passed with approved elevated execution; rerun after final code check also passed
status_bot.bat: passed; bot running as PID 38168 after final restart
git diff --check: passed with line-ending warnings only
private/local tracked file check: no matches
```

Discord UI validation run by the human:

```text
/ai prepare goal id:GAME-001 mode:analysis context:standard
/ai prepare goal id:WF-037 mode:review context:compact
/ai prepare goal id:WF-038 mode:review context:compact
/ai role status
/ai status
/ai active
```

Results:

```text
/ai prepare goal id:GAME-001 mode:analysis context:standard: passed; generated _Temp/AIWorkflowTaskRequests/goal_request_GAME-001_20260506_120019.md
/ai prepare goal id:WF-037 mode:review context:compact: passed; generated _Temp/AIWorkflowTaskRequests/goal_request_WF-20260506-104145_20260506_120032.md
/ai prepare goal id:WF-038 mode:review context:compact: passed; generated _Temp/AIWorkflowTaskRequests/goal_request_WF-20260506-111530_20260506_120038.md
/ai role status: passed; displayed WF-039 role router recommendation
/ai status: passed; displayed workflow status and active WF-039 task
/ai active: passed; displayed active WF-039 task
```

Generated Discord request files were inspected locally and include Contract v2,
role-aware routing guidance, a dedicated Path-Scoped Rule Reminders section,
and concrete path-specific checklist items.

## Remaining Risks

- Path inference is heuristic and intentionally reduced-scope.
- Discord UI slash-command validation requires a running local bot and human
  Discord access.
- Generated request files must be inspected to confirm Contract v2, role-aware
  routing guidance, and path-scoped checklist reminders are all present.

## Next Tasks

1. Run local command validation.
2. Run Discord smoke tests.
3. Inspect generated `goal_request_*.md` files.
4. Review final diff and decide whether to commit.

## AI Assistance

Codex implemented the reduced-scope service and documentation changes under the
approved WF-039 constraints.

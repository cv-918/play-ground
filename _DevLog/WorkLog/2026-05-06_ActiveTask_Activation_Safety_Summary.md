# 2026-05-06 ActiveTask Activation Safety Summary

## Summary

Implemented WF-044: `/ai task set-active` now returns activation safety guidance
after selecting an ActiveTask.

## Background

WF-036 through WF-043 built role routing, goal prompt guidance, intake, explicit
intake creation, and intake-created task review. WF-044 improves the activation
point so the human receives immediate safety guidance before approval or prompt
generation.

## Scope

- Preserve existing `/ai task set-active` behavior.
- Add recommended roles, gates, validation, route, safety note, and next manual
  command suggestions to the success response.
- Do not auto-approve, execute Codex CLI, execute agents, mark done, commit,
  push, modify game source, or change Backlog row status.

## Files Changed

- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/activeTaskActivationService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/Discord_Task_Management_Commands.md`
- `_Docs/AIWorkflow/ActiveTask_Activation_Safety_Summary.md`
- `_Docs/AIWorkflow/README.md`
- `_DevLog/WorkLog/2026-05-06_ActiveTask_Activation_Safety_Summary.md`

## Implementation Notes

`activeTaskActivationService` wraps the existing `taskService.setActiveTask`
state update and then uses `roleRouterService.getRoleRouterRecommendationForTask`
to build the activation safety summary.

The response suggests manual follow-up commands but does not execute them.

## Validation Summary

Validation should include JavaScript syntax checks, Discord command
registration, bot restart/status, local set-active response checks, Discord
smoke tests, and Git safety checks.

## Remaining Risks

- `/ai task set-active` intentionally writes ActiveTask.md and creates a backup;
  Discord validation will change the active task as part of the test.

## Commit Guidance

Do not commit until Discord smoke tests and Git diff review pass.

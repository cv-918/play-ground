# 2026-05-06 Intake To Task Draft Generation

## Summary

Implemented WF-041 reduced-scope Task Draft generation for `/ai intake`.

Natural-language intake responses now include a Task Draft section suitable for
human review before manual task creation.

## Background

WF-040 added `/ai intake` as a read-only natural-language task suggestion
command.

WF-041 extends that read-only flow with draft fields that map cleanly to manual
task creation decisions.

## Scope

Changed Discord-orchestrator intake service/formatter code and AIWorkflow
documentation only.

No game source files, gameplay data files, `_Local/`, `node_modules/`,
release/deploy scripts, commits, pushes, automatic approvals, or task-state
updates were made by the implementation.

`_Docs/AIWorkflow/ActiveTask.md` and `_Docs/AIWorkflow/Backlog.md` were already
dirty before implementation and were not edited for WF-041.

## Files Changed

- `tools/discord-orchestrator/src/services/taskIntakeService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `tools/discord-orchestrator/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Discord_Task_Intake_Command.md`
- `_Docs/AIWorkflow/Intake_To_Task_Draft_Generation.md`
- `_DevLog/WorkLog/2026-05-06_Intake_To_Task_Draft_Generation.md`

## Architecture Notes

Responsibilities remain separated:

```text
command dispatch: commands/ai.js
task intake classification and draft generation: taskIntakeService.js
role routing: roleRouterService.js
Discord response formatting: responseFormatter.js
task persistence: not used by /ai intake
```

`/ai intake` still does not call task creation, approval, active task, agent,
Codex CLI, Git, build, or runtime execution paths.

## Implementation Notes

The intake service now returns `task_draft` with:

```text
title
category
priority
kind
reason
suggested risk
workflow path
recommended roles
human decision gates
required validation
suggested next manual action
```

The Discord formatter displays the Task Draft in the intake response while
keeping responses below Discord truncation limits for the requested smoke-test
inputs.

## Review Summary

Diff review confirmed that draft generation is read-only, does not call task
write functions, does not modify Backlog.md or ActiveTask.md, and is suitable
only for manual review.

## Validation Summary

Run:

```text
node --check tools\discord-orchestrator\src\services\taskIntakeService.js
node --check tools\discord-orchestrator\src\services\responseFormatter.js
direct intake service smoke checks for the three requested example texts
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
Discord smoke tests for /ai intake, /ai status, and /ai active
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Results:

```text
node --check: passed for taskIntakeService.js and responseFormatter.js
direct intake service smoke checks: passed for GAME/UserData, WF/Codex goal prompt, and UNITY/validation profile examples
Task Draft field check: passed for title, category, priority, kind, reason, suggested risk, workflow path, roles, gates, validation, and next manual action
Discord response length check: passed for the three requested examples; each formatted response remained under 1800 characters
npm register: passed
restart_bot.bat: passed with approved elevated execution
status_bot.bat: passed; bot running as PID 41628
git diff --check: passed with line-ending warnings only
private/local tracked file check: no matches
```

Discord UI validation still to run:

```text
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
/ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어"
/ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어"
/ai status
/ai active
```

## Remaining Risks

- Task Draft is heuristic and must be manually reviewed before task creation.
- Discord UI validation requires a running local bot and human Discord access.

## Next Tasks

1. Run local syntax and service smoke checks.
2. Register and restart the Discord bot.
3. Run Discord smoke tests.
4. Confirm intake did not create Backlog tasks or change ActiveTask.
5. Review the final diff and decide whether to commit.

## AI Assistance

Codex implemented the reduced-scope service and documentation changes under the
approved WF-041 constraints.

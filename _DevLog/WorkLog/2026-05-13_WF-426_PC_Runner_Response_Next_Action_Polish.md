# WF-426 PC Runner Response Next Action Polish WorkLog

## Summary

Added plain next-action summaries to PC Runner Discord responses so the Human
Director can see why the runner stopped and what to do next without opening a
separate command guide.

## Background

The runner already returned stop-reason-based command lists, but the response
could still feel dense during normal Discord use. This bundle keeps the command
surface unchanged and adds a short human-readable summary above the detailed
next commands.

## Scope

- Add a `pcRunnerNextActionSummary` formatter for common runner stop reasons.
- Show the summary in PC Runner result/failure responses.
- Show the summary in `accept-completion` failure responses.
- Preserve existing slash commands, runner state, task lifecycle rules, and
  safety flags.

## Files Changed

- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `_DevLog/WorkLog/2026-05-13_WF-426_PC_Runner_Response_Next_Action_Polish.md`

## Validation Summary

Performed validation:

- `node --check tools/discord-orchestrator/src/services/responseFormatter.js`
- PC Runner response formatter smoke for:
  - `completion_review_required`
  - `done_or_commit_decision`
  - `executor_not_ready`
  - `accept-completion` failure

- `git diff --check`
- forbidden/private path tracking check

`git diff --check` passed with line-ending warnings only. No tracked `_Local`,
`_Temp`, `node_modules`, `.env`, or `*.local.json` changes were present.

## Remaining Risks

- This is response formatting only. It does not change command registration,
  runner execution, approval policy, task done behavior, commit, or push.

## AI Assistance

Codex implemented and validated this workflow harness change.

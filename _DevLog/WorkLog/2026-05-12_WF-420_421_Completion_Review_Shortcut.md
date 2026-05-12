# WF-420/WF-421 Completion Review Shortcut WorkLog

## Summary

Added a Discord runner shortcut that records completion acceptance and continues
the PC Runner in one command, then updated PC Runner next-command guidance to
prefer that shortcut at completion review gates.

## Background

After PC Runner execution, the workflow intentionally stops at
`completion_review_required`. The previous UX required the Human Director to
run a finalization command and then a separate runner continue command. That was
safe but repetitive. The desired product behavior is one explicit approval
command after the completion card has been reviewed.

## Scope

- Add `/ai runner accept-completion`.
- Support `decision:accept` and `decision:accept-concerns`.
- Record FinalizationLog first, then call `pc_runner continue`.
- Keep task done, commit, push, and lifecycle completion outside this command.
- Update runner next-command suggestions to show the combined command when the
  runner stops at `completion_review_required` or `finalization_required`.
- Document the shortcut in the Korean command quick reference and runner
  implementation profile documentation.

## Files Changed

- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/runnerCompletionService.js`
- `tools/discord-orchestrator/src/services/responseFormatter.js`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Discord_Command_Quick_Reference_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile.md`
- `_DevLog/WorkLog/2026-05-12_WF-420_421_Completion_Review_Shortcut.md`

## Implementation Notes

- The shortcut is not auto-approval. It is a single explicit Discord command
  that represents the Human Director's completion review acceptance.
- If finalization fails, runner continue is not called.
- If finalization succeeds but runner continue fails, the response reports that
  split state so the FinalizationLog is not hidden.
- Existing `/ai finalization ...` and `/ai runner continue ...` commands remain
  available for manual recovery and advanced review paths.

## Validation Summary

Planned validation:

- `node --check tools/discord-orchestrator/src/commands/ai.js`
- `node --check tools/discord-orchestrator/src/services/runnerCompletionService.js`
- `node --check tools/discord-orchestrator/src/services/responseFormatter.js`
- command schema smoke for `/ai runner accept-completion`
- response formatter smoke confirming `completion_review_required` suggests the
  combined command
- `npm --prefix tools/discord-orchestrator run register`
- managed bot restart/status check
- `git diff --check`
- forbidden/private path tracking check

## Remaining Risks

- The shortcut still depends on the existing FinalizationLog and PC Runner
  continue primitives. If either primitive returns a safe stop, the user still
  needs to review the reported state.

## AI Assistance

Codex implemented and validated this workflow harness change.

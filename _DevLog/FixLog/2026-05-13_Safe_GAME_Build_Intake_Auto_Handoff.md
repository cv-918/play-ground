# Safe GAME Build Intake Auto-Handoff

## Summary

Improved intake classification and auto-handoff routing for safe GAME build validation requests.

Requests that explicitly say there are no source, data, schema, runtime behavior, or document changes and ask only for PlayGround Visual Studio/MSBuild/Debug x64 build validation are now normalized to:

```text
category=VAL
kind=validation
priority=P2
risk=low
profile=build
executor=local_cli
command_id=debug_visual_studio_build
```

Unknown validation routes, such as unspecified game data loader/readability checks, still keep a clarifying question and stay in the human approval path.

## Background

The prior real GAME validation smoke showed that safe build validation could be over-classified as `P1/high-risk` because phrases such as "runtime behavior" appeared in a no-change sentence. It also showed that the LLM could ask which build command or runner profile should be used even though the harness already has a deterministic build route.

## Scope

Included:

- Add deterministic normalization for safe build validation intake.
- Update Codex intake prompt guidance for the same route.
- Expand no-change phrase handling in auto-handoff policy.
- Preserve human review for unknown game data loader/readability validation routes.
- Update Human Director guide and intake auto-handoff docs.

Excluded:

- Auto-approval for game source/data/schema/runtime mutation.
- New Discord slash command schema.
- New build/test command catalog entries.
- Game source, data, schema, or runtime behavior changes.

## Files Changed

- `tools/discord-orchestrator/src/services/taskIntakeService.js`
- `tools/discord-orchestrator/src/services/codexCliIntakeService.js`
- `tools/discord-orchestrator/src/services/intakeAutoHandoffService.js`
- `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Intake_Auto_Handoff.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Intake_Auto_Handoff_KR.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`

## Implementation Notes

`taskIntakeService.js` now normalizes known safe build validation requests after LLM draft generation and before cross-check evaluation. This keeps the deterministic policy layer authoritative even when the LLM is overly cautious.

The normalization removes only inferable build route questions. It does not remove clarifying questions for unknown validation evidence such as data-loader/readability checks.

`codexCliIntakeService.js` now tells Codex intake that safe Visual Studio/MSBuild/Debug x64 validation uses the deterministic route instead of asking the user for command routing.

## Review Summary

The change narrows automation to a known allowlisted route. It does not expand automation to mutating GAME work and does not bypass approval for P0/P1, medium/high-risk, schema/runtime/source/data changes, or unknown command routes.

## Validation Summary

Static checks:

```text
node --check tools/discord-orchestrator/src/services/taskIntakeService.js
node --check tools/discord-orchestrator/src/services/codexCliIntakeService.js
node --check tools/discord-orchestrator/src/services/intakeAutoHandoffService.js
```

Policy smoke:

```text
Safe build validation -> P2/low, no clarification, auto_start_allowed, profile=build, executor=local_cli
Unknown data loader/readability validation -> needs_human_approval, blocker=clarification_required
```

Codex intake preview:

```text
category=VAL
priority=P2
risk=low
clarifying_questions=[]
cross_check.requires_human_review=false
policy.decision=auto_start_allowed
profile=build
executor=local_cli
```

Actual workflow smoke:

```text
Task: VAL-20260513-164104
Auto-handoff decision: runner_started
Runner: runner-run-val-20260513-164104-20260513-164105-633
BuildTestResult: bt-val-20260513-164104-debug_visual_studio_build-20260513-164105-633
VerificationReport: verification-val-20260513-164104-20260513-164105-633
CompletionCard: card-val-20260513-164104-20260513-164105-633
FinalizationLog: finalization-20260513-164153-330-f32b72f6
```

Observed result:

```text
debug_visual_studio_build exit_code 0
MSBuild resolution: visual_studio_auto
VerificationReport: PASS_WITH_NOTES
CompletionCard: READY_WITH_NOTES
Task done: yes
```

Guide update decision: required and completed, because auto-handoff behavior changed.

## Remaining Risks

- Safe validation wording still depends on explicit no-change language. Requests that omit no-change constraints should continue to stop for human approval.
- Data-loader/readability validation needs a dedicated allowlisted command before it can be auto-handoff safely.

## Next Tasks

- Define a safe game data loader/readability validation command if that workflow should become automatic.
- Run a small GAME data/doc task through the full flow after this build-validation route remains stable.

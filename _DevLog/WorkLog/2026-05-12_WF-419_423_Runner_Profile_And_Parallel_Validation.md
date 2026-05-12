# WF-419/WF-423 Runner Profile and Parallel Validation WorkLog

## Summary

Added a first-class PC Runner `documentation/codex_cli` profile path and
parallelized independent post-execution validation steps.

## Background

Low-risk DOC auto-handoff previously used the general `implementation` runner
profile. That worked mechanically, but it blurred task intent and made runner
status harder to read. The runner also executed file watching and JSON smoke
validation serially even though those steps do not depend on each other after
executor completion.

## Scope

- Route low-risk DOC intake auto-handoff to `documentation/codex_cli`.
- Allow the PC Runner to start `documentation/codex_cli` as a supported profile.
- Generate a documentation-specific runner prompt that constrains Codex to
  documentation-only edits unless the approved task says otherwise.
- Run file watcher snapshot and JSON smoke build/test in parallel after
  executor completion, then keep result collection, diff analysis,
  verification, completion report, and completion card generation ordered.
- Update runner/intake documentation for the new profile mapping.

## Files Changed

- `tools/aiworkflow/pc_runner.ps1`
- `tools/discord-orchestrator/src/commands/ai.js`
- `tools/discord-orchestrator/src/services/intakeAutoHandoffService.js`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Intake_Auto_Handoff.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Intake_Auto_Handoff_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Discord_Command_Quick_Reference_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile.md`
- `_DevLog/WorkLog/2026-05-12_WF-419_423_Runner_Profile_And_Parallel_Validation.md`

## Implementation Notes

- Added `Invoke-ToolJsonBatch` to run safe, predefined runner primitives in
  parallel and parse their JSON outputs using the same local result shape as
  normal tool calls.
- Added `Invoke-PostExecutionValidationPipeline` so validation and Codex-backed
  profiles share the same evidence/report sequence after execution.
- Kept verification judgment after evidence/result/diff/build-test artifacts
  are collected. The parallel step only gathers independent evidence.

## Validation Summary

Planned validation:

- PowerShell parser check for `tools/aiworkflow/pc_runner.ps1`
- Node syntax check for `commands/ai.js`
- Node syntax check for `intakeAutoHandoffService.js`
- PC Runner plan smoke for `documentation/codex_cli`
- `Invoke-ToolJsonBatch` smoke using file watcher and build/test status commands
- Intake auto-handoff routing smoke for DOC and VAL profile selection
- Runner profile command schema smoke for the `documentation` choice
- Discord command registration after adding the `documentation` profile choice
- Managed bot restart/status check
- `git diff --check`
- forbidden/private path tracking check

## Remaining Risks

- `Start-Job` adds a small process startup overhead. The gain is most useful
  once validation commands become heavier than the current JSON smoke.
- Documentation profile still uses the same local Codex adapter config as
  implementation. Per-profile adapter config can be added later if needed.

## AI Assistance

Codex implemented and validated this workflow harness change.

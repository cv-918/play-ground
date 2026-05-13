# PC Runner Build Approval Flag Fix

## Summary

Fixed a PC Runner build-profile handoff bug found during a real GAME validation workflow smoke.

The runner plan correctly recognized an approved `build/local_cli` task, but the post-execution validation pipeline did not pass `--approved` to `build_test_runner.bat`. As a result, `debug_visual_studio_build` was blocked even after the Human Director approval was recorded.

## Background

The workflow smoke targeted the final Human Director path:

```text
intake -> approval when required -> PC Runner start -> Completion Card -> accept -> task done
```

The actual GAME validation intake created `VAL-20260513-160636`. Codex intake classified it as `P1/high-risk` and raised clarifying questions, so the task correctly did not auto-handoff. After manual approval, `runner plan` succeeded for `build/local_cli`, but `runner start` failed at the build/test layer.

## Scope

Included:

- Forward approved runner plan state to the build/test runner as `--approved`.
- Re-run the same PC Runner build validation smoke.
- Record the resulting workflow state in Backlog and ActiveTask.

Excluded:

- Auto-approval policy changes.
- New Discord commands or command schema changes.
- Game source, data, schema, or runtime behavior changes.
- User guide content changes.

## Files Changed

- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `tools/aiworkflow/pc_runner.ps1`
- `_DevLog/FixLog/2026-05-13_PC_Runner_Build_Approval_Flag.md`

## Implementation Notes

`tools/aiworkflow/pc_runner.ps1` now builds the `build_test_runner.bat run` argument list before dispatch. When the runner plan has `approval_state = approved`, the runner appends `--approved`.

This preserves the lower-level build/test guard: approval-required commands still reject direct execution without the flag.

## Review Summary

The change is narrowly scoped to the handoff between PC Runner and Build/Test Runner. It does not relax task approval checks or make build execution automatic outside an approved runner plan.

## Validation Summary

Commands and evidence:

```text
node tools/discord-orchestrator/scripts/smokeAutoWorkflowE2E.js
```

Result: passed in an isolated temporary repository. Real repository state was not modified by that smoke.

Actual GAME validation smoke:

```text
VAL-20260513-160636
profile: build
executor: local_cli
BuildTestResult: bt-val-20260513-160636-debug_visual_studio_build-20260513-161011-492
VerificationReport: verification-val-20260513-160636-20260513-161011-492
CompletionCard: card-val-20260513-160636-20260513-161011-492
FinalizationLog: finalization-20260513-161135-305-8ab06207
```

Observed result:

```text
debug_visual_studio_build exit_code 0
MSBuild resolution: visual_studio_auto
VerificationReport: PASS_WITH_NOTES
CompletionCard: READY_WITH_NOTES
Task done: yes
```

Additional validation:

```text
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File tools\aiworkflow\pc_runner.ps1 status VAL-20260513-160636 -Json
```

Guide update decision: checked. No user guide update was required because the user-facing command flow did not change.

## Remaining Risks

- `/ai intake` over-classified the safe GAME validation smoke as `P1/high-risk` and generated clarifying questions. That is safe but too conservative.
- The next stabilization step should tune low-risk GAME validation intake so clearly non-mutating build/data-loader validation can auto-handoff when command routing is explicit.

## Next Tasks

- Add or tune intake wording/policy so safe GAME validation requests identify the intended build profile and command route without becoming high-risk.
- Run a small GAME data/doc workflow after the build validation path remains stable.

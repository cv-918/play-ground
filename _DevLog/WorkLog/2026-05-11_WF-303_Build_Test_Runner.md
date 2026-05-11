# WF-303 Build/Test Runner

## Summary

Implemented the WF-303 Build/Test Runner integration for AIWorkflow Phase 3.

The new runner executes only allowlisted build/test/validation command entries
from a local config when explicitly enabled. It records stdout, stderr,
duration, timeout state, spawn state, and exit-code observations as
BuildTestResult records under `_Temp/AIWorkflowRuntime/`.

## Background

WF-301 collects execution results and WF-302 analyzes diff snapshots. WF-303
adds build/test evidence collection so WF-304 VerificationReport can later
combine result, diff, and build/test observations into a task-specific
verification judgment.

WF-303 intentionally does not judge pass/fail.

## Scope

Included:

- `tools/aiworkflow/build_test_runner.bat`
- `tools/aiworkflow/build_test_runner.ps1`
- `tools/aiworkflow/build_test_runner.example.json`
- `status`, `list`, `dry-run`, `run`, and `read` commands
- local config enabled guard
- allowlisted `command_id` selection
- explicit `--execute` guard
- `approval_level: approval_required` guard through `--approved`
- task status guard through Backlog lookup
- stdout/stderr log capture
- exit-zero, exit-nonzero, timeout, and spawn-failure observation
- BuildTestResult records
- build/test manifest storage
- TaskRunState build/test projection
- display-only ProgressEventLog entry
- file lock around manifest/projection writes
- WF-304 VerificationReport handoff fields
- blueprint documentation
- local script README updates

Excluded:

- VerificationReport
- CompletionReport
- Completion Card
- automatic approval policy
- automatic task done
- arbitrary shell execution
- game source or data changes
- commit, push, release, or deploy automation

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Build_Test_Runner.md`
- `tools/aiworkflow/README.md`
- `tools/aiworkflow/build_test_runner.bat`
- `tools/aiworkflow/build_test_runner.example.json`
- `tools/aiworkflow/build_test_runner.ps1`

## Architecture Notes

Build/Test Runner is an evidence collection layer, not a verification layer.

The runner writes:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/build_test/build_test_manifest.json
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/build_test/logs/<build_test_id>.stdout.log
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/build_test/logs/<build_test_id>.stderr.log
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/build_test/results/<build_test_id>.json
```

BuildTestResult records include `execution.verification_judgment = null` and
`execution.completion_state = null`.

The runner does not accept raw shell strings. Real execution requires a config
entry selected by `command_id`.

## Implementation Notes

The example config is disabled by default. Actual machine-specific enabled
configs should live under `_Local/` or `_Temp/` and must not be committed.

The runner supports:

- default-deny status/list/dry-run usage
- guarded real execution
- approval-required command protection
- local stdout/stderr capture
- timeout kill and timeout observation
- nonzero exit-code observation
- build/test manifest and TaskRunState projection updates

Manifest/projection writes use a lock file so concurrent build/test runs for
the same task do not overwrite each other's manifest updates.

## Review Summary

Implementation review found and fixed two issues during validation:

- Windows PowerShell compatibility issue with `ProcessStartInfo.ArgumentList`
- argument records were omitted from command lines until argument handling was
  normalized through `Arguments`

Both were fixed before final validation.

## Validation Summary

Executed:

- PowerShell parser check for `tools/aiworkflow/build_test_runner.ps1`
- `tools\aiworkflow\build_test_runner.bat status WF-303 --json`
- `tools\aiworkflow\build_test_runner.bat list WF-303 --json`
- `tools\aiworkflow\build_test_runner.bat dry-run WF-303 json_smoke --json`
- missing `--execute` rejection
- disabled config rejection
- unknown command rejection
- empty read rejection
- temporary enabled config run for `node --version`
- approval-required command rejection without `--approved`
- approval-required command run with `--approved`
- nonzero exit observation with `node -e process.exit(3)`
- timeout observation with a one-second timeout
- concurrent run manifest/projection lock smoke

Observed:

- `node --version` recorded `exit_zero`.
- nonzero smoke recorded `exit_nonzero` with exit code `3`.
- timeout smoke recorded `timeout`.
- stdout/stderr log paths were recorded under `_Temp`.
- Verification and completion fields remained null.
- Guard failures returned `task_lifecycle_unchanged = true`.
- Concurrent result writes preserved both new BuildTestResult IDs in the
  manifest.

Final checks:

- generated JSON parse checks
- invariant checks for verification/completion null fields
- `git diff --check`
- forbidden path checks
- private/local tracked-file checks

All final checks passed. `git diff --check` reported line-ending normalization
warnings only.

## Remaining Risks

- The tracked example config is disabled. A real local build config still needs
  to be created under `_Local/` when Visual Studio/MSBuild execution is ready.
- Build success remains evidence only. WF-304 VerificationReport must decide
  how each build/test result maps to the task's validation criteria.
- Discord-facing build/test command cards are not part of this task.

## Next Tasks

- WF-304 Implement VerificationReport.
- Later Discord UX work can expose build/test result cards once the report
  format is stable.

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-303 scope.
Runtime artifacts and temporary config files were generated under `_Temp/` for
validation and are not intended to be committed.

# WF-302 Diff Analyzer

## Summary

Implemented the WF-302 Diff Analyzer layer for AIWorkflow runtime results.

The new analyzer reads existing WF-301 ExecutionResult records and referenced
git diff snapshot files, then writes DiffAnalysis records under
`_Temp/AIWorkflowRuntime/`. It summarizes changed files, additions, deletions,
change types, file categories, and attention signals for later Verification
Report use.

## Background

WF-301 now aggregates sessions, evidence, runtime controls, progress events,
changed files, and diff snapshot references into ExecutionResult records.
Phase 3 needs a stable diff-analysis layer before VerificationReport can judge
whether the observed result satisfies a task.

WF-302 provides that analysis point without adding verification, completion, or
approval behavior.

## Scope

Included:

- `tools/aiworkflow/diff_analyzer.bat`
- `tools/aiworkflow/diff_analyzer.ps1`
- `status`, `analyze`, and `read` commands
- latest ExecutionResult lookup
- explicit `result_id` analysis
- DiffAnalysis records
- diff analysis manifest storage
- TaskRunState diff analyzer projection
- unified diff parsing
- changed-file, additions, deletions, hunk, binary, and change-type summaries
- file category summaries
- attention-signal observations
- display-only progress event
- WF-304 VerificationReport handoff fields
- blueprint documentation
- local script README updates

Excluded:

- pass/fail judgment
- VerificationReport
- CompletionReport
- Completion Card
- automatic approval policy
- automatic task done
- arbitrary shell execution
- build/test execution
- game source or data changes
- commit, push, release, or deploy automation

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Diff_Analyzer.md`
- `tools/aiworkflow/README.md`
- `tools/aiworkflow/diff_analyzer.bat`
- `tools/aiworkflow/diff_analyzer.ps1`

## Architecture Notes

Diff Analyzer is an analysis layer, not a verification layer.

The analyzer writes:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/diff_analysis_manifest.json
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/diff_analysis/<analysis_id>.json
```

DiffAnalysis records include `collection.verification_judgment = null` and
`collection.completion_state = null` so later layers remain responsible for
judgment and completion.

Attention signals such as `workflow_tool_changed`, `game_source_changed`, or
`large_file_diff` are observations only. They are intended to help
VerificationReport decide what evidence needs human attention.

## Implementation Notes

`diff_analyzer.ps1 analyze` reads the latest ExecutionResult by default, or a
specific `result_id` when provided.

The DiffAnalysis includes:

- source ExecutionResult reference
- source diff snapshot references
- per-snapshot file summaries
- flattened file summaries
- category counts
- change-type counts
- total additions/deletions
- attention signals
- WF-304 handoff fields

The analyzer appends a display-only `diff_analysis_created` ProgressEventLog
entry after writing an analysis.

## Review Summary

Implementation review confirmed:

- no command execution is performed
- no pass/fail or completion decision is written
- missing runtime workspace is rejected
- missing ExecutionResult is rejected
- missing diff snapshot is rejected
- duplicate analysis IDs are rejected
- generated paths are kept under `_Temp/AIWorkflowRuntime/`
- task lifecycle state remains unchanged by analyzer commands

Error messages for missing ExecutionResult and missing DiffAnalysis were
polished from low-level file-read messages into user-facing tool messages.

## Validation Summary

Executed:

- PowerShell parser check for `tools/aiworkflow/diff_analyzer.ps1`
- `tools\aiworkflow\diff_analyzer.bat status WF-302 --json`
- `tools\aiworkflow\diff_analyzer.bat analyze WF-20260511-182549 --json`
- `tools\aiworkflow\diff_analyzer.bat status WF-20260511-182549 --json`
- `tools\aiworkflow\diff_analyzer.bat read WF-20260511-182549 --json`
- `tools\aiworkflow\diff_analyzer.bat analyze WF-301 --json`
- duplicate analysis rejection
- missing ExecutionResult rejection
- missing runtime workspace rejection
- missing DiffAnalysis rejection
- missing diff snapshot rejection with temporary snapshot rename and restore
- empty-result analysis guard for WF-302

Observed:

- Existing WF-209/210 runtime diff snapshot produced a DiffAnalysis with
  5 changed files, 214 additions, 25 deletions, `workflow_state` and
  `aiworkflow_tool` categories, and attention signals.
- Empty WF-301 result produced a valid DiffAnalysis with `no_diff_snapshots`.
- Verification and completion fields remained null.
- All failed guard cases returned `task_lifecycle_unchanged = true`.

Final checks:

- JSON parse checks for generated DiffAnalysis records
- invariant checks for verification/completion null fields
- `git diff --check`
- forbidden path checks
- private/local tracked-file checks

All final checks passed. `git diff --check` reported line-ending normalization
warnings only.

## Remaining Risks

- Diff Analyzer does not yet have Discord-facing display commands.
- DiffAnalysis is an observation record; WF-304 still needs to decide how
  attention signals map to task-specific verification requirements.
- Diff parsing targets normal unified git diff snapshots. Exotic quoted-path
  edge cases may need additional hardening if they appear in real game work.

## Next Tasks

- WF-303 Implement Build/Test Runner integration.
- WF-304 Implement VerificationReport after diff and build/test evidence are
  stable enough.

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-302 scope.
Runtime artifacts were generated under `_Temp/` for validation and are not
intended to be committed.

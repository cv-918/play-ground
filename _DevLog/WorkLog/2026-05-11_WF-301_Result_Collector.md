# WF-301 Result Collector

## Summary

Implemented the WF-301 Result Collector layer for AIWorkflow runtime sessions.

The new collector aggregates existing runtime artifacts into ExecutionResult
records under `_Temp/AIWorkflowRuntime/`. It summarizes sessions, evidence,
changed files, diff snapshots, logs, runtime controls, and progress events for
later Phase 3 layers.

## Background

Phase 2 now records task workspaces, sessions, evidence, progress, file-change
snapshots, and runtime controls. Phase 3 needs a stable way to gather those
records before Diff Analyzer, VerificationReport, CompletionReport, and
Completion Card layers judge or present the result.

WF-301 provides that aggregation point without adding judgment or completion
behavior.

## Scope

Included:

- `tools/aiworkflow/result_collector.bat`
- `tools/aiworkflow/result_collector.ps1`
- `status`, `collect`, and `read` commands
- task-level result collection
- optional session-scoped result collection
- ExecutionResult records
- result manifest storage
- TaskRunState result collector projection
- SessionState summary aggregation
- EvidenceRecord summary aggregation
- changed-file, diff-snapshot, stdout, and stderr reference summaries
- RuntimeControlHistory projection-based summary
- ProgressEventLog summary
- WF-302 and WF-304 handoff fields
- blueprint documentation
- local script README updates

Excluded:

- Diff Analyzer judgment
- VerificationReport
- CompletionReport
- Completion Card
- automatic approval policy
- automatic task done
- arbitrary shell execution
- build/test execution
- game source or data changes
- commit, push, release, or deploy

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Result_Collector.md`
- `tools/aiworkflow/README.md`
- `tools/aiworkflow/result_collector.bat`
- `tools/aiworkflow/result_collector.ps1`

## Architecture Notes

Result Collector is a collection layer, not a verification layer.

The collector writes:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/result_manifest.json
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/results/<result_id>.json
```

ExecutionResult records include `collection.verification_judgment = null` and
`collection.completion_state = null` so later layers remain responsible for
judgment and completion.

Runtime controls are summarized by latest projection per `control_id`, not raw
append-only history. This prevents old pending rows from being counted as
current pending decisions after approval or rejection.

## Implementation Notes

`result_collector.ps1 collect` can collect all sessions for a task or one
session by `session_id`.

The ExecutionResult includes:

- task run summary
- session summaries
- evidence summaries
- changed file references
- diff snapshot path references
- stdout/stderr log references
- observed exit-code summary
- runtime control summary
- recent progress events
- handoff fields for WF-302 Diff Analyzer and WF-304 VerificationReport

The collector appends a display-only `result_collected` ProgressEventLog entry
after writing a result.

## Review Summary

Initial validation exposed two result-shape issues:

- diff snapshot objects were being stringified as PowerShell object text in the
  WF-302 handoff field
- raw RuntimeControlHistory pending rows were counted even after later
  approvals

Both were fixed before final validation. Diff snapshots are now exposed as
paths, and runtime controls are summarized by latest projection.

## Validation Summary

Executed:

- PowerShell parser check for `tools/aiworkflow/result_collector.ps1`
- `tools\aiworkflow\result_collector.bat status WF-301 --json`
- `tools\aiworkflow\result_collector.bat collect WF-301 --json`
- `tools\aiworkflow\result_collector.bat read WF-301 --json`
- `tools\aiworkflow\result_collector.bat status WF-20260511-182549 --json`
- `tools\aiworkflow\result_collector.bat collect WF-20260511-182549 --json`
- `tools\aiworkflow\result_collector.bat read WF-20260511-182549 --json`
- `tools\aiworkflow\result_collector.bat collect WF-20260511-182549 session-runtime-control-sleep-003 --json`
- missing-session rejection with `session-missing`

Observed:

- Empty WF-301 workspace collection produced a valid zero-session
  ExecutionResult.
- Existing WF-209/210 runtime artifacts produced task-level and session-scoped
  ExecutionResult records.
- Diff snapshot handoff fields contain path strings.
- Runtime control pending count uses projected latest state.
- Missing session collection is rejected.
- `task_lifecycle_unchanged` remains true.

Final checks:

- `git diff --check` passed with line-ending normalization warnings only.
- `git status --short -- PlayGround\Project PlayGround\Data` reported no
  game source or data changes.
- `git status --short -- _Temp _Local .env node_modules tools\discord-orchestrator\discord_bot.local.json`
  reported no private/local tracked changes.
- `git ls-files _Temp _Local .env node_modules tools\discord-orchestrator\discord_bot.local.json`
  reported no tracked private/local files.

## Remaining Risks

- Result Collector does not yet have Discord-facing display commands.
- Result records are local runtime artifacts and are not durable DevLog
  evidence unless copied into a reviewed log.
- VerificationReport, CompletionReport, Completion Card, and Auto Approval
  remain separate Phase 3 tasks.

## Next Tasks

- WF-302 Implement Diff Analyzer.
- WF-304 Implement VerificationReport after build/test and diff inputs are
  stable enough.

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-301 scope.
Runtime artifacts were generated under `_Temp/` for validation and are not
intended to be committed.

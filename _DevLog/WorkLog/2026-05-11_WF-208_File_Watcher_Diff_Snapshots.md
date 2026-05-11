# WF-208 File Watcher and Diff Snapshots

## Summary

Implemented the WF-208 file watcher and diff snapshot observation layer for
AIWorkflow runtime sessions.

The change adds a bounded local file watcher command that records changed files
and git diff snapshots as runtime evidence, links the result to the existing
Evidence Collector, and exposes recent changed-file summaries through Session
Supervisor output.

## Background

WF-204 Evidence Collector already had fields for `changed_files` and
`git_diff_snapshots`, and WF-207 Session Supervisor already exposed
task/session progress details. WF-208 adds the missing observation layer that
captures changed-file and diff-snapshot data without judging, controlling, or
finalizing work.

## Scope

Included:

- `tools/aiworkflow/file_watcher.bat`
- `tools/aiworkflow/file_watcher.ps1`
- tracked example config for ignore policy
- one-shot `snapshot` command
- bounded polling `watch` command
- read-only `status` command
- EvidenceRecord linkage through `evidence_collector.ps1`
- ProgressEventLog file-change and diff-snapshot events
- Session Supervisor recent changed-file summary output
- file watcher blueprint documentation
- local script README updates

Excluded:

- Runtime Control Adapter
- pause, stop, retry, or replan controls
- VerificationReport or pass/fail judgment
- CompletionReport or Completion Card
- automatic approval
- task done
- commit or push
- game source or game data changes

## Files Changed

- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_File_Watcher_Diff_Snapshot.md`
- `tools/aiworkflow/README.md`
- `tools/aiworkflow/evidence_collector.ps1`
- `tools/aiworkflow/session_supervisor.ps1`
- `tools/aiworkflow/file_watcher.bat`
- `tools/aiworkflow/file_watcher.example.json`
- `tools/aiworkflow/file_watcher.ps1`

## Architecture Notes

WF-208 keeps responsibility boundaries intact:

- File Watcher observes changed files and captures diff snapshots.
- Evidence Collector stores EvidenceRecord metadata.
- Session Supervisor exposes display summaries.
- Runtime Control remains separate and is not implemented here.
- Verification and completion decisions remain out of scope.

The watcher resolves the observed workspace from
`TaskRunState.workspace.worktree_path` when present, otherwise from the
repository root. Runtime artifacts are written under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
```

## Implementation Notes

`file_watcher.ps1 snapshot` records one observation pass and calls
`evidence_collector.ps1` to create or update the EvidenceRecord.

When untracked files are included, the diff snapshot also records small
untracked text-file contents in a dedicated section. Large files and
binary-looking files are listed with omission notes instead of inline contents.

`file_watcher.ps1 watch` performs bounded polling and records snapshots when
the changed-file set is present or changes during the watch window.

`session_supervisor.ps1 read --json` now includes:

```text
session_detail.file_change_summary
session_detail.changed_files_count
session_detail.recent_changed_files
session_detail.latest_diff_snapshot_path
session_detail.last_file_change_at
```

`session_supervisor.ps1 status --json` includes the same changed-file summary
fields in session summaries when available.

`Get-EventId` in runtime event writers now appends a short GUID suffix so rapid
ProgressEventLog writes do not reuse the same millisecond timestamp id.
Auto-generated watch evidence IDs and diff reference IDs also include a short
GUID suffix to avoid collisions during rapid polling.

## Review Summary

During validation, the first local snapshot attempts exposed three script
issues:

- native git stderr warnings needed process-level stdout/stderr capture
- Windows PowerShell `ProcessStartInfo.ArgumentList` compatibility needed
  string argument construction
- inline `if` inside the snapshot content array needed explicit variables
- newly created untracked files were listed as changed files, but needed
  explicit untracked text-file sections because plain `git diff` does not show
  untracked file contents
- untracked text-file sections needed to honor the `include_untracked` config
  instead of being captured independently from the changed-file policy

Those issues were fixed before the successful snapshot/watch validation.

## Validation Summary

Executed:

- `git status --short`
- PowerShell parser checks for:
  - `tools/aiworkflow/file_watcher.ps1`
  - `tools/aiworkflow/session_supervisor.ps1`
  - `tools/aiworkflow/evidence_collector.ps1`
- JSON parse check for `tools/aiworkflow/file_watcher.example.json`
- `tools\aiworkflow\task_workspace_manager.bat create WF-20260508-172728 --json`
- `tools\aiworkflow\session_supervisor.bat create WF-20260508-172728 session-filewatcher-validation-001 --executor file_watcher --activity "WF-208 file watcher validation session." --json`
- `tools\aiworkflow\file_watcher.bat status WF-20260508-172728 session-filewatcher-validation-001 --json`
- `tools\aiworkflow\file_watcher.bat snapshot WF-20260508-172728 session-filewatcher-validation-001 evidence-filewatcher-validation-001 --json`
- `tools\aiworkflow\evidence_collector.bat read WF-20260508-172728 session-filewatcher-validation-001 evidence-filewatcher-validation-001 --json`
- `tools\aiworkflow\session_supervisor.bat read WF-20260508-172728 session-filewatcher-validation-001 --json`
- `tools\aiworkflow\session_supervisor.bat status WF-20260508-172728 --json`
- `tools\aiworkflow\file_watcher.bat watch WF-20260508-172728 session-filewatcher-validation-001 --duration-seconds 0 --max-snapshots 1 --snapshot-on-start --json`
- `tools\aiworkflow\file_watcher.bat snapshot WF-20260508-172728 session-filewatcher-validation-001 evidence-filewatcher-no-untracked-review-001 --config _Temp\AIWorkflowRuntime\validation\file_watcher_no_untracked.json --json`
- `git diff --check`
- `git diff --stat`
- `git status --short -- PlayGround\Project PlayGround\Data`
- `git status --short -- _Temp _Local .env node_modules tools\discord-orchestrator\discord_bot.local.json`
- `git ls-files _Temp _Local .env node_modules tools\discord-orchestrator\discord_bot.local.json`

Observed:

- `snapshot` reported changed files and wrote a diff snapshot under `_Temp`.
- EvidenceRecord stored `executor = file_watcher`, `changed_files`, and
  `git_diff_snapshots`.
- EvidenceRecord `judgment.pass_fail` remained `null`.
- Session Supervisor read output included recent changed files and latest diff
  snapshot path.
- Session Supervisor status output included changed-file summary fields for the
  session.
- `watch` recorded a bounded snapshot without applying control actions.
- Auto-generated watch evidence IDs include timestamp milliseconds and a short
  GUID suffix.
- With `include_untracked = false`, changed-file evidence excluded untracked
  files and the diff snapshot's untracked section was marked disabled.
- `pass_fail_judgment` remained `null` and `control_action_applied` remained
  `false`.
- No `PlayGround/Project` or `PlayGround/Data` changes were reported.
- `_Temp`, `_Local`, `.env`, `node_modules`, and Discord local config were not
  reported as tracked changes.
- `git diff --check` completed successfully; Git printed line-ending warnings
  for existing text-file normalization behavior.

## Remaining Risks

- Discord command/UI integration for rendering runtime session details still
  requires a separate command or display task.
- Runtime Control is still a separate implementation task and must consume
  watcher observations without collapsing ownership into the watcher.

## Next Tasks

- WF-209 Implement Runtime Control Adapter.
- WF-210 Implement pause, stop, retry, and replan controls.

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-208
scope. Runtime artifacts were generated under `_Temp/` for validation and are
not intended to be committed.

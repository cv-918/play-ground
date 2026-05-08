# WF-207 Progress and Heartbeat Collection

## Summary

Implemented reduced-scope progress and heartbeat collection for AIWorkflow
runtime sessions.

The change extends Session Supervisor runtime state and output so future
`/tasks`-style and `/task`-style views can display current activity, heartbeat,
and idle/stalled candidate state.

## Background

WF-203 introduced SessionState records and heartbeat updates. WF-205 and
WF-206 adapters already call Session Supervisor with activity strings during
execution start, completion, and failure paths.

WF-207 standardizes those activity updates into progress summary data.

## Scope

Included:

- `session_id`-based heartbeat and activity recording
- `last_heartbeat_at`, `last_activity_at`, `last_activity`, and
  `activity_summary` fields
- TaskRunState progress summary updates
- ProgressEventLog append and recent event readback
- task-level runtime summary data from `session_supervisor status --json`
- session-level runtime detail data from `session_supervisor read --json`
- display-only idle/stalled candidate state
- WF-208 file watcher/diff snapshot handoff documentation

Excluded:

- file watcher
- diff snapshotter
- Runtime Control Adapter
- pause, stop, retry, or replan controls
- Verification Gate
- Completion Card
- automatic approval
- executor routing changes
- pass/fail judgment
- git commit or push

## Files Changed

- `tools/aiworkflow/session_supervisor.ps1`
- `tools/aiworkflow/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Session_Supervisor.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Progress_Heartbeat_Collection.md`
- `_DevLog/WorkLog/2026-05-08_WF-207_Progress_Heartbeat_Collection.md`

## Architecture Notes

WF-207 keeps lifecycle and runtime state separated.

The new summary/detail data is derived from runtime workspace files under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
```

Idle/stalled state is display-only. It does not control execution and does not
change SessionState status automatically.

## Validation Summary

Executed:

- `git status --short`
- PowerShell parse check for `tools/aiworkflow/session_supervisor.ps1`
- `tools\aiworkflow\task_workspace_manager.bat status WF-20260508-155647 --json`
- `tools\aiworkflow\session_supervisor.bat status WF-20260508-155647 --json`
- `tools\aiworkflow\session_supervisor.bat read WF-20260508-155647 session-progress-validation-001 --json`
- `tools\aiworkflow\session_supervisor.bat read WF-20260508-155647 session-progress-codex-001 --json`
- `powershell -NoProfile -ExecutionPolicy Bypass -File tools\aiworkflow\session_supervisor.ps1 -Command status -TaskId WF-20260508-155647 -StalledAfterMinutes 0 -Json`

Observed:

- `status --json` returned task-level `runtime_summary` with two running sessions.
- `read --json` returned session-level `session_detail` with heartbeat,
  activity summary, and recent progress events.
- Local CLI and Codex CLI executor activity strings were both reflected as
  progress data.
- `StalledAfterMinutes 0` produced `stalled_candidate` display state while
  preserving `idle_stalled_display_only: true`.

## Remaining Risks

- Future Discord `/tasks` and `/task` views still need separate UI/command work.
- Existing older SessionState files may not contain the new fields, so readers
  keep fallback behavior for `last_activity_summary` and `updated_at`.

## Next Tasks

- WF-208 file watcher and diff snapshot handoff.

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-207
reduced scope.

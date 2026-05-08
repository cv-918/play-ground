# WF-203 Session Supervisor

## Summary

Implemented the reduced-scope Session Supervisor for WF Final Blueprint v7.

The supervisor creates, reads, updates, and heartbeats SessionState records
inside a WF-202 runtime task workspace.

## Background

WF-201 defined the SessionState draft schema. WF-202 implemented the task
workspace and TaskRunState creation layer. WF-203 adds the next runtime state
layer without executing external tools.

## Scope

Included:

- session ID validation rules
- SessionState create/read/update/heartbeat API
- session status validation
- heartbeat timestamp recording
- idle/stalled candidate reporting metadata
- TaskRunState runtime session registration
- progress event JSONL appends
- invalid `task_id`, `workspace_id`, and `session_id` defenses
- WF-204 Evidence Collector handoff documentation

Excluded:

- Codex CLI execution
- Local CLI execution
- process spawning
- build/test runners
- Evidence Collector behavior
- Verification Gate behavior
- completion cards
- automatic approval policy
- task lifecycle migration
- Discord command changes

## Files Changed

- `tools/aiworkflow/session_supervisor.ps1`
- `tools/aiworkflow/session_supervisor.bat`
- `tools/aiworkflow/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Session_Supervisor.md`
- `_DevLog/WorkLog/2026-05-08_WF-203_Session_Supervisor.md`

## Architecture Notes

The supervisor requires an existing WF-202 workspace. It does not create task
workspaces automatically and does not write the lifecycle task state layer.

SessionState records are linked by `task_id`, `workspace_id`, and
`session_id`. Runtime events are appended to `progress_events.jsonl`.

## Implementation Notes

The local API is:

```bat
tools\aiworkflow\session_supervisor.bat status task_id [session_id] [--json]
tools\aiworkflow\session_supervisor.bat create task_id [session_id] [--executor value] [--activity text] [--json]
tools\aiworkflow\session_supervisor.bat read task_id session_id [--json]
tools\aiworkflow\session_supervisor.bat update task_id session_id --status value [--activity text] [--json]
tools\aiworkflow\session_supervisor.bat heartbeat task_id session_id [--status value] [--activity text] [--json]
```

## Review Summary

Self-review checked that the implementation stays in the WF-203 reduced scope:

- task lifecycle state is not written
- session state is stored only under `_Temp/AIWorkflowRuntime/`
- `task_id`, `workspace_id`, and `session_id` are validated before reads or
  writes
- heartbeat updates record timestamps only
- no process spawn, executor adapter, build/test runner, Evidence Collector,
  Verification Gate, completion card, or automatic approval policy was added

## Validation Summary

Initial validation performed:

- PowerShell parse check for `session_supervisor.ps1`: passed
- WF-203 task workspace creation through `task_workspace_manager.bat`: passed
- `session_supervisor.bat create WF-20260508-101245 session-validation-001 --json`: passed
- `session_supervisor.bat read WF-20260508-101245 session-validation-001 --json`: passed
- `session_supervisor.bat update ... --status running --json`: passed
- `session_supervisor.bat heartbeat ... --json`: passed
- `session_supervisor.bat status WF-20260508-101245 --json`: passed
- duplicate session creation rejection: passed
- invalid status rejection: passed
- invalid session ID rejection: passed
- missing workspace rejection: passed
- generated SessionState JSON parse check: passed
- TaskRunState active session/status update check: passed
- progress event JSONL append check: passed

Final repository validation is recorded in the Codex completion response.

## Remaining Risks

- Idle/stalled detection is report-only. No automatic stalled transition is
  performed.
- Session status is runtime metadata only and does not imply task lifecycle
  approval, done, or commit readiness.

## Next Tasks

- WF-204 Evidence Collector

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-203
reduced scope.

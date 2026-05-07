# WF Execution State Model

## Purpose

This document defines the WF-201 execution state model for WF Final Blueprint
v7.

It separates the existing task lifecycle state from new runtime execution
state. The existing task state behavior remains unchanged. Runtime state is a
separate draft storage model linked to existing tasks by `task_id`.

This document is documentation/schema-draft only. It does not implement an
Execution Adapter, build/test runner, migration, command behavior change, or
runtime automation.

---

## Non-Goals

WF-201 does not:

- replace `_Docs/AIWorkflow/Task_State_Model.md`
- migrate `Backlog.md` or `ActiveTask.md`
- change Discord task command behavior
- implement Task Workspace Manager
- implement Session Supervisor
- implement Evidence Collector
- implement Codex CLI, Local CLI, build/test, or runtime adapters
- define automatic approval or automatic completion behavior

---

## State Separation

### Task Lifecycle State

Task lifecycle state answers:

```text
What is the workflow task's review/approval/completion status?
```

Current source of truth:

```text
_Docs/AIWorkflow/Task_State_Model.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
```

The current task states and transitions stay authoritative for the existing
Discord workflow. Runtime execution state must not write over, reinterpret, or
advance task lifecycle state.

### Runtime Execution State

Runtime execution state answers:

```text
What is happening in a concrete execution run for a task?
```

Runtime state is separate and run-scoped. It records execution attempts,
sessions, progress events, and runtime control decisions for future PC Runner
automation.

Runtime state can inform future review and evidence collection, but it cannot
by itself approve, mark done, commit, push, or change task lifecycle state.

---

## Linkage Rule

The required linkage key is:

```text
task_id
```

Every runtime state record must include `task_id` exactly as it appears in the
task lifecycle layer.

Runtime records may also include derived IDs:

```text
run_id
session_id
event_id
control_id
```

Derived IDs never replace `task_id`; they only identify runtime subrecords.

---

## Draft Storage Layout

The draft runtime state storage root is:

```text
_Temp/AIWorkflowRuntime/
```

This keeps live runtime state separate from durable workflow source-of-truth
documents. Future completion summaries, evidence reports, or Dev Logs may copy
selected evidence into durable `_DevLog/` records after human review.

Draft layout:

```text
_Temp/AIWorkflowRuntime/
  tasks/
    <task_id>/
      task_run_state.json
      sessions/
        <session_id>.json
      progress_events.jsonl
      runtime_control_history.jsonl
      evidence/
        manifest.json
        logs/
        diffs/
        reports/
```

Storage rules:

- `task_run_state.json` is one current aggregate per task.
- `sessions/<session_id>.json` is one record per execution session.
- `progress_events.jsonl` is append-only event history.
- `runtime_control_history.jsonl` is append-only control intent and decision
  history.
- `evidence/` is reserved for WF-204 Evidence Collector output.
- `_Temp/AIWorkflowRuntime/` artifacts are local runtime artifacts and should
  not be committed.

---

## Runtime State Enums

### TaskRunState.status

Use these run-level statuses:

```text
not_started
starting
running
idle
stalled
blocked
verifying
failed
finalized
cancelled
```

Meanings:

| Status | Meaning |
|---|---|
| `not_started` | Runtime state exists, but no session has started |
| `starting` | A run has been requested and setup is in progress |
| `running` | At least one execution session is actively working |
| `idle` | No active work is detected, but the run is not failed or finalized |
| `stalled` | Expected progress or heartbeat is missing |
| `blocked` | Execution cannot continue without a decision or external fix |
| `verifying` | Evidence collection or verification is in progress |
| `failed` | Execution ended with failure requiring review or recovery |
| `finalized` | Runtime run is closed and no further execution is expected |
| `cancelled` | Run was intentionally stopped and abandoned |

### SessionState.status

Use these session-level statuses:

```text
created
starting
running
waiting
paused
stalled
stopping
failed
completed
cancelled
```

### RuntimeControlHistory.action

Use these control actions:

```text
pause
resume
stop
retry
replan
scope_reduce
executor_change
manual_escalation
```

All runtime control actions are records of intent and decision. WF-201 does not
authorize automatic execution of these actions.

---

## TaskRunState Draft Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/task_run_state.json
```

Draft JSON:

```json
{
  "schema_version": 1,
  "task_id": "WF-20260508-045640",
  "run_id": "run-20260508-045640-001",
  "status": "not_started",
  "task_lifecycle_snapshot": {
    "source": "Backlog.md",
    "task_status": "ready_for_implementation",
    "priority": "P1",
    "kind": "documentation",
    "captured_at": "2026-05-08T04:56:40+09:00"
  },
  "active_session_id": null,
  "session_ids": [],
  "workspace": {
    "workspace_id": null,
    "workspace_path": null,
    "worktree_path": null,
    "created_by": "WF-202 Task Workspace Manager"
  },
  "executor_plan": {
    "planned_executor": null,
    "adapter_id": null,
    "adapter_version": null
  },
  "progress": {
    "last_event_id": null,
    "last_event_at": null,
    "last_heartbeat_at": null,
    "current_step": null
  },
  "evidence": {
    "manifest_path": null,
    "latest_report_path": null,
    "collector_status": "not_started"
  },
  "control": {
    "latest_control_id": null,
    "pending_human_decision": null
  },
  "created_at": "2026-05-08T04:56:40+09:00",
  "updated_at": "2026-05-08T04:56:40+09:00"
}
```

Required fields:

```text
schema_version
task_id
run_id
status
task_lifecycle_snapshot
created_at
updated_at
```

Invalid-data behavior:

- missing `task_id`: reject the runtime state record
- `task_id` not found in lifecycle layer: mark run `blocked`
- unknown `status`: reject the runtime state record
- missing optional nested object: treat as empty/default, then rewrite only by
  the responsible future manager

---

## SessionState Draft Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/sessions/<session_id>.json
```

Draft JSON:

```json
{
  "schema_version": 1,
  "task_id": "WF-20260508-045640",
  "run_id": "run-20260508-045640-001",
  "session_id": "session-20260508-045700-001",
  "status": "created",
  "executor": {
    "executor_type": "codex_cli",
    "adapter_id": null,
    "command_line": null,
    "working_directory": null
  },
  "process": {
    "pid": null,
    "started_at": null,
    "ended_at": null,
    "exit_code": null
  },
  "heartbeat": {
    "last_heartbeat_at": null,
    "last_activity_summary": null,
    "idle_seconds": 0
  },
  "outputs": {
    "stdout_log": null,
    "stderr_log": null,
    "summary_path": null
  },
  "workspace": {
    "workspace_path": null,
    "changed_files_count": 0
  },
  "created_at": "2026-05-08T04:57:00+09:00",
  "updated_at": "2026-05-08T04:57:00+09:00"
}
```

Required fields:

```text
schema_version
task_id
run_id
session_id
status
executor
created_at
updated_at
```

Ownership:

- WF-203 Session Supervisor owns session creation, status, heartbeat, and
  process metadata.
- WF-204 Evidence Collector may read session outputs but should not mutate
  session lifecycle fields.

---

## ProgressEventLog Draft Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/progress_events.jsonl
```

Each line is one JSON object:

```json
{
  "schema_version": 1,
  "event_id": "event-20260508-045710-001",
  "task_id": "WF-20260508-045640",
  "run_id": "run-20260508-045640-001",
  "session_id": "session-20260508-045700-001",
  "event_type": "heartbeat",
  "severity": "info",
  "message": "Session heartbeat received.",
  "source": "session_supervisor",
  "data": {
    "current_step": "collecting_context"
  },
  "created_at": "2026-05-08T04:57:10+09:00"
}
```

Allowed `event_type` values:

```text
run_created
session_created
session_started
heartbeat
stdout
stderr
file_change_detected
diff_snapshot_created
evidence_collected
verification_started
verification_finished
blocked
failed
finalized
manual_note
```

Rules:

- append-only
- no deletion or in-place edits
- pasted output excerpts must be bounded and may be moved to log files when
  large
- event records must not contain secrets or local private config values

---

## RuntimeControlHistory Draft Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/runtime_control_history.jsonl
```

Each line is one JSON object:

```json
{
  "schema_version": 1,
  "control_id": "control-20260508-045800-001",
  "task_id": "WF-20260508-045640",
  "run_id": "run-20260508-045640-001",
  "session_id": "session-20260508-045700-001",
  "action": "pause",
  "requested_by": "Human Director",
  "request_source": "discord",
  "reason": "Scope clarification required before continuing.",
  "decision": "accepted",
  "applied": false,
  "requires_human_approval": true,
  "created_at": "2026-05-08T04:58:00+09:00",
  "decided_at": "2026-05-08T04:58:30+09:00"
}
```

Required fields:

```text
schema_version
control_id
task_id
run_id
action
requested_by
request_source
reason
decision
applied
requires_human_approval
created_at
```

Rules:

- append-only
- `applied: true` is forbidden until a future Runtime Control Adapter exists
- high-risk or destructive actions must remain `requires_human_approval: true`
- control history cannot change task lifecycle state directly

---

## Responsibility Boundaries

| Component | Future Responsibility | WF-201 Status |
|---|---|---|
| Task Lifecycle Layer | Backlog/ActiveTask state and human approval lifecycle | Existing behavior preserved |
| Runtime State Layer | TaskRunState, SessionState, ProgressEventLog, RuntimeControlHistory | Draft schema only |
| WF-202 Task Workspace Manager | Create isolated workspace/worktree and record workspace paths | Not implemented |
| WF-203 Session Supervisor | Create sessions, track process/heartbeat/status | Not implemented |
| WF-204 Evidence Collector | Collect logs, diffs, reports, changed file evidence | Not implemented |
| Execution Adapters | Run Codex CLI, Local CLI, or other executors | Not implemented |
| Verification Gates | Judge collected evidence against policy | Not implemented |

---

## Future Task Hand-Off

WF-202 Task Workspace Manager should use:

```text
TaskRunState.workspace
_Temp/AIWorkflowRuntime/tasks/<task_id>/
```

WF-203 Session Supervisor should use:

```text
TaskRunState.active_session_id
TaskRunState.session_ids
SessionState
ProgressEventLog event types: session_created, session_started, heartbeat,
blocked, failed, finalized
```

WF-204 Evidence Collector should use:

```text
TaskRunState.evidence
SessionState.outputs
ProgressEventLog event types: file_change_detected, diff_snapshot_created,
evidence_collected, verification_started, verification_finished
```

These future tasks must keep the same separation rule: runtime state may record
evidence and recommendations, but task lifecycle transitions still require the
existing approval and completion rules.

---

## Review Checklist

- Existing `Task_State_Model.md` remains unchanged.
- Runtime state is stored separately from Backlog/ActiveTask state.
- Every runtime record includes `task_id`.
- Storage format is draft-only and does not create runtime artifacts.
- No Execution Adapter, build/test runner, migration, or task command behavior
  change is implied by this document.
- WF-202, WF-203, and WF-204 have clear fields to consume.

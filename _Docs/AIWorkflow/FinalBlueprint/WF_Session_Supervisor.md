# WF Session Supervisor

## Purpose

This document defines the WF-203 Session Supervisor implementation scope.

The supervisor registers, reads, and updates runtime execution sessions inside
a WF-202 task workspace. It follows the WF-201 SessionState draft format and
links every session to:

```text
task_id
workspace_id
session_id
```

The existing task lifecycle layer remains authoritative. Session state can
record runtime activity but cannot approve, complete, commit, push, or migrate
workflow tasks.

---

## Non-Goals

WF-203 does not implement:

- Codex CLI execution
- Local CLI execution
- process spawning
- build/test runners
- Evidence Collector behavior
- Verification Gate behavior
- completion cards
- automatic approval policy
- task lifecycle migration
- Discord command behavior changes

---

## Required Workspace

The supervisor requires an existing WF-202 workspace:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
  workspace_metadata.json
  task_run_state.json
  sessions/
  progress_events.jsonl
```

If the workspace or required state files are missing, the supervisor rejects
the command. It does not create task workspaces automatically.

---

## Session ID Rules

A valid `session_id`:

- starts with `session-`
- uses only letters, numbers, `_`, `-`, and `.`
- does not contain path separators
- does not contain `..`

Generated session IDs use:

```text
session-YYYYMMDD-HHMMSS-NNN
```

Examples:

```text
session-20260508-101500-001
session-manual-review-001
```

---

## SessionState Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/sessions/<session_id>.json
```

WF-203 creates the WF-201 fields and adds a top-level `workspace_id` link:

| Field | Meaning |
|---|---|
| `schema_version` | Session schema version, currently `1` |
| `task_id` | Existing lifecycle task ID |
| `run_id` | TaskRunState run ID |
| `workspace_id` | WF-202 workspace ID |
| `session_id` | Runtime session ID |
| `status` | Session status |
| `executor` | Executor metadata only; no execution is started |
| `process` | Process metadata placeholders only |
| `heartbeat` | Last heartbeat and idle/stalled detection metadata |
| `outputs` | Output path placeholders for future collectors |
| `workspace` | Workspace path and changed file count placeholder |
| `handoff` | WF-204 Evidence Collector handoff paths |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

---

## Session Status Values

Allowed statuses follow WF-201:

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

Status changes are records only. They do not start, stop, or control an
external process.

---

## Local API

Commands:

```bat
tools\aiworkflow\session_supervisor.bat status task_id [session_id] [--json]
tools\aiworkflow\session_supervisor.bat create task_id [session_id] [--executor value] [--activity text] [--json]
tools\aiworkflow\session_supervisor.bat read task_id session_id [--json]
tools\aiworkflow\session_supervisor.bat update task_id session_id --status value [--activity text] [--json]
tools\aiworkflow\session_supervisor.bat heartbeat task_id session_id [--status value] [--activity text] [--json]
```

Behavior:

| Command | Behavior | Writes |
|---|---|---|
| `status` | Lists sessions and computed idle/stalled candidate metadata | No |
| `create` | Creates one SessionState and registers it in TaskRunState | `_Temp/AIWorkflowRuntime/` only |
| `read` | Reads one SessionState | No |
| `update` | Updates SessionState status/activity metadata | `_Temp/AIWorkflowRuntime/` only |
| `heartbeat` | Updates heartbeat timestamp and activity metadata | `_Temp/AIWorkflowRuntime/` only |

---

## TaskRunState Updates

WF-203 updates only runtime fields:

```text
task_run_state.status
task_run_state.active_session_id
task_run_state.session_ids
task_run_state.progress.last_event_at
task_run_state.progress.last_heartbeat_at
task_run_state.progress.current_step
task_run_state.progress.last_activity_at
task_run_state.progress.last_activity
task_run_state.progress.activity_summary
task_run_state.updated_at
```

If TaskRunState is `not_started`, session creation may move it to `idle`
because a runtime session record now exists. This does not change lifecycle
task status.

---

## Progress Event Recording

WF-203 appends bounded JSONL records to:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/progress_events.jsonl
```

Used event types:

```text
session_created
session_started
heartbeat
manual_note
blocked
failed
```

These events are runtime evidence for later review. They are not verification
results and do not mark a task done.

---

## Idle/Stalled Metadata

`status` and `read` compute idle metadata from:

```text
heartbeat.last_heartbeat_at
updated_at
```

The default stalled candidate threshold is 30 minutes. This is reporting
metadata only. WF-203 does not automatically change a session to `stalled`.

---

## WF-207 Progress and Heartbeat Extension

WF-207 extends Session Supervisor output without adding process control.

`status --json` exposes task-level `runtime_summary` for `/tasks`-style
displays:

```text
run_status
active_session_id
running_session_count
stalled_candidate_count
latest_activity
sessions[]
```

`read --json` exposes session-level `session_detail` for `/task`-style
displays:

```text
last_heartbeat_at
last_activity_at
last_activity
activity_summary
recent_progress_events
```

`heartbeat` and `update --activity` write activity metadata under
`SessionState.heartbeat` and append ProgressEventLog entries. Idle/stalled
remains display-only and does not stop, pause, retry, replan, fail validation,
or mark tasks done.

---

## WF-204 Handoff

WF-204 Evidence Collector may read:

```text
SessionState.outputs
SessionState.workspace
SessionState.handoff.wf_204_evidence_collector
progress_events.jsonl
evidence/
```

WF-204 must not mutate session lifecycle fields such as `status`,
`heartbeat`, `process`, `created_at`, or `updated_at`.

---

## Review Checklist

- Existing task lifecycle state remains unchanged.
- SessionState is stored under the task runtime workspace.
- `task_id`, `workspace_id`, and `session_id` are validated.
- Missing or mismatched workspace state is rejected.
- Heartbeat updates record timestamps but do not execute processes.
- No Codex CLI adapter, Local CLI adapter, process spawn, build/test runner,
  Evidence Collector, Verification Gate, completion card, or automatic approval
  policy is implemented.

# WF Progress and Heartbeat Collection

## Purpose

This document defines the WF-207 progress and heartbeat collection layer.

WF-207 extends the WF-203 Session Supervisor runtime records so task/session
views can show execution progress without adding execution control.

Runtime records remain linked by:

```text
task_id
workspace_id
session_id
```

The task lifecycle layer remains separate and authoritative for planning,
approval, done, and commit decisions.

---

## Scope

WF-207 includes:

- session_id-based heartbeat updates
- `last_heartbeat_at`, `last_activity`, and `activity_summary` recording
- ProgressEventLog append/read support
- task-level runtime summary data for `/tasks`-style views
- session-level runtime detail data for `/task`-style views
- display-only idle/stalled candidate computation
- WF-208 file watcher and diff snapshot handoff documentation

WF-207 does not implement:

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

---

## SessionState Activity Fields

Session activity is stored under `SessionState.heartbeat`:

| Field | Meaning |
|---|---|
| `last_heartbeat_at` | Last heartbeat timestamp for this session |
| `last_activity_at` | Last timestamp with a meaningful activity summary |
| `last_activity` | Latest activity text |
| `activity_summary` | Short display summary for task/session views |
| `last_activity_summary` | Backward-compatible alias for older records |
| `idle_seconds` | Reset to `0` on heartbeat writes |
| `stalled_after_minutes` | Display threshold used by status/read output |

Adapters and manual workflow scripts can reflect progress by calling:

```bat
tools\aiworkflow\session_supervisor.bat update task_id session_id --status running --activity "..."
tools\aiworkflow\session_supervisor.bat heartbeat task_id session_id --activity "..."
```

These calls record activity only. They do not control the process.

---

## ProgressEventLog

Progress events are appended to:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/progress_events.jsonl
```

Each event contains:

```text
schema_version
event_id
task_id
run_id
session_id
event_type
severity
message
source
data
created_at
```

WF-207 uses existing event types such as:

```text
session_created
session_started
heartbeat
manual_note
blocked
failed
```

Event data may include `activity`, `activity_summary`, status transition
metadata, and `display_only=true`.

---

## Runtime Summary Data

`session_supervisor.bat status task_id --json` now returns `runtime_summary`
for `/tasks`-style displays:

```text
task_id
workspace_id
run_id
run_status
active_session_id
session_count
running_session_count
stalled_candidate_count
idle_stalled_display_only
latest_activity
latest_activity_at
sessions[]
```

Each session summary includes:

```text
session_id
status
executor_type
idle_seconds
idle_state
last_heartbeat_at
last_activity_at
last_activity
activity_summary
updated_at
```

`session_supervisor.bat read task_id session_id --json` now returns
`session_detail` for `/task`-style displays, including recent progress events.

---

## Idle/Stalled Display Rule

Idle/stalled is display-only.

The supervisor computes:

```text
active_or_recent
stalled_candidate
unknown
```

from `heartbeat.last_heartbeat_at` or `updated_at`.

This computation does not:

- change SessionState status automatically
- stop or pause execution
- retry commands
- mark validation failed
- mark tasks done

Any control action remains a future, separately approved Runtime Control scope.

---

## Adapter Handoff

WF-205 Codex CLI Execution Adapter and WF-206 Local CLI Execution Adapter
already call Session Supervisor with activity text during session start,
completion, and failure paths.

Those adapter calls now populate:

```text
SessionState.heartbeat.last_activity_at
SessionState.heartbeat.last_activity
SessionState.heartbeat.activity_summary
TaskRunState.progress.last_activity_at
TaskRunState.progress.activity_summary
progress_events.jsonl
```

No adapter routing or executor policy changes are required.

---

## WF-208 Handoff

WF-208 file watcher and diff snapshot work may append additional progress
events such as file-change observations or diff snapshot references.

WF-208 must keep these responsibilities separate:

```text
WF-207: heartbeat/activity/progress display state
WF-208: file watcher and diff snapshot observation
WF-204: durable evidence records
future Runtime Control: pause/stop/retry/replan decisions
```

WF-208 must not turn idle/stalled display state into execution control without
a separate approved Runtime Control task.

---

## Review Checklist

- Existing Task Lifecycle State is unchanged.
- Heartbeat and activity writes are keyed by `session_id`.
- ProgressEventLog is append-only runtime data.
- `/tasks`-style summary data is available from `status --json`.
- `/task`-style session detail data is available from `read --json`.
- idle/stalled remains display-only.
- No file watcher, diff snapshotter, Runtime Control, Verification Gate,
  Completion Card, automatic approval, executor routing change, commit, or push
  is implemented.

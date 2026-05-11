# WF Runtime Control Adapter

## Purpose

This document defines the WF-209/210 Runtime Control Adapter layer.

WF-209/210 records runtime control intent, human approval or rejection, and
application results for task execution sessions. It gives the PC Runner a
structured control surface for:

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

The task lifecycle layer remains separate and authoritative for Backlog,
ActiveTask, approval, done, commit, push, and release decisions.

---

## Scope

WF-209/210 includes:

- append-only RuntimeControlHistory records
- `request`, `approve`, `reject`, `apply`, `read`, and `status` commands
- human approval required before applying any control request
- TaskRunState control projection for the latest runtime control state
- ProgressEventLog entries for runtime control request, decision, and apply
- Session Supervisor process metadata support for executor sessions
- Codex CLI and Local CLI adapter process metadata updates
- safe session-scoped stop using only the recorded fresh session PID
- Windows pause/resume process control for fresh recorded session PIDs
- state fallback when pause/resume/stop has no fresh recorded PID
- retry/replan/scope_reduce/executor_change/manual_escalation as handoff
  records, not automatic execution
- idempotent apply resynchronization for already-applied controls
- WF-301 Result Collector handoff boundaries

WF-209/210 does not implement:

- VerificationReport
- CompletionReport
- Completion Card
- automatic approval policy
- automatic task approval
- automatic task done
- arbitrary user shell execution
- build/test runner integration
- game source or game data changes
- commit, push, release, or deploy

---

## Local API

Commands:

```bat
tools\aiworkflow\runtime_control_adapter.bat status task_id [session_id] [--json]
tools\aiworkflow\runtime_control_adapter.bat read task_id [control_id] [--json]
tools\aiworkflow\runtime_control_adapter.bat request task_id action [session_id] --reason text [--json]
tools\aiworkflow\runtime_control_adapter.bat approve task_id control_id [--note text] [--json]
tools\aiworkflow\runtime_control_adapter.bat reject task_id control_id [--note text] [--json]
tools\aiworkflow\runtime_control_adapter.bat apply task_id control_id [--note text] [--json]
```

`status` summarizes pending controls, the latest projected control, and the
TaskRunState control projection.

`read` returns either all projected controls or one control by `control_id`.

`request` appends a pending control record and marks the TaskRunState control
projection as waiting for a human decision.

`approve` and `reject` append explicit human decisions. They do not apply the
control automatically.

`apply` only runs after an approved control exists. If the selected control was
already applied, the command resynchronizes the TaskRunState projection from
history instead of applying the side effect again.

---

## Runtime Artifacts

Runtime Control records are local runtime artifacts under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
  runtime_control_history.jsonl
  task_run_state.json
  progress_events.jsonl
```

`runtime_control_history.jsonl` is append-only. Each line contains:

```text
schema_version
record_id
control_id
task_id
run_id
session_id
action
requested_by
request_source
reason
decision
applied
requires_human_approval
note
data
created_at
decided_at
applied_at
```

These artifacts must not be committed.

---

## Human Decision Rule

Runtime control requests are never self-approved by the adapter.

The normal sequence is:

```text
request -> approve/reject -> apply
```

This keeps runtime execution control separate from the LLM and from the
executor adapters. The adapter can record a recommended action, but the human
approval step remains explicit in this layer.

---

## Session Process Control

`pause`, `resume`, and `stop` require a `session_id`.

The adapter only attempts process-level control when SessionState contains a
fresh recorded process record:

```text
process.pid
process.started_at
process.ended_at = null
```

The Codex CLI and Local CLI adapters update these fields after starting a child
process and record final process end metadata after it exits.

`stop` refuses to target the current Runtime Control process. It marks the
session `cancelled` through Session Supervisor and records whether a process
stop was attempted and whether it succeeded.

`pause` and `resume` use Windows native process suspend/resume when a fresh
recorded PID exists. If no fresh PID exists, they update session state only and
record that no process-level control was attempted.

Session Supervisor preserves `cancelled` when an executor later attempts to
write a final `completed` or `failed` status after a stop control. This avoids
the executor-final-status race from overwriting a human stop decision.

---

## Handoff Controls

These actions are recorded as controlled handoff state:

```text
retry
replan
scope_reduce
executor_change
manual_escalation
```

They do not execute a new command, change task lifecycle state, approve work,
mark work done, or select a new executor automatically. Later PC Runner layers
may consume these records, but they must still respect approval and routing
policy.

---

## Responsibility Boundaries

WF-209/210 keeps these responsibilities separate:

| Layer | Responsibility |
|---|---|
| Task Lifecycle State | Backlog, ActiveTask, approval, done, commit, and close decisions |
| Execution Adapter | Starts and records a concrete executor process |
| Session Supervisor | Stores SessionState, heartbeat, progress, status, and process metadata |
| Evidence Collector | Stores logs, changed files, diff snapshot references, and evidence metadata |
| File Watcher | Observes changed files and snapshots diffs |
| Runtime Control Adapter | Records and applies human-approved runtime controls |
| Verification Gate | Future pass/fail judgment |
| Result Collector | Future result aggregation from runtime artifacts |

Runtime Control does not verify work. Verification and completion remain later
layers.

---

## WF-301 Handoff

WF-301 Result Collector can consume:

```text
runtime_control_history.jsonl
task_run_state.control
progress_events.jsonl runtime_control_adapter events
SessionState process metadata
EvidenceRecord execution/log references
```

WF-301 should aggregate runtime results without changing the approval boundary.
It must not turn Runtime Control history into automatic task completion.

---

## Review Checklist

- Runtime control history is append-only.
- Every control requires explicit approval before apply.
- `pause`, `resume`, and `stop` require `session_id`.
- Stop uses only a fresh recorded session PID when process control is possible.
- Stop does not target the Runtime Control process itself.
- Executor final status cannot overwrite a stopped/cancelled session.
- Retry/replan/scope/executor/manual-escalation controls are handoff records.
- Runtime Control does not approve tasks, mark done, verify results, commit, or
  push.
- `_Temp/` runtime artifacts remain untracked.

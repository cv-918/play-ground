# WF Task Workspace Manager

## Purpose

This document defines the WF-202 Task Workspace Manager implementation scope.

The manager creates and inspects task-scoped runtime workspaces for WF Final
Blueprint v7. It uses the WF-201 runtime execution state model and links every
workspace to the existing task lifecycle layer by `task_id`.

It does not replace `Backlog.md`, `ActiveTask.md`, or
`Task_State_Model.md`. Existing task lifecycle behavior remains authoritative.

---

## Non-Goals

WF-202 does not implement:

- Codex CLI execution
- Local CLI execution
- build or test runners
- verification gates
- task lifecycle migration
- Discord command behavior changes
- automatic approve, done, commit, push, or release behavior
- runtime session supervision
- evidence collection beyond reserving handoff paths

---

## Storage Root

The workspace root follows WF-201:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
```

`_Temp/` is ignored by Git. Runtime workspace artifacts are local state and
must not be committed.

---

## Workspace Path Rules

The manager accepts only plain task IDs. A valid task ID:

- starts with a letter
- contains at least one `-`
- uses only letters, numbers, `_`, `-`, and `.`
- does not contain path separators
- does not contain `..`

Examples:

```text
WF-20260508-090942
GAME-001
UNITY-20260508-010203
```

The workspace path is derived only from the validated `task_id`:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
```

The user cannot provide an arbitrary output path.

---

## Created Layout

`tools/aiworkflow/task_workspace_manager.bat create <task_id>` creates:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
  workspace_metadata.json
  task_run_state.json
  sessions/
  progress_events.jsonl
  runtime_control_history.jsonl
  evidence/
    logs/
    diffs/
    reports/
```

The manager reserves `evidence/manifest.json` as a future WF-204 path but does
not create evidence records.

---

## Workspace Metadata Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/workspace_metadata.json
```

Fields:

| Field | Meaning |
|---|---|
| `schema_version` | Metadata schema version, currently `1` |
| `task_id` | Existing lifecycle task ID |
| `workspace_id` | Derived workspace ID |
| `status` | Workspace metadata status, currently `created` |
| `runtime_root` | Runtime root path |
| `workspace_path` | Task workspace path |
| `state_files` | Runtime state file and directory paths |
| `task_lifecycle_link` | Snapshot link to `Backlog.md` by `task_id` |
| `handoff` | Paths and fields reserved for WF-203 and WF-204 |
| `created_at` | Creation timestamp |
| `updated_at` | Last metadata update timestamp |
| `created_by` | Script that created the workspace |

The manager reads `Backlog.md` only to capture a lifecycle snapshot. It does
not write `Backlog.md` or `ActiveTask.md`.

---

## TaskRunState Creation

The manager creates the WF-201 `task_run_state.json` aggregate with:

```text
status: not_started
```

If `task_id` is not found in the lifecycle layer, the manager still creates a
runtime record but marks:

```text
status: blocked
task_lifecycle_snapshot.found: false
```

This follows the WF-201 invalid-data rule without changing task lifecycle
state.

---

## Conflict Rules

The manager rejects:

- invalid task IDs
- duplicate `task_id` rows found in `Backlog.md`
- create requests when the workspace path already exists

Existing workspace conflict detection refuses to overwrite both complete and
partial workspace directories.

---

## Local API

Commands:

```bat
tools\aiworkflow\task_workspace_manager.bat status [task_id] [--json]
tools\aiworkflow\task_workspace_manager.bat create task_id [--json]
tools\aiworkflow\task_workspace_manager.bat read task_id [--json]
```

Behavior:

| Command | Behavior | Writes |
|---|---|---|
| `status` | Lists runtime workspace summary; optionally checks one task ID | No |
| `create` | Creates task runtime workspace and initial state files | `_Temp/AIWorkflowRuntime/` only |
| `read` | Reads workspace metadata and TaskRunState | No |

The JSON output is intended for future Discord or PC Runner integration. The
human-readable output is intended for local inspection.

---

## WF-203 Handoff

WF-203 Session Supervisor should consume:

```text
task_run_state.active_session_id
task_run_state.session_ids
sessions/
progress_events.jsonl
```

WF-203 owns session creation, session status, heartbeat, process metadata, and
session progress event appends. WF-202 does not create sessions.

---

## WF-204 Handoff

WF-204 Evidence Collector should consume:

```text
task_run_state.evidence
evidence/
progress_events.jsonl
```

WF-204 owns evidence manifests, logs, diffs, reports, and evidence collection
events. WF-202 only reserves the paths and records them in metadata.

---

## Review Checklist

- Existing task lifecycle files remain authoritative.
- Runtime workspace state is stored under `_Temp/AIWorkflowRuntime/`.
- Every created state file includes `task_id`.
- Workspace creation refuses to overwrite existing paths.
- Duplicate lifecycle `task_id` rows are rejected.
- No execution adapter, build/test runner, verification gate, or task migration
  is implemented.

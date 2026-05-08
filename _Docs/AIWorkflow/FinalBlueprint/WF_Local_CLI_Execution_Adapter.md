# WF Local CLI Execution Adapter

## Purpose

This document defines the WF-206 Local CLI Execution Adapter implementation
scope.

The adapter runs only allowlisted local `command_id` entries from a command
catalog. It records each execution attempt as runtime SessionState and
EvidenceRecord data linked by:

```text
task_id
workspace_id
session_id
evidence_id
command_id
```

The adapter executes local commands but does not verify results, decide
pass/fail, approve tasks, mark tasks done, commit, or push.

---

## Non-Goals

WF-206 does not implement:

- Verification Gate
- Completion Card
- automatic approval policy
- pass/fail judgment
- git commit or push
- arbitrary user shell command execution
- Codex App, Copilot, OpenClaw, or Hermes adapters
- large Discord command refactoring

---

## Configuration

Tracked example:

```text
tools/aiworkflow/local_cli_adapter.example.json
```

Recommended local config:

```text
_Local/AIWorkflow/local_cli_adapter.local.json
```

The local config is intentionally under `_Local/` and must not be committed.

Top-level fields:

| Field | Meaning |
|---|---|
| `schema_version` | Config schema version |
| `enabled` | Must be `true` before real execution is allowed |
| `allowed_task_statuses` | Task statuses allowed to execute |
| `require_backlog_approval` | Requires approval marker in Backlog validation |
| `commands` | Allowlisted command catalog |

Command entry fields:

| Field | Meaning |
|---|---|
| `command_id` | Stable allowlist key selected by the operator |
| `enabled` | Per-command execution switch |
| `description` | Human-readable purpose |
| `command` | Executable or executable path |
| `args` | Literal argument list |
| `working_directory` | Process working directory |
| `timeout_seconds` | Optional process timeout |
| `env` | Optional environment variable map |
| `capture_changed_files` | Captures `git diff --name-only` after execution |
| `capture_diff_snapshot` | Captures `git diff` snapshot after execution |

The tracked example has:

```json
"enabled": false
```

This prevents accidental local command execution during review.

---

## Local API

Commands:

```bat
tools\aiworkflow\local_cli_adapter.bat status task_id command_id [--config path] [--json]
tools\aiworkflow\local_cli_adapter.bat dry-run task_id command_id [--config path] [--json]
tools\aiworkflow\local_cli_adapter.bat run task_id command_id --execute [--config path] [--session-id id] [--evidence-id id] [--json]
```

`status` and `dry-run` never execute local commands. They inspect the task,
workspace, config, allowlist entry, and planned process invocation.

`run` requires:

```text
--execute
config enabled: true
command entry enabled: true
approved Backlog task
existing runtime workspace
valid command_id in the allowlist
```

---

## Arbitrary Shell Blocking

The operator cannot pass an arbitrary command line to `run`.

The only executable path comes from a config entry selected by `command_id`.
Arguments are passed through `ProcessStartInfo.ArgumentList` with
`UseShellExecute = false`.

This means WF-206 is an allowlisted command runner, not a general shell bridge.

---

## Runtime Integration

The adapter uses existing runtime layers:

| Layer | Adapter Use |
|---|---|
| WF-202 Task Workspace Manager | Reads workspace paths and runtime state |
| WF-203 Session Supervisor | Creates and updates Local CLI sessions |
| WF-204 Evidence Collector | Records stdout/stderr, exit code, changed files, and diff snapshots |
| WF-205 Codex CLI Adapter | Reuses guard and evidence pattern, but remains separate |

The adapter may update runtime session/evidence state. It does not update
`Backlog.md`, `ActiveTask.md`, or lifecycle task status.

---

## Captured Evidence

For each execution attempt, the adapter records:

```text
executor: local_cli
command_id
command_line
working_directory
started_at
ended_at
exit_code
stdout_log
stderr_log
changed_files
diff_snapshot
```

Logs and diff snapshots are written under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/
```

These are local runtime artifacts and must not be committed.

---

## Failure Evidence

The adapter records failed runtime attempts for:

- missing config
- disabled config
- disabled command entry
- nonzero exit code
- timeout
- spawn/start failure when a session and evidence record can be created

Failure evidence is still not a validation verdict.

---

## WF-207 Handoff

WF-207 progress and heartbeat collection should reuse:

```text
SessionState.status
SessionState.heartbeat
progress_events.jsonl
EvidenceRecord.execution
EvidenceRecord.logs
```

WF-207 may add richer progress events or heartbeat updates, but it must not
change verification, approval, completion, commit, or push policy.

---

## Review Checklist

- Real execution requires local config `enabled: true`.
- Real execution requires explicit `run --execute`.
- Only allowlisted `command_id` entries can run.
- No arbitrary shell command string is accepted.
- Session and evidence records are linked by runtime IDs.
- stdout/stderr, exit code, changed files, and diff snapshot references are
  recorded.
- No Verification Gate, Completion Card, automatic approval policy, pass/fail
  judgment, commit, or push is implemented.

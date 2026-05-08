# WF Codex CLI Execution Adapter

## Purpose

This document defines the WF-205 Codex CLI Execution Adapter implementation
scope.

The adapter is the first controlled PC Runner execution adapter. It can run a
configured Codex CLI command only after task approval, workspace, config, and
explicit execution guards pass.

Runtime records are linked by:

```text
task_id
workspace_id
session_id
evidence_id
```

The adapter records execution evidence, but it does not judge pass/fail.

---

## Non-Goals

WF-205 does not implement:

- Local CLI Execution Adapter
- build/test runner
- Verification Gate
- Completion Card
- automatic approval policy
- pass/fail judgment
- git commit or push
- broad Discord task command refactoring
- automatic task lifecycle migration

---

## Configuration

Tracked example:

```text
tools/aiworkflow/codex_cli_adapter.example.json
```

Recommended local config:

```text
_Local/AIWorkflow/codex_cli_adapter.local.json
```

The local config is intentionally under `_Local/` and must not be committed.

Config fields:

| Field | Meaning |
|---|---|
| `schema_version` | Config schema version |
| `enabled` | Must be `true` before real execution is allowed |
| `command` | Codex CLI executable or path |
| `args` | Base argument list |
| `append_prompt_file` | Appends `--prompt-file` path as final arg when true |
| `working_directory` | Process working directory |
| `timeout_seconds` | Optional process timeout; `0` means no timeout |
| `allowed_task_statuses` | Task statuses allowed to execute |
| `require_backlog_approval` | Requires approval marker in Backlog validation |
| `capture_changed_files` | Captures `git diff --name-only` after execution |
| `capture_diff_snapshot` | Captures `git diff` snapshot after execution |

The tracked example has:

```json
"enabled": false
```

This prevents accidental Codex CLI execution during validation or review.

---

## Local API

Commands:

```bat
tools\aiworkflow\codex_cli_adapter.bat status task_id [--config path] [--prompt-file path] [--json]
tools\aiworkflow\codex_cli_adapter.bat dry-run task_id [--config path] [--prompt-file path] [--json]
tools\aiworkflow\codex_cli_adapter.bat run task_id --execute [--config path] [--prompt-file path] [--session-id id] [--evidence-id id] [--json]
```

`status` and `dry-run` never execute Codex CLI. They inspect the task,
workspace, config, and planned command.

`run` requires:

```text
--execute
enabled: true
approved Backlog task
existing runtime workspace
valid config
```

If a run guard fails after runtime context is available, the adapter records a
failed session/evidence record without executing Codex CLI.

---

## Execution Guard

The adapter checks:

1. `task_id` is valid.
2. `task_id` exists in `Backlog.md`.
3. task status is in `allowed_task_statuses`.
4. Backlog validation contains an approval marker when configured.
5. WF-202 runtime workspace exists.
6. workspace metadata and TaskRunState match `task_id`.
7. config exists and is valid.
8. `run` includes `--execute`.
9. config has `enabled: true`.

These guards prevent accidental execution and keep task lifecycle state separate
from runtime execution state.

---

## Runtime Integration

The adapter uses existing layers:

| Layer | Adapter Use |
|---|---|
| WF-202 Task Workspace Manager | Reads workspace paths and runtime state |
| WF-203 Session Supervisor | Creates and updates Codex CLI sessions |
| WF-204 Evidence Collector | Records stdout/stderr, exit code, changed files, and diff snapshots |

The adapter may update runtime session/evidence state. It does not update
`Backlog.md`, `ActiveTask.md`, or lifecycle task status.

---

## Captured Evidence

For each execution attempt, the adapter records:

```text
executor: codex_cli
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

Guard failures after session creation are recorded as failed runtime attempts.
For example, a disabled config produces:

```text
SessionState.status: failed
EvidenceRecord.execution.exit_code: -1
stderr_log: guard failure message
```

This preserves traceability without running Codex CLI.

---

## WF-206 Handoff

WF-206 Local CLI Execution Adapter should reuse the same structure:

```text
task workspace guard
config-based command/args
SessionState lifecycle
EvidenceRecord metadata
stdout/stderr log capture
exit_code capture
changed_files/diff_snapshot references
no pass/fail judgment
```

WF-206 must remain separate from Codex CLI execution and must not introduce
build/test verification gates unless explicitly scoped.

---

## Review Checklist

- Real execution requires local config `enabled: true`.
- Real execution requires explicit `run --execute`.
- Task approval and workspace guards are enforced.
- Session and evidence records are linked by `task_id`, `workspace_id`,
  `session_id`, and `evidence_id`.
- stdout/stderr, exit code, changed files, and diff snapshot references are
  recorded.
- No Local CLI adapter, build/test runner, Verification Gate, Completion Card,
  automatic approval policy, pass/fail judgment, commit, or push is implemented.

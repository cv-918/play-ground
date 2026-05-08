# WF Evidence Collector

## Purpose

This document defines the WF-204 Evidence Collector implementation scope.

The collector creates, reads, updates, and lists EvidenceRecord runtime
artifacts inside a WF-202 task workspace and a WF-203 session. Evidence records
are linked by:

```text
task_id
workspace_id
session_id
evidence_id
```

Evidence records store execution metadata and references to logs, changed
files, and git diff snapshots. They do not judge pass/fail.

---

## Non-Goals

WF-204 does not implement:

- Codex CLI execution
- Local CLI execution
- process spawning
- build/test runners
- Verification Gate behavior
- Completion Card behavior
- automatic approval policy
- pass/fail judgment
- task lifecycle migration
- Discord command behavior changes

---

## Required Runtime Context

The collector requires:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/workspace_metadata.json
_Temp/AIWorkflowRuntime/tasks/<task_id>/task_run_state.json
_Temp/AIWorkflowRuntime/tasks/<task_id>/sessions/<session_id>.json
```

If the workspace, TaskRunState, or SessionState is missing or mismatched, the
collector rejects the command. It does not create task workspaces or sessions
automatically.

---

## Evidence ID Rules

A valid `evidence_id`:

- starts with `evidence-`
- uses only letters, numbers, `_`, `-`, and `.`
- does not contain path separators
- does not contain `..`

Generated IDs use:

```text
evidence-YYYYMMDD-HHMMSS-NNN
```

---

## Storage Layout

The collector writes under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/
  manifest.json
  records/
    <evidence_id>.json
  logs/
  diffs/
  reports/
```

`_Temp/` is ignored by Git. Runtime evidence artifacts are local state and must
not be committed directly.

---

## EvidenceRecord Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/records/<evidence_id>.json
```

Fields:

| Field | Meaning |
|---|---|
| `schema_version` | Evidence schema version, currently `1` |
| `task_id` | Existing lifecycle task ID |
| `run_id` | TaskRunState run ID |
| `workspace_id` | WF-202 workspace ID |
| `session_id` | WF-203 session ID |
| `evidence_id` | Evidence record ID |
| `status` | Record lifecycle within the evidence layer, currently `created` or `updated` |
| `executor` | Executor name recorded as metadata only |
| `execution` | Command, working directory, timestamps, and exit code metadata |
| `logs` | stdout/stderr log path references |
| `changed_files` | Repository-relative changed file references |
| `git_diff_snapshots` | Git diff snapshot path references |
| `judgment` | Explicitly empty pass/fail fields |
| `handoff` | WF-205 adapter handoff constraints |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

---

## Manifest Format

File:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/manifest.json
```

Fields:

| Field | Meaning |
|---|---|
| `schema_version` | Manifest schema version |
| `task_id` | Existing lifecycle task ID |
| `workspace_id` | WF-202 workspace ID |
| `evidence_ids` | Evidence IDs known to this workspace |
| `latest_evidence_id` | Most recently created or updated evidence ID |
| `created_at` | Creation timestamp |
| `updated_at` | Last update timestamp |

---

## Local API

Commands:

```bat
tools\aiworkflow\evidence_collector.bat status task_id session_id [--json]
tools\aiworkflow\evidence_collector.bat create task_id session_id [evidence_id] [options] [--json]
tools\aiworkflow\evidence_collector.bat read task_id session_id evidence_id [--json]
tools\aiworkflow\evidence_collector.bat update task_id session_id evidence_id [options] [--json]
```

Supported options:

```text
--executor value
--command-line text
--working-directory path
--started-at iso
--ended-at iso
--exit-code n
--stdout-log path
--stderr-log path
--changed-files "a;b;c"
--diff-snapshot path
```

`--changed-files` stores semicolon- or comma-separated repository-relative path
references. `--diff-snapshot`
stores a reference to an existing diff snapshot path. WF-204 does not execute a
diff command by itself.

---

## SessionState and TaskRunState Updates

WF-204 may update:

```text
SessionState.outputs.stdout_log
SessionState.outputs.stderr_log
TaskRunState.evidence.manifest_path
TaskRunState.evidence.collector_status
TaskRunState.updated_at
```

WF-204 must not mutate session lifecycle fields such as `status`, `heartbeat`,
or `process`.

---

## Progress Event Recording

WF-204 appends bounded JSONL records to:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/progress_events.jsonl
```

Used event types:

```text
file_change_detected
diff_snapshot_created
evidence_collected
```

These events are runtime evidence. They are not validation verdicts.

---

## WF-205 Handoff

WF-205 Codex CLI Execution Adapter may write EvidenceRecord metadata produced
by an actual execution adapter:

```text
executor
execution.command
execution.working_directory
execution.started_at
execution.ended_at
execution.exit_code
logs.stdout_log
logs.stderr_log
changed_files
git_diff_snapshots
```

WF-205 must not set pass/fail judgment, approve tasks, mark tasks done, commit,
push, or bypass verification gates.

---

## Review Checklist

- Existing task lifecycle state remains unchanged.
- Evidence records are stored under `_Temp/AIWorkflowRuntime/`.
- `task_id`, `workspace_id`, `session_id`, and `evidence_id` are validated.
- Missing or mismatched workspace/session state is rejected.
- Changed files and diff snapshots are stored as references only.
- No Codex CLI adapter, Local CLI adapter, process spawn, build/test runner,
  Verification Gate, Completion Card, automatic approval policy, or pass/fail
  judgment is implemented.

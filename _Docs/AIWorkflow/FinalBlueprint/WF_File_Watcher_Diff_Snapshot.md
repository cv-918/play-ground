# WF File Watcher and Diff Snapshot

## Purpose

This document defines the WF-208 file watcher and diff snapshot layer.

WF-208 observes file changes for a task runtime session, stores git diff
snapshots as local runtime artifacts, links the observation to EvidenceRecord,
and exposes recent changed-file data for task/session detail displays.

Runtime records remain linked by:

```text
task_id
workspace_id
session_id
evidence_id
```

The task lifecycle layer remains separate and authoritative for planning,
approval, done, commit, and push decisions.

---

## Scope

WF-208 includes:

- workspace/worktree based changed-file observation
- `session_id` based `changed_files` recording
- git diff snapshot file creation
- untracked text-file snapshot sections when `include_untracked` is enabled
- EvidenceRecord linkage through `changed_files` and `git_diff_snapshots`
- ProgressEventLog file-change and diff-snapshot events
- recent changed-file fields for `/task`-style session detail output
- a configurable ignore path policy
- workspace, session, and git error recording as runtime observation data
- WF-209 Runtime Control handoff boundaries

WF-208 does not implement:

- diff judgment
- architecture gate judgment
- Runtime Control Adapter
- pause, stop, retry, or replan controls
- VerificationReport
- CompletionReport
- Completion Card
- automatic approval
- task done
- commit or push

---

## Local API

Commands:

```bat
tools\aiworkflow\file_watcher.bat status task_id [session_id] [--config path] [--json]
tools\aiworkflow\file_watcher.bat snapshot task_id session_id [evidence_id] [--config path] [--json]
tools\aiworkflow\file_watcher.bat watch task_id session_id [--config path] [--interval-seconds n] [--duration-seconds n] [--max-snapshots n] [--snapshot-on-start] [--json]
```

`status` is read-only.

`snapshot` performs one observation pass:

1. reads the runtime workspace and session
2. resolves the observed workspace from `TaskRunState.workspace.worktree_path`
   when present, otherwise from the repository root
3. reads `git status --short`
4. applies ignore rules
5. writes a diff snapshot file under `_Temp/AIWorkflowRuntime/`
6. creates or updates an EvidenceRecord through WF-204 Evidence Collector
7. updates display-only recent changed-file fields in SessionState and
   TaskRunState

When `include_untracked` is enabled, the snapshot includes a separate
untracked text-file section for small text files. Large files and binary-looking
files are listed but their contents are omitted.

`watch` performs bounded polling. It records a snapshot when the changed-file
set is present or changes during the watch window. It is intended for the PC
Runner or a supervised local operator, not as task lifecycle control.

---

## Configuration

Tracked example config:

```text
tools/aiworkflow/file_watcher.example.json
```

Recommended local override:

```text
_Local/AIWorkflow/file_watcher.local.json
```

Config fields:

| Field | Meaning |
|---|---|
| `include_untracked` | Include untracked files from `git status --short --untracked-files=all` |
| `capture_diff_snapshot` | Write a diff snapshot file for each recorded snapshot |
| `max_recent_changed_files` | Maximum changed-file entries copied to display summary fields |
| `ignore_paths` | Repository-relative wildcard/path patterns excluded from changed-file summaries |

Default ignore paths include:

```text
.git/**
_Temp/**
_Local/**
node_modules/**
.env
*.log
*.tmp
*.local.json
```

Ignore rules only filter observation summaries. They do not approve work, hide
tracked diffs from Git, or change repository state.

---

## Runtime Artifacts

WF-208 writes local runtime artifacts under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/
  file_watcher_state.json
  evidence/
    diffs/
      file_watcher_<timestamp>.diff
```

`file_watcher_state.json` records:

```text
task_id
workspace_id
session_id
status
observed_workspace_path
changed_files_count
recent_changed_files
ignored_files
latest_diff_snapshot_path
latest_evidence_id
ignore_paths
last_error
updated_at
```

These artifacts are runtime evidence and must not be committed directly.

---

## EvidenceRecord Linkage

WF-208 records evidence through WF-204 Evidence Collector. The generated or
updated EvidenceRecord uses:

```text
executor = file_watcher
changed_files = [...]
git_diff_snapshots = [...]
judgment.pass_fail = null
```

The EvidenceRecord remains evidence metadata only. It does not certify that the
diff is correct, safe, complete, or ready to commit.

---

## ProgressEventLog Linkage

WF-204 Evidence Collector appends these ProgressEventLog entries for WF-208
snapshots:

```text
file_change_detected
diff_snapshot_created
evidence_collected
```

If the watcher encounters workspace, session, or git errors, WF-208 records a
display-only `failed` progress event with `source = file_watcher`.

---

## Session Detail Output

`session_supervisor.bat read task_id session_id --json` exposes file-change
display fields for `/task`-style views:

```text
session_detail.file_change_summary
session_detail.changed_files_count
session_detail.recent_changed_files
session_detail.latest_diff_snapshot_path
session_detail.last_file_change_at
```

`session_supervisor.bat status task_id --json` also includes the latest
changed-file display fields in session summaries when the watcher has recorded
them.

These fields are display/evidence data only. They do not change task lifecycle
state.

---

## WF-209 Handoff

WF-209 Runtime Control Adapter may consume WF-208 observations later, but it
must remain a separate responsibility.

WF-208 provides:

```text
changed_files
latest_diff_snapshot_path
file_watcher_state.last_error
ProgressEventLog file-change timeline
```

WF-209 owns future control decisions such as pause, stop, retry, replan,
scope reduction, executor change, and stop conditions. WF-208 must not apply
those decisions.

---

## Review Checklist

- Existing Task Lifecycle State is unchanged.
- Existing SessionState lifecycle fields are not used to approve or complete
  work.
- Changed files are stored as repository-relative paths.
- Diff snapshots are stored under `_Temp/AIWorkflowRuntime/`.
- Ignore paths are configurable and local overrides stay under `_Local/`.
- EvidenceRecord pass/fail fields remain empty.
- ProgressEventLog file-change entries are evidence metadata only.
- No Runtime Control, Verification Gate, Completion Card, automatic approval,
  task done, commit, or push is implemented.

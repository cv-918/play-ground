# WF Result Collector

## Purpose

This document defines the WF-301 Result Collector layer.

WF-301 aggregates runtime artifacts into an ExecutionResult record that later
Phase 3 layers can inspect. It collects session, evidence, progress, and
runtime control data from an existing task runtime workspace.

The Result Collector does not judge whether the work passed or failed. It is a
collection and summarization layer only.

---

## Scope

WF-301 includes:

- task-level and optional session-scoped result collection
- ExecutionResult JSON records under `_Temp/AIWorkflowRuntime/`
- result manifest storage
- `status`, `collect`, and `read` commands
- SessionState summary aggregation
- EvidenceRecord summary aggregation
- changed-file and diff-snapshot reference aggregation
- stdout/stderr log reference aggregation
- RuntimeControlHistory projection summary
- ProgressEventLog summary
- TaskRunState result collector projection
- WF-302 Diff Analyzer handoff fields
- WF-304 VerificationReport handoff fields

WF-301 does not implement:

- Diff Analyzer judgment
- VerificationReport
- CompletionReport
- Completion Card
- automatic approval policy
- automatic task approval
- automatic task done
- arbitrary shell execution
- build/test execution
- commit, push, release, or deploy

---

## Local API

Commands:

```bat
tools\aiworkflow\result_collector.bat status task_id [--json]
tools\aiworkflow\result_collector.bat collect task_id [session_id] [result_id] [--json]
tools\aiworkflow\result_collector.bat read task_id [result_id] [--json]
```

`status` reads the result manifest and TaskRunState result projection.

`collect` reads runtime artifacts and writes a new ExecutionResult. If
`session_id` is provided, it collects that session and matching evidence. If no
session is provided, it collects all sessions and all evidence for the task.

`read` reads the requested result. If `result_id` is omitted, it reads the
latest result from the manifest.

---

## Runtime Artifacts

The collector writes local runtime artifacts under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/
  result_manifest.json
  results/
    <result_id>.json
```

These artifacts must not be committed directly.

---

## ExecutionResult Fields

Each ExecutionResult contains:

```text
schema_version
result_id
task_id
run_id
workspace_id
source_filter
collection
task_run
sessions
evidence
runtime_controls
progress
observed_summary
handoff
```

`collection.verification_judgment` and `collection.completion_state` are
always `null` in WF-301. Later layers own those decisions.

---

## Evidence Summary

The evidence summary includes:

```text
records
changed_files
git_diff_snapshots
stdout_logs
stderr_logs
exit_summary
```

`exit_summary.observed_exit_state` is an observation, not a verdict. It may be:

```text
no_exit_codes
all_zero
all_nonzero
mixed
```

Verification Gate layers must decide what these observations mean.

---

## Runtime Control Summary

Runtime control output is based on control projection by `control_id`, not raw
append-only history. This prevents old pending records from being counted as
current pending decisions after a later approval or rejection.

The raw history count is still exposed for audit.

---

## Handoff

WF-301 prepares handoff data for later layers:

```text
WF-302 Diff Analyzer:
  changed_files
  git_diff_snapshots

WF-304 VerificationReport:
  execution_result path
  session/evidence/control/progress summaries
```

WF-301 must not turn those summaries into pass/fail or completion decisions.

---

## Review Checklist

- Result artifacts are written under `_Temp/AIWorkflowRuntime/`.
- Missing workspace is rejected.
- Missing session is rejected when a session filter is requested.
- Result collection does not execute shell commands.
- Result collection does not modify task lifecycle state.
- Runtime controls are summarized by latest projection, not raw pending rows.
- Diff snapshots are exposed as path references for WF-302.
- Verification and completion fields remain null.

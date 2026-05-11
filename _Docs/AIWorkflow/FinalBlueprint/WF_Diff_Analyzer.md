# WF Diff Analyzer

## Purpose

This document defines the WF-302 Diff Analyzer layer.

WF-302 reads existing ExecutionResult records and referenced git diff snapshots,
then produces DiffAnalysis records for later Phase 3 layers. It turns raw diff
files into reviewable observations such as changed files, additions,
deletions, change types, file categories, and attention signals.

The Diff Analyzer does not decide whether the work passed or failed. It is an
analysis layer only.

---

## Scope

WF-302 includes:

- task-level DiffAnalysis records under `_Temp/AIWorkflowRuntime/`
- `status`, `analyze`, and `read` commands
- latest ExecutionResult lookup through WF-301 result manifests
- explicit `result_id` analysis
- unified diff parsing
- changed-file, addition, deletion, hunk, binary, and change-type summaries
- file category summaries
- attention-signal observations
- TaskRunState diff analyzer projection
- display-only ProgressEventLog entry
- WF-304 VerificationReport handoff fields

WF-302 does not implement:

- pass/fail judgment
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
tools\aiworkflow\diff_analyzer.bat status task_id [--json]
tools\aiworkflow\diff_analyzer.bat analyze task_id [result_id] [analysis_id] [--json]
tools\aiworkflow\diff_analyzer.bat read task_id [analysis_id] [--json]
```

`status` reads the DiffAnalysis manifest and TaskRunState projection.

`analyze` reads an ExecutionResult. If `result_id` is omitted, it uses the
latest result from the WF-301 result manifest. It then reads referenced diff
snapshot files and writes a new DiffAnalysis record.

`read` reads the requested analysis. If `analysis_id` is omitted, it reads the
latest analysis from the manifest.

---

## Runtime Artifacts

The analyzer writes local runtime artifacts under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/
  diff_analysis_manifest.json
  diff_analysis/
    <analysis_id>.json
```

These artifacts must not be committed directly.

---

## DiffAnalysis Fields

Each DiffAnalysis contains:

```text
schema_version
analysis_id
task_id
run_id
workspace_id
result_id
source
collection
summary
snapshots
files
handoff
```

`collection.verification_judgment` and `collection.completion_state` are
always `null` in WF-302. Verification and completion layers own those
decisions.

---

## File Categories

The analyzer classifies changed files into review-oriented categories:

```text
workflow_state
workflow_docs
devlog
aiworkflow_tool
discord_tool
game_source
game_data
runtime_or_dependency
local_private
other
```

Categories are observations only. They do not approve, block, pass, or fail
work.

---

## Attention Signals

The analyzer may emit attention signals such as:

```text
workflow_state_changed
workflow_tool_changed
game_source_changed
game_data_changed
local_private_path_changed
runtime_or_dependency_path_changed
file_deleted
binary_diff
large_file_diff
no_diff_snapshots
```

Attention signals are not verdicts. VerificationReport decides what they mean
for a concrete task.

---

## Handoff

WF-302 prepares handoff data for:

```text
WF-304 VerificationReport:
  DiffAnalysis path
  changed-file summaries
  line-count summaries
  category counts
  attention signals
```

WF-302 must not turn those summaries into pass/fail or completion decisions.

---

## Review Checklist

- DiffAnalysis artifacts are written under `_Temp/AIWorkflowRuntime/`.
- Missing workspace is rejected.
- Missing ExecutionResult is rejected.
- Missing diff snapshot is rejected.
- Existing analysis IDs are not overwritten.
- Diff analysis does not execute shell commands.
- Diff analysis does not modify task lifecycle state.
- Verification and completion fields remain null.
- Attention signals remain observations only.

# WF VerificationReport

## Purpose

This document defines the WF-304 VerificationReport layer.

WF-304 reads existing Phase 3 evidence artifacts and produces a task-level
verification verdict. It is the first AIWorkflow runtime layer that turns
collected evidence into a reviewable validation judgment.

VerificationReport does not complete a task. It does not approve, mark done,
commit, push, create a CompletionReport, or apply auto approval.

---

## Scope

WF-304 includes:

- VerificationReport records under `_Temp/AIWorkflowRuntime/`
- `status`, `generate`, and `read` commands
- latest ExecutionResult lookup through the WF-301 result manifest
- latest DiffAnalysis lookup through the WF-302 diff analysis manifest
- latest BuildTestResult lookup through the WF-303 build/test manifest
- explicit source-id overrides for result, analysis, and build/test evidence
- PASS/PASS_WITH_NOTES/CONCERNS/BLOCKED/FAIL verdict generation
- execution-result gate
- diff gate
- build/test gate
- safety gate
- missing evidence reporting
- blocker, concern, warning, failed-check, and human-decision summaries
- TaskRunState verification projection
- display-only ProgressEventLog entry
- WF-305 CompletionReport handoff fields

WF-304 does not implement:

- CompletionReport
- Completion Card
- ApprovalHistory
- FinalizationLog
- automatic approval policy
- automatic task approval
- automatic task done
- arbitrary shell execution
- commit, push, release, or deploy
- game source or data changes

---

## Local API

Commands:

```bat
tools\aiworkflow\verification_report.bat status task_id [--json]
tools\aiworkflow\verification_report.bat generate task_id [--result-id id] [--analysis-id id] [--build-test-id id] [--report-id id] [--json]
tools\aiworkflow\verification_report.bat read task_id [report_id] [--json]
```

`status` reads the VerificationReport manifest and TaskRunState projection.

`generate` reads the latest available ExecutionResult, DiffAnalysis, and
BuildTestResult by default. Source IDs can be supplied explicitly when a report
must be tied to a specific artifact.

`read` reads the requested report. If `report_id` is omitted, it reads the
latest report from the manifest.

---

## Runtime Artifacts

VerificationReport writes local runtime artifacts under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/verification/
  verification_manifest.json
  results/
    <verification_report_id>.json
```

These artifacts must not be committed directly.

---

## VerificationReport Fields

Each VerificationReport contains:

```text
schema_version
verification_report_id
task_id
run_id
workspace_id
generated_at
generator
task_context
sources
verdict
gates
warnings
concerns
blockers
failed_checks
human_decisions
invariants
handoff
```

The verdict level is one of:

```text
PASS
PASS_WITH_NOTES
CONCERNS
BLOCKED
FAIL
```

---

## Gate Policy

The approved WF-304 policy is:

- build/test `exit_nonzero`, `timeout`, and `spawn_failed` are `FAIL`
- missing ExecutionResult evidence is `BLOCKED`
- missing DiffAnalysis or BuildTestResult evidence is `CONCERNS`
- missing evidence must never produce `PASS`
- `local_private_path_changed` is a safety failure
- `runtime_or_dependency_path_changed` is a safety failure
- workflow, workflow-tool, game-source, and game-data changes are review signals
- review signals inside expected task categories become notes
- review signals outside expected task categories become concerns

Expected task categories are inferred from the Backlog task kind. For example,
`automation`, `workflow`, `validation`, and `documentation` tasks expect
workflow state, workflow docs, DevLog, AIWorkflow tool, or Discord tool
changes. Game source and game data changes remain concerns for those tasks.

---

## Handoff

WF-304 prepares handoff data for:

```text
WF-305 CompletionReport:
  VerificationReport path
  verdict level
  human_decision_required flag
  warnings
  concerns
  blockers
  failed checks
```

WF-304 must not treat a report as completion. WF-305 and later finalization
layers own completion readiness, finalization, and policy automation.

---

## Review Checklist

- VerificationReport artifacts are written under `_Temp/AIWorkflowRuntime/`.
- Missing required evidence cannot produce `PASS`.
- Build/test failure observations produce `FAIL`.
- Unsafe local/private or runtime/dependency path changes produce `FAIL`.
- Review signals are visible in warnings or concerns.
- TaskRunState receives only a verification projection.
- ProgressEventLog entry is display-only.
- No CompletionReport, Completion Card, finalization, auto approval, task done,
  commit, push, release, or deploy is performed.

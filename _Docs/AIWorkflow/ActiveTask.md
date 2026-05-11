# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-304
title: WF-304 Implement VerificationReport
status: done
workflow_path: discord_task_management
priority: P1
risk_level: medium
requested_by: human_director
requested_at: 2026-05-12
last_updated: 2026-05-12
```

---

## Goal

WF-304 Implement VerificationReport

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: approved for bounded workflow runtime implementation
validation: approved: "Human Director approved the recommended WF-304 policy. Scope: implement VerificationReport generation from ExecutionResult, DiffAnalysis, and BuildTestResult; apply PASS/PASS_WITH_NOTES/CONCERNS/BLOCKED/FAIL verdict policy; record missing evidence, failures, concerns, warnings, blockers, and recommended user action; update TaskRunState verification projection; write artifacts under _Temp; document WF-305 handoff. Non-goals: CompletionReport, Completion Card, FinalizationLog, auto approval policy, task done, commit/push automation, arbitrary shell execution, game source/data changes."
```

---

## Files In Scope

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/FinalBlueprint/
tools/aiworkflow/
_DevLog/WorkLog/
```

---

## Human Action Required

```text
1. Review VerificationReport behavior if validation finds CONCERNS, BLOCKED, or FAIL.
2. Otherwise, Codex may commit and push this approved WF-304 change after review and validation.
```

---

## Validation Plan

```text
Run PowerShell parser checks, verification_report status/generate/read
scenarios, missing-evidence behavior, build/test FAIL behavior, generated JSON
parse checks, invariant checks that no CompletionReport/completion/approval is
written, git diff --check, forbidden path checks, and private/local tracking
checks.
```

---

## Next Recommended Task

```text
After WF-304, continue to WF-305 CompletionReport.
```

---

## Completion Criteria

```text
[x] Task scope reviewed
[x] Required approvals recorded
[x] Implementation completed within approved scope, if applicable
[x] Review completed, if applicable
[x] Validation completed or explicitly deferred
[x] Dev Log created for meaningful work
[x] Commit/push completed if validation does not require a new Human Director decision
```

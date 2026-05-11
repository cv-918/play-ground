# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-303
title: WF-303 Implement Build/Test Runner integration
status: ready_to_commit
workflow_path: discord_task_management
priority: P1
risk_level: medium
requested_by: human_director
requested_at: 2026-05-11
last_updated: 2026-05-11
```

---

## Goal

WF-303 Implement Build/Test Runner integration

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: approved for bounded workflow runtime implementation
validation: approved: "Human Director approved continuing Phase 3 with WF-303 Build/Test Runner integration after WF-302 commit/push. Scope: implement allowlisted build/test command catalog, status/list/dry-run/run/read APIs, local config guard, approval-level guard, build/test result artifacts under _Temp, stdout/stderr capture, timeout/exit-code observation, deterministic JSON output, documentation, and DevLog. Non-goals: VerificationReport, CompletionReport, Completion Card, auto approval, task done, commit/push automation, arbitrary shell execution, game source/data changes."
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
1. Review Build/Test Runner behavior after implementation.
2. Decide whether to commit after validation.
```

---

## Validation Plan

```text
Run PowerShell parser checks, build_test_runner status/list/dry-run/run/read
scenarios, disabled config guard, approval-required guard, allowlisted smoke
execution with a temporary local config, timeout/nonzero handling if practical,
JSON parse checks for generated BuildTestResult records, invariant checks that
no VerificationReport/completion judgment is written, git diff --check,
forbidden path checks, and private/local tracking checks.
```

---

## Next Recommended Task

```text
After WF-303, continue to WF-304 VerificationReport.
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
[ ] User decides whether to commit
```

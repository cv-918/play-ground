# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-20260511-182549
title: WF-209/210 Implement Runtime Control Adapter and controls
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

WF-209/210 Implement Runtime Control Adapter and controls

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: approved for bounded workflow runtime implementation
validation: approved: "범위 승인: Runtime Control Adapter, control history projection, process metadata support, safe session-scoped stop, pause/resume state changes, retry/replan/scope/executor/manual escalation control records, status/read/apply commands, docs and DevLog까지 구현합니다. 금지: 자동 task 승인, 자동 done, VerificationReport/Completion Card, auto approval policy, arbitrary shell execution, game source/data 변경, release/deploy."
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
1. Review Runtime Control behavior after implementation.
2. Decide whether to commit after validation.
```

---

## Validation Plan

```text
Run PowerShell parser checks, JSON parse checks, workspace/session setup,
runtime_control_adapter status/request/approve/reject/apply/read scenarios,
pause/resume/stop/retry/replan/scope_reduce/executor_change/manual_escalation
validation, safe stop rejection without matching session PID, git diff --check,
forbidden path checks, and private/local tracking checks.
```

---

## Next Recommended Task

```text
After commit decision, continue to WF-301 Result Collector.
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

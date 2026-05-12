# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-309
title: WF-309 Implement Follow-up Task Generator
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

WF-309 Implement Follow-up Task Generator

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: approved for bounded workflow runtime implementation
validation: approved: "Human Director approved proceeding to WF-309 after WF-308 was committed and pushed. Scope: implement Follow-up Task Generator candidate plans from CompletionReport, FinalizationLog, AutoApprovalPolicy, and Backlog context; local status/generate/read APIs; Discord follow-up status/generate/read commands; documentation; DevLog; and validation. Non-goals: automatic Backlog task creation, ActiveTask selection, task approval, task done, auto approval apply action, commit/push automation, arbitrary shell execution, game source/data changes."
```

---

## Files In Scope

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/FinalBlueprint/
tools/aiworkflow/
tools/discord-orchestrator/
_DevLog/WorkLog/
```

---

## Human Action Required

```text
1. Review Follow-up Task Generator behavior if validation finds CONCERNS, BLOCKED, or FAIL.
2. Commit/push requires the normal repository decision after review and validation.
```

---

## Validation Plan

```text
Run PowerShell parser checks, follow_up_task_generator status/generate/read
scenarios, candidate/no-candidate plan scenarios, Discord command registration
or node syntax checks, response formatting checks, generated JSON parse checks,
invariant checks that no Backlog task creation, ActiveTask selection, task
approval, done, lifecycle transition, or auto-approval apply action is written,
git diff --check, forbidden path checks, and private/local tracking checks.
```

---

## Next Recommended Task

```text
After WF-309, review the Phase 2/3 execution harness loop and decide the next autonomous execution hardening task.
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
[ ] Commit/push completed if validation does not require a new Human Director decision
```

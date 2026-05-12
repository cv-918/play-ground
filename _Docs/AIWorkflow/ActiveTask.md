# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-308
title: WF-308 Implement Auto Approval Policy
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

WF-308 Implement Auto Approval Policy

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: approved for bounded workflow runtime implementation
validation: approved: "Human Director approved proceeding to WF-308 recommended scope. Scope: implement deterministic Auto Approval Policy evaluation from Backlog task context, CompletionReport, FinalizationLog, and ApprovalHistory; local status/evaluate/read APIs; Discord auto-approval status/evaluate/read commands; documentation; DevLog; and validation. Non-goals: automatic task approval, automatic task done, automatic Backlog/ActiveTask lifecycle transitions, Follow-up Task Generator, commit/push automation, arbitrary shell execution, game source/data changes."
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
1. Review Auto Approval Policy behavior if validation finds CONCERNS, BLOCKED, or FAIL.
2. Commit/push requires the normal repository decision after review and validation.
```

---

## Validation Plan

```text
Run PowerShell parser checks, auto_approval_policy status/evaluate/read
scenarios, eligible/human-required/blocked policy decision scenarios, Discord
command registration or node syntax checks, response formatting checks,
generated JSON parse checks, invariant checks that no task approval, done,
lifecycle transition, follow-up, or auto-approval apply action is written, git
diff --check, forbidden path checks, and private/local tracking checks.
```

---

## Next Recommended Task

```text
After WF-308, continue to WF-309 Follow-up Task Generator.
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

# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-305-306
title: WF-305/306 Implement CompletionReport and Completion Card
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

WF-305/306 Implement CompletionReport and Completion Card

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: approved for bounded workflow runtime implementation
validation: approved: "Human Director approved bundling WF-305 CompletionReport and WF-306 Completion Card. Scope: implement CompletionReport generation from VerificationReport, compact Discord-facing Completion Card payloads, local status/generate/read APIs, Discord completion status/report/card commands, documentation, DevLog, and validation. Non-goals: ApprovalHistory, FinalizationLog, Auto Approval Policy, Follow-up Task Generator, automatic task done, commit/push automation, arbitrary shell execution, game source/data changes."
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
1. Review CompletionReport/Card behavior if validation finds CONCERNS, BLOCKED, or FAIL.
2. Otherwise, Codex may commit and attempt push after review and validation.
```

---

## Validation Plan

```text
Run PowerShell parser checks, completion_report status/generate/read scenarios,
completion_card status/generate/read scenarios, Discord command registration or
node syntax checks, response formatting checks, generated JSON parse checks,
invariant checks that no task done/finalization/auto-approval is written, git
diff --check, forbidden path checks, and private/local tracking checks.
```

---

## Next Recommended Task

```text
After WF-305/306, continue to WF-307 ApprovalHistory and FinalizationLog.
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

# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-402
title: Define command surface consolidation and deprecation plan
status: done
workflow_path: discord_task_management
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-05-12
last_updated: 2026-05-12
```

---

## Goal

Define command surface categories, compatibility/manual-escalation boundaries,
deprecation candidates, removal rules, and human approval decisions before any
workflow command cleanup is implemented.

---

## Tool Route

```yaml
discord: user direction and workflow context
human: approve any later command removal, metadata change, or behavior change
codex: approved for bounded command-surface planning documentation and Backlog/ActiveTask updates
validation: documentation diff review, git diff --check, and status review
```

---

## Files In Scope

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/FinalBlueprint/WF_Command_Surface_Consolidation_Plan.md
_DevLog/WorkLog/
```

---

## Human Action Required

```text
1. Review the command surface categories and deprecation candidates.
2. Decide later whether compatibility/manual-escalation commands should be hidden, relabeled, or removed.
```

---

## Validation Plan

```text
Review the consolidation plan diff, verify that the task is plan-only, run
git diff --check, and confirm that the next recommended task is WF-403.
```

---

## Next Recommended Task

```text
WF-403 Write end-to-end workflow technical specification
```

---

## Completion Criteria

```text
[x] Task scope reviewed
[x] Required approvals recorded
[x] Command categories recorded
[x] Deprecation candidates recorded
[x] Removal rules recorded
[x] Review completed
[x] Validation completed or explicitly deferred
[ ] Commit/push completed if validation does not require a new Human Director decision
```

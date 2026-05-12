# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-404
title: Write Human Director workflow operation guide
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

Provide Korean Human Director-facing versions of the direct-read Phase 4
documents and write a practical operation guide for requesting work, approving
work, monitoring progress, reviewing completion, handling follow-ups, and
deciding commits.

---

## Tool Route

```yaml
discord: user direction and workflow context
human: review Korean guide usability
codex: approved for bounded Korean documentation and Backlog/ActiveTask updates
validation: documentation diff review, git diff --check, and status review
```

---

## Files In Scope

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/FinalBlueprint/*_KR.md
_Docs/AIWorkflow/FinalBlueprint/WF_Human_Director_Operation_Guide_KR.md
_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md
_DevLog/WorkLog/
```

---

## Human Action Required

```text
1. Read WF_Human_Director_Operation_Guide_KR.md first.
2. Review the KR companion docs only when deciding command cleanup, approval boundaries, or runner behavior.
```

---

## Validation Plan

```text
Review the Korean documentation diff, verify that the task is documentation-only,
run git diff --check, and confirm that the next recommended task is WF-405.
```

---

## Next Recommended Task

```text
WF-405 Run end-to-end workflow smoke and validation pack
```

---

## Completion Criteria

```text
[x] Task scope reviewed
[x] Required approvals recorded
[x] Korean direct-read companion documents created
[x] Human Director operation guide created
[x] README document map updated
[x] Review completed
[x] Validation completed or explicitly deferred
[ ] Commit/push completed if validation does not require a new Human Director decision
```

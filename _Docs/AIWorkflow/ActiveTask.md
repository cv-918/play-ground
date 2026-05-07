# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-20260507-224917
title: WF-051 Slash command metadata Korean localization
status: done
workflow_path: discord_task_management
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-05-07
last_updated: 2026-05-07
```

---

## Goal

WF-051 Slash command metadata Korean localization

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: only after explicit approval for implementation
validation: pending
```

---

## Files In Scope

```text
Define during task intake before implementation.
```

---

## Human Action Required

```text
1. Review the selected active task.
2. Approve architecture and scope before implementation if source or runtime behavior will change.
```

---

## Validation Plan

```text
pending
```

---

## Latest Status Note

```text
status: done
note: done: "WF-051 validation passed. Discord slash command metadata descriptions are localized into Korean. Manual Discord UI confirmation passed for /ai command search. Command names, subcommand names, option names, and choice raw values remained unchanged. Command behavior, task semantics, Backlog/ActiveTask write behavior, game source/data files, and private/local tracked files were not changed. npm register and bot restart/status passed."
updated_at: 2026-05-07
source: Discord task status command
```
---

## Next Recommended Task

```text
Review Backlog.md for the next highest-priority open task after this task is complete.
```

---

## Completion Criteria

```text
[ ] Task scope reviewed
[ ] Required approvals recorded
[ ] Implementation completed within approved scope, if applicable
[ ] Review completed, if applicable
[ ] Validation completed or explicitly deferred
[ ] Dev Log created for meaningful work
[ ] User decides whether to commit
```

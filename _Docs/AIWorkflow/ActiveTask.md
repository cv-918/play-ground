# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: GAME-005
title: Replace `GetDataByIndex(0)` with deterministic character selection
status: ready_for_implementation
workflow_path: discord_task_management
priority: P2
risk_level: low
requested_by: human_director
requested_at: 2026-05-05
last_updated: 2026-05-05
```

---

## Goal

Replace `GetDataByIndex(0)` with deterministic character selection

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: only after explicit approval for implementation
validation: Save/order changes, same character spawn
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
Save/order changes, same character spawn
```

---

## Latest Status Note

```text
status: ready_for_implementation
note: approved: "Approve reduced-scope implementation: replace GetDataByIndex(0)-based playable character selection with explicit default character ID lookup. Do not add selected character save schema, character selection UI, unlock policy changes, or JsonDataManager refactor."
updated_at: 2026-05-05
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

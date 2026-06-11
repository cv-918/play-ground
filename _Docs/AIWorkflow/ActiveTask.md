# Active Task

Status: State source
Authority: Current active workflow task source. This file does not by itself approve source/data/schema/workflow-policy/git changes.

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id:
title:
status:
workflow_path:
priority:
risk_level:
requested_by: human_director
requested_at:
last_updated: 2026-05-28
```

---

## Goal

```text
No active workflow task is currently selected.
```

---

## Approved Scope

```text
No implementation scope is currently active.
```

---

## Non-Goals

```text
No source, data, task lifecycle, commit, push, or release action is approved by this file.
```

---

## Tool Route

```yaml
chatgpt:
codex:
copilot:
git:
validation:
```

---

## Files In Scope

```text
None.
```

---

## Current Findings

```text
Previous stale Discord/Runner completion-review follow-up tasks were closed during Studio cleanup.
```

---

## Decision Needed

```text
None.
```

---

## Human Action Required

```text
None.
```

---

## Next Action

```text
Use Studio to create or select the next real Human Director work item.
```

---

## Validation Plan

```text
Not applicable.
```

---

## Validation Evidence

```yaml
build_executed: false
runtime_executed: false
document_review_required: false
other: ActiveTask cleanup only.
```

---

## Handoff Artifacts

```text
None.
```

---

## Completion Criteria

```text
[x] Stale active task cleared
[ ] New task selected when needed
```

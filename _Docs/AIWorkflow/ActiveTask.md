# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-20260508-103845
title: WF-204 Implement Evidence Collector
status: done
workflow_path: discord_task_management
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-05-08
last_updated: 2026-05-08
```

---

## Goal

WF-204 Implement Evidence Collector

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
note: done: "WF-204 validation passed. Evidence Collector was implemented as a session_id-linked evidence metadata storage layer. It supports EvidenceRecord status/create/read/update APIs, stores executor, command, working_directory, started_at, ended_at, exit_code, stdout/stderr log paths, changed_files references, and diff snapshot references. Evidence records are stored under _Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/manifest.json and evidence/records/<evidence_id>.json. Evidence is linked to SessionState and TaskRunState by session_id. Invalid session ID, task/workspace/session mismatch, duplicate evidence, and storage errors are guarded. WF-205 Codex CLI Execution Adapter handoff was documented. No Codex CLI execution, Local CLI execution, process spawn, build/test runner, Verification Gate, Completion Card, automatic approval policy, pass/fail judgment, task migration, or game source/data change was implemented."
updated_at: 2026-05-08
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

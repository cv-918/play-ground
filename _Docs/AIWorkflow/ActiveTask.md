# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-20260508-172728
title: WF-208 Implement file watcher and diff snapshots
status: in_progress
workflow_path: discord_task_management
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-05-11
last_updated: 2026-05-11
```

---

## Goal

WF-208 Implement file watcher and diff snapshots

---

## Tool Route

```yaml
discord: task selection command
human: review and approval
codex: only after explicit approval for implementation
validation: approved: "범위 승인: workspace 기준 changed_files 감지, git diff snapshot 저장, EvidenceRecord/ProgressEventLog 연결, ignore 정책, /task 표시용 최근 변경 파일 요약까지만 구현합니다. 금지: diff 판정, Runtime Control, pause/stop/retry/replan, Completion Card, 자동 승인, commit/push."
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
approved: "범위 승인: workspace 기준 changed_files 감지, git diff snapshot 저장, EvidenceRecord/ProgressEventLog 연결, ignore 정책, /task 표시용 최근 변경 파일 요약까지만 구현합니다. 금지: diff 판정, Runtime Control, pause/stop/retry/replan, Completion Card, 자동 승인, commit/push."
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

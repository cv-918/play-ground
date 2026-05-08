# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-20260508-155647
title: WF-207 Implement progress and heartbeat collection
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

WF-207 Implement progress and heartbeat collection

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
note: done: "완료: WF-207은 session_id 기준 heartbeat/progress 수집을 추가했고, status --json은 /tasks형 runtime_summary, read --json은 /task형 session_detail을 반환합니다. 검증: PowerShell syntax, workspace/session status/read, heartbeat/activity, stalled_candidate 표시, git diff check, forbidden path, private/local tracking 확인 통과. 금지사항 준수: file watcher, diff snapshotter, Runtime Control, Verification Gate, Completion Card, 자동 승인, executor routing 변경, commit/push, game source/data 변경 없음."
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

# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-20260508-101245
title: WF-203 Implement Session Supervisor
status: ready_for_implementation
workflow_path: discord_task_management
priority: P1
risk_level: low
requested_by: human_director
requested_at: 2026-05-08
last_updated: 2026-05-08
```

---

## Goal

WF-203 Implement Session Supervisor

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
status: ready_for_implementation
note: approved: "WF-203 Session Supervisor 구현 범위를 승인합니다. task_id/workspace_id에 연결되는 SessionState 생성/조회/갱신과 heartbeat 갱신, idle/stalled 판단용 timestamp 기록까지만 구현합니다. Codex CLI 실행, Local CLI 실행, process spawn, build/test runner, Evidence Collector, Verification Gate, completion card, 자동 승인 정책은 금지합니다. 기존 Task State와 Runtime State 분리 원칙을 유지합니다."
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

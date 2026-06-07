# Studio Notification Records

Studio notification records are derived facts for notifying the Human Director about important Studio stage changes.

## Events that should notify

Notify-worthy events include:

- `stage_change`: Worker Dispatch evidence/result handoff becomes ready, or a batch/stage progresses.
- `blocker`: invalid records, failed or blocked dispatches, skipped validation risk, stalled runtime observations, or verification failures.
- `approval_wait`: Execution Request readiness waits for dispatch approval, Result Review waits for Human Director judgment, or Commit/Push request waits for explicit approval.
- `completion`: implementation result/evidence is ready for review.

## Channel boundary

Discord, OpenClaw, mobile, and voice are delivery channels only. They may present a notification and link back to Studio, but they must not become governance authority.

Notification delivery must not:

- approve, reject, accept, close, or mark done;
- start, pause, stop, retry, or replan runtime work;
- create Backlog/ActiveTask records automatically;
- commit, push, release, or deploy;
- bypass Studio Human Director review.

The governance authority remains Studio Human Director decision records and Result Review decisions.

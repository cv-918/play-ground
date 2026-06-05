# Studio Roadmap To Goal E Approval Matrix

## Date

2026-06-05

## Status

Director decision aid.

This document summarizes the remaining design/approval chain from the current committed Goal C.1 foundation to future Goal E worker dispatch.

## Current Committed Baseline

Last committed foundation:

```text
cf4eb4f feat: add Studio execution request foundation
```

Implemented:

- Execution Request store README
- `execution_request.v1` validation
- planner commands: `status`, `list`, `read`, `validate`, `store`
- `_Temp/AIWorkflowStudio/execution_requests/` validation override
- tests

Not implemented:

- C.2 read-only UI/API
- C.3 mark-ready/preflight
- D.1 Result Review foundation
- E.1 Worker Dispatch record foundation
- E.2 live runner smoke

## Required Sequence

Recommended order:

```text
C.2 Read-only Execution Request surface
  -> C.3 Readiness + preflight
  -> D.1 Result Review foundation
  -> E.1 Worker Dispatch request-record foundation
  -> E.2 one safe live runner smoke
```

Do not jump from C.1 directly to live Goal E.

## Approval Matrix

| Step | Approval Needed | Main Effect | Must Not Do |
|---|---|---|---|
| C.2 | Read-only Execution Request UI/API | Show list/detail in Studio | No mutation, mark-ready, dispatch |
| C.3 | Mark-ready + preflight | Update readiness state only | No worker start, Backlog, commit/push |
| D.1 | Result Review foundation | Store/display review records | No auto-accept, done, commit/push |
| E.1 | Worker Dispatch request-record | Create dispatch request records | No live runner start |
| E.2 | One live safe runner smoke | Start one allowlisted safe runner path | No source edits/commit/push unless separately approved |

## Fixed Human Director Recommendations

The Human Director has already established the product direction: final-use-scene-first Studio design with Director Conversation, Decisions, Results, and Memory as the main experience. Do not turn Studio into a transitional operator dashboard, manual command surface, or raw internal-state monitor.

Therefore, these recommendations are fixed unless the Human Director explicitly changes them:

1. C.2 visibility: Execution Request records appear on both the existing Execution Request page and Home summary.
2. C.2 invalid records: show invalid records as normal UI warning summaries; keep raw details under internal/debug.
3. C.3 mutation: readiness metadata updates to Execution Request JSON records are allowed only after C.2 is verified.
4. C.3 surface: implement both API and UI for mark-ready.
5. D.1 result scope: read/store/display only; accept/request-changes decisions are deferred.
6. D.1 evidence visibility: normal UI summary plus expandable internal evidence details.
7. E.1 mode: dispatch request record only; no live runner start.
8. E.1 store/schema: use `_Docs/AIWorkflow/Studio/WorkerDispatches/` and `worker_dispatch.v1`.
9. E.2 first live profile: documentation or validation, not source-editing implementation.
10. E.2 executor/route: use one allowlisted executor and command id/runner route selected during E.2 approval.
11. Runtime ownership: Studio writes a dispatch request for Hermes/runner pickup first; direct PC Runner calls are deferred.
12. Source edits: source-editing workers are not allowed in early Goal E.
13. Commit/push: commit/push remain outside Studio dispatch and require separate explicit approval.

## Recommended Immediate Approval

Approve only C.2 next:

```text
Approve Goal C.2.
Scope: read-only Execution Request list/detail API and Director UI surface using the existing C.1 store and schema validation. Include empty/invalid states and tests. Exclude mark-ready, worker dispatch, PC Runner, Codex/local execution, Backlog creation, result generation, commit/push, and game source/data changes.
```

## Recommended Deferrals

Do not approve yet:

- C.3 until C.2 UI/API is visible and verified.
- D.1 until result review storage/display shape is accepted.
- E.1 until C.3 and D.1 are at least designed and C.2 is implemented.
- E.2 until E.1 request-record foundation is tested.

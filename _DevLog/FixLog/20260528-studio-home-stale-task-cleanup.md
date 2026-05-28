# 2026-05-28 Studio Home Stale Task Cleanup

## Summary

Cleaned stale AIWorkflow task state that was still surfacing in the Studio Home decision desk, and clarified the Home decision card language so Human Director decisions are separated from process reasons and actual effects.

## Background

Studio Home showed a stale completion-review item for `GAME-20260514-172323`. The card mixed process state, decision content, and outcome wording, making it impossible to decide from the card alone.

## Scope

- Close or defer stale workflow tasks in Backlog.
- Clear `ActiveTask.md` when no real task is selected.
- Hide non-active or already-finished completion-review residue from Studio Home decisions.
- Make decision card labels clearer.
- Fix blank YAML scalar parsing so `task_id:` is not misread as the next key.

## Files Changed

- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/workflow_status.ps1`
- `tools/aiworkflow/studio_director_console_server.js`
- `tools/aiworkflow/studio/studioDocumentDataLoaders.js`

## Implementation Notes

- Marked superseded/stale workflow rows as `done` or `deferred` instead of leaving them in active decision surfaces.
- Replaced the active task file with an explicit "no active workflow task selected" state.
- Removed the stale Studio UX goal-planning bundle that had already been superseded by direct Home UX work:
  - `DGP-20260520-120958-studio-ux-improvement-goal-home-huma`
  - its linked meeting, work order, proposal, and contradictory decision records.
- Updated Studio Home decision text to separate:
  - what the Human Director actually decides,
  - why the item appeared,
  - what changes after the decision,
  - what to watch out for.
- Added active-task guards so stale completion review state is not shown when no active task exists.
- Changed YAML scalar parsing from whitespace patterns that could cross newlines to line-local whitespace patterns.
- Stopped normal Studio meeting and handoff loaders from reading `_Docs/AIWorkflow/Studio/Examples`, so sample records no longer appear as Human Director work items.

## Validation

Ran:

```text
node --check tools\aiworkflow\studio\directorConsolePage.js
node --check tools\aiworkflow\studio\studioDocumentDataLoaders.js
node --check tools\aiworkflow\studio_director_console_server.js
git diff --check -- _Docs/AIWorkflow/Backlog.md _Docs/AIWorkflow/ActiveTask.md tools/aiworkflow/studio/directorConsolePage.js tools/aiworkflow/workflow_status.ps1 tools/aiworkflow/studio_director_console_server.js
powershell -NoProfile -ExecutionPolicy Bypass -File tools\aiworkflow\workflow_status.ps1 -RepoRoot . -Json
node tools\aiworkflow\studio_director_console_server.js --once
```

Results:

- Static JS checks passed.
- `git diff --check` reported only existing LF-to-CRLF warnings, no whitespace errors.
- Workflow status now reports an empty active task instead of misreading `title:` as the task id.
- Studio Home browser check confirmed `GAME-20260514-172323` no longer appears in the decision desk.
- Studio summary now reports no stale director goal plans, proposals, or decisions from the removed Home UX planning bundle.
- Studio summary no longer treats example handoffs as live handoff candidates.

## Guide Update Decision

No `AIWorkflow_User_Guide_KR.html` update was needed. This change fixes stale state handling and Studio Home wording; it does not change user workflow commands, PC Runner gates, approval policy, or regular task lifecycle steps.

## Remaining Risks

- The repository still has unrelated dirty game and Handoff changes from other work. They were intentionally not touched.
- Future Home decision quality still depends on each task or proposal carrying concrete enough scope/change summaries.

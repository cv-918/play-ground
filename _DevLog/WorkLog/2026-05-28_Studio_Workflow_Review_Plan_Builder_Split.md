# Studio Workflow Review Plan Builder Split

## Summary

Split Studio workflow review plan builders out of `studio_director_console_server.js` into a focused module.

## Background

The Studio server refactor is reducing the original monolithic server file into smaller boundaries. This step extracts pure planning helpers used by meeting review, knowledge transition, completion review, approval impact, surface map, and eval-plan actions.

## Scope

- Added `tools/aiworkflow/studio/studioWorkflowReviewPlanBuilders.js`.
- Moved workflow review plan builders from the server into the new module.
- Kept API behavior and route wiring unchanged.

## Files Changed

- `tools/aiworkflow/studio_director_console_server.js`
- `tools/aiworkflow/studio/studioWorkflowReviewPlanBuilders.js`
- `_DevLog/WorkLog/2026-05-28_Studio_Workflow_Review_Plan_Builder_Split.md`

## Architecture Notes

This preserves the current API contract while separating read-only workflow review planning from HTTP server concerns.

## Validation Summary

Completed checks:

- `node --check tools/aiworkflow/studio_director_console_server.js`
- `node --check tools/aiworkflow/studio/studioWorkflowReviewPlanBuilders.js`
- `node --check tools/aiworkflow/studio/studioApiHandlers.js`
- `node --check tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js`
- `node --check tools/aiworkflow/studio/studioEvidenceReviewApiRoutes.js`
- `git diff --check -- tools/aiworkflow/studio_director_console_server.js tools/aiworkflow/studio/studioWorkflowReviewPlanBuilders.js`
- Studio `/api/summary` smoke after restart
- `tools\aiworkflow\studio_smoke_check.bat`

Result: all checks passed. The smoke check used port fallback from `47831` to `47832` because the main Studio server was already running; the fallback smoke process was cleaned up after validation.

## Remaining Risks

- This is an internal refactor. The main risk is missed dependency wiring in an extracted builder.
- No user guide update is required because no user-facing workflow behavior, command, label, or intervention point changed.

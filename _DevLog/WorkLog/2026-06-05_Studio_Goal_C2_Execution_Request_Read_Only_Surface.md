# Studio Goal C.2 Execution Request Read-Only Surface

## Summary

Implemented the Studio Goal C.2 read-only Execution Request surface.

Execution Request records stored under `_Docs/AIWorkflow/Studio/ExecutionRequests/` are now read through a dedicated store reader, validated with the C.1 `execution_request.v1` validation logic, exposed through Director GET APIs, and rendered on the Studio Execution Request page and Home summary through `director_views.execution_requests`.

## Background

Goal C.1 introduced the durable Execution Request store, schema validation, and planner CLI. Goal C.2 exposes those records to the Human Director without readiness mutation, worker dispatch, PC Runner integration, Backlog task creation, result review generation, commit, or push.

## Scope

- Added a read-only Execution Request store reader.
- Added Director API routes:
  - `GET /api/director/execution-requests`
  - `GET /api/director/execution-requests/:id`
- Updated Director view model generation to use C.1 Execution Request store records.
- Updated the existing Studio Execution Request page to show Director-facing record details.
- Added invalid-record warning display with raw parse/validation details kept under internal/debug details.
- Added tests for list/detail, empty store, invalid records, read-only GET behavior, and no action endpoint.

## Files Changed

- `tools/aiworkflow/studio/studioExecutionRequestStore.js`
- `tools/aiworkflow/studio/studioExecutionRequestApiRoutes.js`
- `tools/aiworkflow/studio/studioApiHandlers.js`
- `tools/aiworkflow/studio/studioDataService.js`
- `tools/aiworkflow/studio/studioDirectorApiAliases.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.js`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `tools/aiworkflow/studio_director_console_server.js`
- Related Studio tests under `tools/aiworkflow/studio/`

## Architecture Notes

Responsibilities remain separated:

- Store reader: path discovery, file enumeration, JSON parsing, validation attachment.
- Validator: reused from `tools/aiworkflow/studio_execution_request_planner.js`.
- API route: GET-only list/detail envelope and no mutation handling.
- View model: Director-facing summaries and invalid-record warnings.
- UI: read-only list/detail cards with internal/debug details collapsed.

The existing generic Director API alias no longer owns `/api/director/execution-requests`; that path is owned by the dedicated Execution Request store route.

## Implementation Notes

Normal UI now shows title, objective, status, risk level, source type/ref, scope summary, non-goals summary, validation plan summary, approval state, worker intent metadata, and safety boundary text.

Invalid records are included as warning cards instead of being hidden. Raw parse and validation details are shown only under the internal/debug details area.

No mark-ready, readiness approval mutation, worker dispatch, PC Runner start, Codex/local execution, Backlog creation, Result Review generation, commit, push, or game source/data edit was implemented.

## Review Summary

Reviewed the diff for scope alignment. Changes are limited to Studio workflow tooling/UI/API/tests and this WorkLog. No game source or game data files were modified. A reviewer-noted minor store-reader diagnostic issue was fixed by treating only `ENOENT` as an empty store and surfacing other store read errors instead of silently hiding them.

AIWorkflow user guide update decision: no guide update needed. This change does not alter Discord commands, PC Runner profiles, task completion/finalization, commit/push flow, or regular workflow intervention points.

## Validation Summary

Commands run:

- `node tools/aiworkflow/studio/studioExecutionRequestPlanner.test.js` - passed
- `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js` - passed
- `node tools/aiworkflow/studio/studioDirectorViewModels.test.js` - passed
- `node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js` - passed
- `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js` - passed
- `node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js` - passed
- `node --check` on modified/new JS files - passed
- `git diff --check` - passed

## Remaining Risks

- Existing legacy WorkOrder and handoff surfaces still exist outside the new C.2 record cards. C.2 did not refactor or remove those legacy surfaces.
- The default durable Execution Request store currently may be empty; tests use the approved `_Temp/AIWorkflowStudio/execution_requests/` override boundary.

## Next Tasks

- Goal C.3 can add readiness preflight/mark-ready only after separate approval.
- Goal E worker dispatch remains deferred and must remain separate from read-only C.2 review.

## AI Assistance

Implemented by Codex CLI as the Hermes-orchestrated implementation worker for Studio Goal C.2.

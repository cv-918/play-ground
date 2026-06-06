# Studio Goal C.3 Execution Request Readiness and Preflight

## Summary

Implemented Goal C.3 readiness marking for stored Studio Execution Request records.

The Director API now supports an explicit mark-ready action that validates a target Execution Request, runs deterministic preflight checks, and updates only that target Execution Request JSON record with `status: ready_for_worker` and `approval.approval_state: approved_for_worker_readiness`.

## Scope

- Added deterministic readiness preflight checks for Execution Request records.
- Added `POST /api/director/execution-requests/actions/mark-ready`.
- Added readiness/preflight fields to the Director-facing Execution Request view model.
- Updated the Studio Execution Request card to show readiness status, preflight summary, next dispatch approval requirement, and the warning that mark-ready does not start a worker.
- Added tests for success, refusal paths, write boundaries, read-only GET routes, and no worker-process start.

## Files Changed

- `tools/aiworkflow/studio/studioExecutionRequestReadiness.js`
- `tools/aiworkflow/studio/studioExecutionRequestReadiness.test.js`
- `tools/aiworkflow/studio/studioExecutionRequestApiRoutes.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `_DevLog/WorkLog/2026-06-06_Studio_Goal_C3_Execution_Request_Readiness_Preflight.md`

## Architecture Notes

Readiness and dispatch remain separate.

- Store reader: continues to own Execution Request file loading and validation attachment.
- Readiness service: owns C.3 preflight and target-record-only mutation.
- API route: exposes the single mark-ready action.
- View model: converts readiness/preflight metadata into Director-facing summary fields.
- UI: surfaces readiness/preflight state and makes the no-worker-start boundary visible.

No worker dispatch service, PC Runner integration, runtime session model, Backlog bridge, result review generation, or local execution adapter was introduced.

## Implementation Notes

Preflight checks now verify:

- target record exists
- schema validation passes
- status is allowed for readiness
- risk level is supported
- `scope`, `non_goals`, `validation_plan`, and `return_format` contain non-empty content
- `allowed_files_or_areas` and `blocked_files_or_areas` are present
- worker executor/profile metadata is allowlisted
- `dispatch_now` is rejected
- raw shell route or command-string fields are rejected
- source/schema/save-load/build/external-tool/worker-dispatch/git safety flags remain false
- commit and push remain unauthorized

Successful mark-ready writes only the target Execution Request JSON file. It records readiness approval metadata under `approval`, including the structured preflight result and `dispatch_approved: false`.

AIWorkflow user guide update decision: no guide update was made. This change adds a Studio C.3 UI/API readiness action but does not change Discord commands, PC Runner profiles, task done/finalization, commit/push flow, or the canonical AIWorkflow regular workflow command guide.

## Validation Commands Run

- `node --check tools/aiworkflow/studio/studioExecutionRequestReadiness.js`
- `node --check tools/aiworkflow/studio/studioExecutionRequestApiRoutes.js`
- `node --check tools/aiworkflow/studio/studioDirectorViewModels.js`
- `node --check tools/aiworkflow/studio/directorConsolePage.js`
- `node --check tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `node --check tools/aiworkflow/studio/studioExecutionRequestReadiness.test.js`
- `node --check tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `node --check tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `node --check tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `node tools/aiworkflow/studio/studioExecutionRequestReadiness.test.js`
- `node tools/aiworkflow/studio/studioExecutionRequestPlanner.test.js`
- `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js`
- `node tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`
- `git diff --check`

## Validation Results

All listed `node --check` commands passed.

All listed Studio test commands passed.

`git diff --check` passed. It printed Windows line-ending conversion warnings for modified JS files, but no whitespace errors.

## Remaining Risks

- C.3 stores readiness/preflight metadata under `approval.readiness_preflight` without changing the `execution_request.v1` required schema. This preserves compatibility, but future schema documentation may need to formalize the metadata shape.
- The UI uses the existing card surface rather than a separate dedicated detail route. It still shows the required readiness status, preflight summary, and no-worker-start warning on the Execution Request detail card.
- Future Goal E must still implement dispatch approval separately and must not treat `ready_for_worker` as dispatch authorization.

## Explicit Forbidden-Scope Confirmation

- No worker dispatch implemented or triggered.
- No PC Runner integration implemented or triggered.
- No Codex/local execution from Studio implemented or triggered.
- No Backlog task creation implemented.
- No ActiveTask changes implemented.
- No result review generation implemented.
- No worker dispatch records created.
- No runtime run/session records created.
- No automatic task done, auto approval, or auto accept implemented.
- No commit or push performed.
- No game source or game data files changed.
- No save/load behavior changed.
- No build setting changes made.
- `_Temp`, `_Local`, `node_modules`, `.env`, and local config files were not modified as tracked source changes.

## Hermes Review Summary

Hermes independently reviewed the C.3 diff after Codex implementation.

Review result:

- Critical: none
- Major: none
- Minor: three non-blocking notes
  - successful mark-ready rewrites the full target JSON record, which may normalize formatting while staying semantically limited to target-record readiness metadata
  - unexpected body-read or filesystem errors are currently handled by the server-level error path rather than a C.3-specific structured error envelope
  - UI sends `approved_worker_executor: "none"` for mark-ready because C.3 does not approve dispatch; future dispatch approval should not infer executor approval from C.3 readiness metadata
- Optional: consider a future read-only preflight-only endpoint and clearer UI distinction between "recheck preflight" and "mark ready" if needed

Hermes validation rerun:

- `node --check` commands listed above: passed
- Studio C.3/C.2 related test commands listed above: passed
- `git diff --check`: passed with Windows LF-to-CRLF warnings only
- added-line security scan: no hardcoded secrets, dangerous eval/exec/deserialization, or enabled forbidden safety flags found
- scope scan: forbidden terms appeared only in UI warnings, tests, WorkLog confirmations, or explicit rejection checks such as `dispatch_now_not_allowed`; no worker dispatch, PC Runner, Codex/local execution from Studio, Backlog/ActiveTask, result review generation, commit, or push implementation was found

## Next Tasks

- Proceed to Goal D.1 Result Review foundation.
- Future Goal E should add dispatch request records only after D.1 and E.1 scope validation.

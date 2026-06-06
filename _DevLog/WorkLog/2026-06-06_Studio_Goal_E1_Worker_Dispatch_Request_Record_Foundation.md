# Studio Goal E.1 Worker Dispatch Request-Record Foundation

## Summary

Implemented the Goal E.1 Worker Dispatch request-record foundation.

Studio can now create a guarded `worker_dispatch.v1` request record from a ready Execution Request after explicit Director dispatch confirmation. The action writes only a Worker Dispatch JSON record and does not start any runner or worker process.

## Scope

Included:

- Durable Worker Dispatch store path: `_Docs/AIWorkflow/Studio/WorkerDispatches/`
- Validation/smoke override path: `_Temp/AIWorkflowStudio/worker_dispatches/`
- `WD-YYYYMMDD-HHMMSS-short-slug.json` id validation
- `worker_dispatch.v1` validation
- Planner commands: `status`, `list`, `read`, `validate`, `store`
- Store dry-run by default, write only with `--execute`
- E.1 allowlist:
  - profiles: `documentation`, `validation`
  - executors: `none`
  - command id / runner route: `studio.documentation.review`, `studio.validation.report`
- Dispatch guard/action from ready Execution Request to Worker Dispatch request record
- Read-only Director API list/detail routes for Worker Dispatch records
- Director API dispatch request action that writes only a Worker Dispatch request record
- Director UI card for ready Execution Requests and Worker Dispatch records
- Tests for schema validation, dry-run storage, store boundary, guard refusals, API read-only behavior, no runner/tool side effects, and pending Result Review linkage
- README documentation and Studio README map update

Excluded:

- Live worker process start
- PC Runner start
- Codex/local execution from Studio
- Build/test execution as a dispatched worker
- Backlog task creation
- ActiveTask changes
- Automatic Result Review generation
- Automatic Result Review acceptance
- Automatic Execution Request closure/done
- Source edits by worker
- Game source/data changes
- Save/load changes
- Build setting changes
- Commit/push

## Files Changed

E.1 files added:

- `_Docs/AIWorkflow/Studio/WorkerDispatches/README.md`
- `_DevLog/WorkLog/2026-06-06_Studio_Goal_E1_Worker_Dispatch_Request_Record_Foundation.md`
- `tools/aiworkflow/studio_worker_dispatch_planner.js`
- `tools/aiworkflow/studio_worker_dispatch_planner.bat`
- `tools/aiworkflow/studio/studioWorkerDispatchStore.js`
- `tools/aiworkflow/studio/studioWorkerDispatchGuard.js`
- `tools/aiworkflow/studio/studioWorkerDispatchApiRoutes.js`
- `tools/aiworkflow/studio/studioWorkerDispatchPlanner.test.js`

E.1 files updated:

- `_Docs/AIWorkflow/Studio/README.md`
- `tools/aiworkflow/studio/studioApiHandlers.js`
- `tools/aiworkflow/studio/studioDataService.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`
- `tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `tools/aiworkflow/studio_director_console_server.js`

Pre-existing C.3 readiness/preflight and D.1 Result Review changes were already present in the working tree and were not reverted.

## Architecture Notes

The E.1 structure follows the Execution Request and Result Review foundation pattern:

```text
Worker Dispatch planner
  -> validates schema, id, allowlist, store path, dry-run store

Worker Dispatch store adapter
  -> reads durable JSON records and attaches validation state

Dispatch guard
  -> validates ready Execution Request, readiness preflight, Director confirmation, allowlist, and blocked intents
  -> writes only a Worker Dispatch request record

Worker Dispatch API route
  -> exposes read-only list/detail plus guarded request-record creation

Director view model/UI
  -> converts raw dispatch records into Director-facing cards and visible no-runner-start boundaries
```

Responsibility boundaries:

- Execution Request readiness remains owned by C.3 readiness metadata.
- Worker Dispatch guard owns E.1 dispatch approval validation.
- Worker Dispatch store owns only request record persistence.
- API and UI do not start PC Runner, Codex, local execution, build/test commands, worker processes, Backlog/ActiveTask mutation, Result Review generation, commit, or push.

## Implementation Notes

`worker_dispatch.v1` required fields:

- `worker_dispatch_id`
- `schema_version`
- `execution_request_id`
- `dispatch_state`
- `dispatch_mode`
- `profile`
- `executor`
- `command_id_or_runner_route`
- `preflight_result`
- `approval`
- `runner_plan_id`
- `runner_run_id`
- `evidence_refs`
- `result_review_id`
- `status_summary`
- `created_at`
- `updated_at`

E.1-created records use:

- `dispatch_state: "ready_to_start"`
- `dispatch_mode: "dispatch_request_record_only"`
- `executor: "none"`
- `runner_plan_id: ""`
- `runner_run_id: ""`
- `evidence_refs: []`
- `result_review_id: "pending"`

The dispatch guard rejects:

- missing or invalid `execution_request_id`
- missing Execution Request record
- invalid Execution Request schema
- non-`ready_for_worker` Execution Request status
- missing `approved_for_worker_readiness`
- missing or failed readiness preflight
- missing `director_confirmation`
- missing `approval_summary`
- raw shell commands and command-string fields
- unapproved profiles, executors, command ids, or runner routes
- commit/push intent
- game source/data write authorization
- schema, save/load, or build setting authorization

AIWorkflow user guide update decision: no guide update was made. E.1 adds a Studio-local Worker Dispatch request-record store/API/UI action but does not change Discord commands, PC Runner profiles, live executor routing, task done/finalization, commit/push behavior, manual escalation steps, or the canonical regular AIWorkflow command guide. The request-record-only boundary is documented in the WorkerDispatches README, Studio README, UI copy, tests, and this WorkLog.

## Validation Commands Run

- `node --check tools/aiworkflow/studio_worker_dispatch_planner.js`
- `node --check tools/aiworkflow/studio/studioWorkerDispatchStore.js`
- `node --check tools/aiworkflow/studio/studioWorkerDispatchGuard.js`
- `node --check tools/aiworkflow/studio/studioWorkerDispatchApiRoutes.js`
- `node --check tools/aiworkflow/studio/studioWorkerDispatchPlanner.test.js`
- `node --check tools/aiworkflow/studio/studioApiHandlers.js`
- `node --check tools/aiworkflow/studio/studioDataService.js`
- `node --check tools/aiworkflow/studio/studioDirectorViewModels.js`
- `node --check tools/aiworkflow/studio/directorConsolePage.js`
- `node --check tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `node --check tools/aiworkflow/studio_director_console_server.js`
- `node --check tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `node --check tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `node --check tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `node --check tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`
- `node tools/aiworkflow/studio/studioWorkerDispatchPlanner.test.js`
- `node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `node tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`
- `node tools/aiworkflow/studio/studioExecutionRequestReadiness.test.js`
- `node tools/aiworkflow/studio/studioExecutionRequestPlanner.test.js`
- `node tools/aiworkflow/studio/studioResultReviewPlanner.test.js`
- `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js`
- `node tools/aiworkflow/studio_worker_dispatch_planner.js status --json`
- `git diff --check`

## Validation Results

All listed `node --check` commands passed.

All listed Studio test commands passed.

`node tools/aiworkflow/studio_worker_dispatch_planner.js status --json` passed and returned the durable Worker Dispatch store path with `worker_dispatch_count: 0` and read-only safety flags.

`git diff --check` passed. It printed Windows line-ending conversion warnings for modified tracked files, but no whitespace errors.

## Remaining Risks

- E.1 records use `result_review_id: "pending"` because automatic Result Review generation is intentionally excluded. Future live-run work must link evidence and create or explicitly defer Result Review records under a separately approved scope.
- E.1 uses one small allowlist. Future E.2 live smoke must explicitly approve any real executor and route before runner start is implemented.
- Multiple request records can be created for the same ready Execution Request. This preserves traceability and avoids mutating Execution Request state in E.1, but future lifecycle work may add supersession or closure rules.

## Explicit Forbidden-Scope Confirmation

- No live runner start implemented or triggered.
- No PC Runner start implemented or triggered.
- No Codex/local execution from Studio implemented or triggered.
- No build/test dispatched worker implemented or triggered.
- No Backlog task creation implemented.
- No ActiveTask changes implemented.
- No automatic Result Review generation implemented.
- No automatic Result Review acceptance implemented.
- No Execution Request closure/done implemented.
- No source edits by worker implemented.
- No game source or game data files changed.
- No save/load behavior changed.
- No build setting changes made.
- No commit or push performed.
- `_Local`, `node_modules`, `.env`, and local config files were not modified as tracked source changes.
- `_Temp` was used only by tests and was not added as tracked source.

## Review Summary

Self-review after implementation:

- Critical: none found.
- Major: none found.
- Minor: none blocking. The current git diff still includes pre-existing uncommitted C.3 and D.1 changes; Hermes should review E.1 on top of that working tree.
- Optional: future E.2 can add a single live safe runner smoke only after separate approval of executor and route.

## Hermes Review Summary

Hermes independently reviewed the E.1 diff after Codex implementation and ran a secondary subagent review.

Initial review found two Major E.1 safety issues, both fixed in-scope:

1. Dispatch approval body could select a different allowlisted profile/route than the Execution Request worker intent that readiness/preflight covered.
   - Fix: dispatch guard now checks approved profile/executor/command route against `execution_request.worker_intent`.
   - If `worker_intent.worker_command_id_or_route` is present, the approved route must match it exactly.
   - If it is absent, the approved route must match the request-record default for the approved/preflighted profile.
   - Added regression test: mismatched documentation intent vs validation route is rejected.
2. `dispatch_request_record_only` validation accepted live lifecycle states such as `running`.
   - Fix: request-record-only records now validate only the E.1 request-record state `ready_to_start`.
   - Later live states remain final-form concepts for future E.2+ work, not valid E.1 records.
   - Added regression test: `dispatch_state: "running"` is rejected for request-record-only mode.

Post-fix Hermes validation:

- E.1 targeted `node --check`: passed
- E.1 targeted tests: passed
- Full C.3/D.1/E.1 affected Studio test chain: passed
- `node tools/aiworkflow/studio_worker_dispatch_planner.js status --json`: passed with read-only safety flags
- `git diff --check`: passed with Windows LF-to-CRLF warnings only
- added-line security scan: no hardcoded secrets, dangerous eval/exec/deserialization, or enabled forbidden safety flags found
- scope scan: forbidden terms appeared only in UI warnings, tests, WorkLog confirmations, or explicit safety/non-goal text; no live runner start, PC Runner, Codex/local execution from Studio, build/test dispatched worker, Backlog/ActiveTask, automatic Result Review generation/acceptance, Execution Request closure/done, source/game data changes, commit, or push implementation was found
- Hermes server smoke: `GET /api/director/worker-dispatches` returned HTTP 200 with an empty read-only store; `GET /` returned HTTP 200 and contained `Worker Dispatch 레코드`, `dispatch 요청 기록`, `renderWorkerDispatchCard`, and `E.1 request record only`; the smoke server was killed afterward

Review result after fixes:

- Critical: none
- Major: none remaining
- Minor: non-blocking note only
  - Worker Dispatch record writes use check-then-write rather than atomic create; random IDs make collisions unlikely, but future hardening can use exclusive create (`wx`)
- Optional:
  - E.2 should define duplicate request pickup/supersession policy before any live runner pickup is added

## Next Tasks

- Proceed to Goal E.2 only after choosing the one approved live-safe executor/route.
- Future Goal E.2 may approve one live safe runner smoke with explicit executor/route and evidence/Result Review linkage.

# Studio Goal E.2 Safe Live Runner Smoke

## Summary

Implemented the smallest bounded E.2 safe live runner smoke path for Studio
Worker Dispatch.

The runner is limited to one route:

```text
profile: validation
executor: hermes_safe_smoke
command_id_or_runner_route: studio.validation.report
```

It reads one eligible Worker Dispatch request record, performs deterministic
validation/report checks, writes safe smoke evidence, updates the Worker
Dispatch with safe-smoke runner refs, and generates a linked Result Review for
Director review.

## Approved E.2 Route Values

- `profile`: `validation`
- `executor`: `hermes_safe_smoke`
- `command_id_or_runner_route`: `studio.validation.report`

## Files Changed

- `_Docs/AIWorkflow/Studio/README.md`
- `_Docs/AIWorkflow/Studio/WorkerDispatches/README.md`
- `_Docs/AIWorkflow/Studio/WorkerDispatchEvidence/README.md`
- `tools/aiworkflow/studio_worker_dispatch_planner.js`
- `tools/aiworkflow/studio_safe_smoke_runner.js`
- `tools/aiworkflow/studio_safe_smoke_runner.bat`
- `tools/aiworkflow/studio/studioWorkerDispatchSafeSmokeRunner.js`
- `tools/aiworkflow/studio/studioWorkerDispatchSafeSmokeRunner.test.js`
- `tools/aiworkflow/studio/studioWorkerDispatchPlanner.test.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `_DevLog/WorkLog/2026-06-06_Studio_Goal_E2_Safe_Live_Runner_Smoke.md`

## Implementation Notes

- Added `safe_smoke_run` as the narrow E.2 Worker Dispatch mode.
- Preserved E.1 validation: `dispatch_request_record_only` still accepts only
  `ready_to_start`, empty runner refs, and `executor: none`.
- Added `hermes_safe_smoke` only for the E.2 safe smoke transition.
- Added `tools/aiworkflow/studio_safe_smoke_runner.js` and `.bat`.
- Added read/status/preflight/dry-run behavior; writes require `run <id>
  --execute`.
- Default durable evidence location is
  `_Docs/AIWorkflow/Studio/WorkerDispatchEvidence/`.
- Tests use only `_Temp/AIWorkflowStudio/worker_dispatches/`,
  `_Temp/AIWorkflowStudio/result_reviews/`, and
  `_Temp/AIWorkflowStudio/worker_dispatch_evidence/` overrides.
- Director read-only visibility was updated through existing Worker Dispatch
  view models and card copy. No Studio browser/API action was added to start
  the safe smoke runner.

## Safety Notes

- No PC Runner integration was added.
- No Codex/local arbitrary execution from Studio was added.
- No shell command strings are read from Worker Dispatch records.
- No build/test runner dispatch was added as a worker route.
- No game source or game data files were changed.
- No Backlog or ActiveTask mutation was added.
- No Execution Request accept/reject/close/done behavior was added.
- No automatic Result Review accept/reject behavior was added.
- No commit, push, or deployment was performed.
- Safe smoke result records use explicit flags such as
  `safe_smoke_runner_started` and `safe_smoke_evidence_written`; generic
  `runner_started`, `pc_runner_started`, `codex_started`,
  `local_execution_started`, `build_test_dispatched`,
  `worker_process_started`, source/game/git/commit/push flags remain false.

## Validation Commands Run

```text
node --check tools/aiworkflow/studio_worker_dispatch_planner.js
node --check tools/aiworkflow/studio_safe_smoke_runner.js
node --check tools/aiworkflow/studio/studioWorkerDispatchSafeSmokeRunner.js
node --check tools/aiworkflow/studio/studioWorkerDispatchSafeSmokeRunner.test.js
node --check tools/aiworkflow/studio/studioDirectorViewModels.js
node --check tools/aiworkflow/studio/directorConsolePage.js
node tools/aiworkflow/studio/studioWorkerDispatchSafeSmokeRunner.test.js
node tools/aiworkflow/studio/studioWorkerDispatchPlanner.test.js
node tools/aiworkflow/studio/studioResultReviewPlanner.test.js
node tools/aiworkflow/studio/studioExecutionRequestReadiness.test.js
node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js
node tools/aiworkflow/studio/studioDirectorViewModels.test.js
node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js
node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js
git diff --check
tools\aiworkflow\studio_smoke_check.bat
targeted local server smoke for E.2 Worker Dispatch/Result Review read-only API
```

## Validation Results

- JS syntax checks passed.
- New E.2 safe smoke runner tests passed.
- Existing C.3/D.1/E.1 regression tests passed.
- Director API and view model tests passed.
- `git diff --check` passed with Git CRLF conversion warnings only.
- Targeted local server smoke passed:
  - Director HTML contains E.2 safe smoke copy.
  - Director HTML contains `hermes_safe_smoke` copy.
  - `/api/director/worker-dispatches` returned read-only OK.
  - `/api/director/result-reviews` returned read-only OK.
- Broad `tools\aiworkflow\studio_smoke_check.bat` did not pass. The HTML and
  client script checks passed, but several pre-existing broad Studio report
  endpoints returned HTTP 500. This failure was not specific to the E.2
  Worker Dispatch / Result Review read-only surface validated by the targeted
  smoke.

## Remaining Risks

- E.2 safe smoke has not been run against a durable real Worker Dispatch
  record in `_Docs/AIWorkflow/Studio/WorkerDispatches/`; tests exercised the
  same behavior through `_Temp` store overrides.
- Broad Studio smoke still has unrelated 500 endpoint failures that should be
  investigated separately before treating full Studio smoke as green.
- The generated Result Review remains advisory. Human Director/Hermes must
  still review it; it does not accept/reject/close/done the Execution Request.

## AIWorkflow User Guide Update Decision

`_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` was not updated in this
change set. E.2 adds a narrow internal/manual Studio smoke runner and read-only
visibility, but it does not change Discord commands, PC Runner profiles,
regular task done/finalization/commit/push steps, or the normal Human Director
guide workflow.

## Hermes Review Summary

Hermes independently reviewed the E.2 diff after Codex implementation and ran a secondary subagent review.

Review result:

- Critical: none
- Major: none
- Minor: three non-blocking notes
  - The `preflight` command currently reports eligibility and does not check evidence/Result Review path collisions as deeply as `run` dry-run does. Operators should use dry-run before execute; future hardening can make `preflight` call the full run-plan builder.
  - Initial Codex output allowed `closed` as a valid `safe_smoke_run` state. Hermes narrowed E.2 safe-smoke validation to `result_ready` only and added a regression assertion that `closed` is rejected.
  - Safe smoke writes evidence, Result Review, and Worker Dispatch sequentially. A future hardening task can use atomic writes or a staging/commit pattern to reduce orphan artifact risk.
- Optional:
  - Completed `safe_smoke_run` display could verify linked evidence and Result Review files exist before presenting a completed status.

Hermes validation after the minor fix:

- E.2 targeted `node --check`: passed
- E.2 safe smoke runner tests: passed
- C.3/D.1/E.1/E.2 affected Studio regression tests: passed
- `git diff --check`: passed with Windows LF-to-CRLF warnings only
- added-line security scan: no hardcoded secrets, dangerous eval/exec/deserialization, or enabled forbidden safety flags found
- process-related scan found only raw-shell detection regex/test fixtures used to reject dangerous command strings, not process execution
- server smoke: `GET /api/director/worker-dispatches` HTTP 200, `GET /api/director/result-reviews` HTTP 200, `GET /` HTTP 200, HTML contained `E.2`, `hermes_safe_smoke`, `Worker Dispatch`, and `Result Review`; the smoke server was killed afterward

Scope result:

- No PC Runner integration was added.
- No Codex/local arbitrary execution from Studio was added.
- No browser/API action starts the safe smoke runner.
- No source/game data edits, Backlog/ActiveTask mutation, Execution Request accept/reject/close/done, automatic Result Review acceptance, commit, or push behavior was added.

## Next Tasks

- Investigate the unrelated broad Studio smoke HTTP 500 failures as a separate
  Studio stabilization task.
- Decide commit boundary after human review of the full C.3/D.1/E.1/E.2 diff.
- Do not commit until the Human Director chooses the commit boundary.

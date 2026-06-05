# WorkLog - Studio North Star Scope Correction

## Date

2026-06-04

## Summary

Recorded the corrected product direction for the user's broader personal AI game development operating system and updated Studio direction documents to reflect it.

## Background

The previous framing over-centered Studio as the whole desired service. The user clarified that Studio is only one product surface within a broader personal development operating system for a solo game developer/IP Director.

The user also clarified that implementation approval must be scope-based, not triggered repeatedly by every source edit inside an approved task.

## Scope

Documentation-only update.

## Files Changed

- `_Docs/Studio/Personal_AI_Game_Development_Operating_System_North_Star.md`
- `_Docs/Studio/Personal_AI_Game_Development_Operating_Rules.md`
- `_Docs/Studio/Studio_Current_System_Diagnostic_2026-06-04.md`
- `_Docs/Studio/README.md`
- `_Docs/Studio/Studio_Director_Workflow_Principles.md`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`

## Key Direction Changes

- The desired service is broader than Studio.
- Studio is the first Director-facing console for a broader personal AI game development operating system.
- Current Studio surface remains focused on five functions:
  - Conversation
  - Decision
  - Execution Request
  - Result Review
  - Record Keeping
- Approval is scope-based, not file-edit-based.
- AI workers should not repeatedly ask for permission to edit source files inside an already-approved scope.
- Renewed approval is required when the work expands beyond approved scope or introduces structural/schema/save-load/build/runtime/deployment changes.
- Practical operating rules were added to convert the North Star into daily workflow stages: Conversation, Decision, Execution Request, Execution, Result Review, and Record Keeping.
- A current-system diagnostic report was added to document where the existing Studio implementation still leaks internal AIWorkflow/operator concepts into the Director-facing UX.
- Tool routing rules were documented for Hermes, Codex CLI, Codex App, Git/build/test/diff, LLM Wiki, Khoj, OpenClaw, and Studio.
- Studio is not a raw terminal operations UI, but it may internally use Hermes, CLI workers, gateways, or terminal-like tools.
- OpenClaw was added as a future ambient assistant / channel-and-presence layer candidate for cross-device conversation, inbound intake, notifications, voice/mobile/chat surfaces, and possible AI staff presence.
- OpenClaw should route into the same Director workflow and approval model instead of becoming a separate governance authority, implementation worker, or Director Brain.
- Generic agent dashboard/operator dashboard boundaries were clarified as internal machinery management that should not become the default Director UX.

## Validation

No build or runtime validation was required because this was documentation-only.

Performed validation:

- Created/updated markdown files using Hermes file tools.
- Reviewed resulting git diff.

## Remaining Risks

- Existing older `_Docs/AIWorkflow/Studio/` documents may still contain legacy framing.
- Additional future work may be needed to align older Studio/Handoff/AIWorkflow documents with this North Star.
- No source code or workflow runtime behavior was changed.

## Fast UX Containment Implementation

After the diagnostic, the user approved the bounded `/goal Studio Fast UX Containment` scope.

Implemented a small UI-level containment pass without backend model redesign, JSON schema changes, build setting changes, or game source changes.

### Additional Files Changed

- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/studioSessionsPageRenderer.js`
- `tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `tools/aiworkflow/studio/studioDiffPageRenderer.js`

### UX Containment Notes

- Added a global `[hidden] { display: none !important; }` safeguard so hidden sections are not overridden by layout CSS.
- Fixed the Studio conversation page shell so it participates in the normal page navigation system with `class="page"` and `data-page="sessions"`.
- Changed the primary navigation toward Director-facing functions: Conversation, Decision, Execution Request, Result Review, Record Keeping.
- Moved the toolbox out of the primary Director navigation and into the internal tools section.
- Renamed visible WorkOrder/work/task/Runner-oriented labels where feasible in this containment pass to execution request / execution record language.
- Reduced slash-command, raw ID, Git Gate, WorkOrder, Backlog, ActiveTask, and Runner terminology in primary UX copy without removing the underlying internal implementation.

### Additional Validation

Performed validation:

- `git status --short` before implementation.
- `node --check tools/aiworkflow/studio/directorConsolePage.js`
- `node --check tools/aiworkflow/studio/studioSessionsPageRenderer.js`
- `node --check tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `node --check tools/aiworkflow/studio/studioDiffPageRenderer.js`
- Extracted the generated browser script from the served Studio HTML and ran `node --check _Temp/studio_page_script_check.js`.
- `git diff --check`
- Started Studio server locally with `node tools/aiworkflow/studio_director_console_server.js --host 127.0.0.1 --port 4317`.
- Browser smoke checked the home page and Studio conversation page.
- Browser DOM inspection confirmed only the active page is visible and hidden home sections compute to `display: none`.

Validation notes:

- The server requested port `4317` but used fallback ports during validation because previous local ports were occupied.
- Browser navigation worked for home -> Studio conversation and the primary nav showed: Home, Studio Conversation, Decision, Execution Request, Result Review, Record Keeping.
- Browser console tooling reported one blank `exception` entry with no message/source while the page remained functional; no actionable console message was available from the browser tool.

### Remaining Risks After Containment

- Internal AIWorkflow runtime concepts still exist in code, data structures, API routes, and debug/operations surfaces.
- Some secondary/admin pages still contain legacy terminology and should be handled by the next Director Surface Refactor goal rather than expanded inside this containment pass.
- Commit/push controls still exist in the change review detail surface; they were not removed because that would exceed the UI containment scope and change operational behavior.

## Director Surface Refactor Planning

After the Fast UX Containment pass, the user approved moving to the next remediation step.

Created a bounded implementation plan for Goal 2:

- `_Docs/Studio/Studio_Director_Surface_Refactor_Plan_2026-06-04.md`

The plan keeps the next step focused on the Director-facing surface rather than backend/API consolidation. It defines:

- the five-function Studio shell model
- allowed changes and non-goals
- renewed approval triggers
- final-form architecture and reduced-scope implementation
- task-by-task implementation plan
- validation plan
- expected return format

This planning step did not change Studio source code beyond the previously completed containment pass.

## Director Surface Refactor Implementation

The user approved `_Docs/Studio/Studio_Director_Surface_Refactor_Plan_2026-06-04.md` as the Goal 2 execution scope.

Implemented the reduced-scope Director Surface Refactor:

- Added `DIRECTOR_FLOW` metadata for Conversation, Decision, Execution Request, Result Review, and Record Keeping.
- Added secondary page grouping metadata for operations, reference, and internal/admin surfaces.
- Reworked the sidebar so the normal flow is presented as Director Flow rather than a generic operator page list.
- Renamed secondary toggles to `참고/검증 자료`, `프로젝트/조직 참고`, and `관리자 도구`.
- Rebuilt Home as `Director Desk` with a five-function flow card area, next judgment area, and result/record attention area.
- Removed Home's first-view dependency on runner/status style cards while preserving hidden support sections and underlying implementation.
- Updated primary page subtitles and role copy for Conversation, Decision, Execution Request, Result Review, and Record Keeping.
- Updated result-review follow-up copy from `수정 업무 지시` language to `수정 실행 요청` language.

Validation performed:

- `node --check tools/aiworkflow/studio/directorConsolePage.js`
- `node --check tools/aiworkflow/studio/studioSessionsPageRenderer.js`
- `node --check tools/aiworkflow/studio/studioInboxPageRenderer.js`
- `node --check tools/aiworkflow/studio/studioWorkPageRenderer.js`
- `node --check tools/aiworkflow/studio/studioEvidencePageRenderer.js`
- `node --check tools/aiworkflow/studio/studioKnowledgePageRenderer.js`
- `node --check tools/aiworkflow/studio/studioClientWorkflowResultScript.js`
- `git diff --check`
- Started Studio server with `node tools/aiworkflow/studio_director_console_server.js --host 127.0.0.1 --port 4317`.
- Extracted served inline browser script and ran `node --check _Temp/studio_page_script_check.js`.
- Browser smoke checked `http://127.0.0.1:4322/`.
- Browser DOM inspection confirmed Home shows only the Home page and support nav groups are hidden by default.
- Browser DOM inspection confirmed all five primary pages render one at a time with Director-facing subtitles.
- Browser console check reported no console messages and no JS errors after the primary-page smoke check.

Validation notes:

- Server again used a fallback port (`4322`) even though `4317` was requested.
- `git diff --check` passed with Windows LF-to-CRLF warnings only.
- Server process was stopped after validation.

Remaining risks:

- This did not consolidate backend/API/data models; WorkOrder/Handoff/Runner-style internals still exist behind the UI.
- Secondary and admin/debug surfaces may still expose older terminology when opened intentionally.
- Commit/push controls remain in the secondary change-review surface because changing operational behavior was outside Goal 2.

Recommended next goal:

- `Studio Internal Model/API Consolidation Plan` should handle the internal artifact taxonomy and route/model consolidation after the Director surface is reviewed.

## Internal Model/API Consolidation Planning

Created a bounded planning document for Goal 3:

- `_Docs/Studio/Studio_Internal_Model_API_Consolidation_Plan_2026-06-04.md`

The plan is intentionally documentation/planning only. It does not change source behavior, API routes, JSON schemas, persisted folders, runtime policy, or build settings.

Inventory notes captured in the plan:

- Studio has 38 JavaScript modules under `tools/aiworkflow/studio/`.
- Route-ish comparisons remain concentrated across route modules: tool automation 22, planning meeting 17, evidence review 13, knowledge/decision 7, work order 7, workflow 5.
- Internal terminology remains concentrated in payload builders, review plan builders, planning meeting routes, operational plan builders, generic result formatting, document data loaders, work order routes, and workflow routes.
- The plan maps current artifacts to the five Director-facing functions and recommends read-only Director view-model adapters before route aliases or schema work.

Recommended next implementation goal after review:

- `/goal Studio Internal Model/API Inventory and Read-Only View Models`

This next goal should create a route/artifact inventory and read-only Director view-model adapters without schema changes, route removals, persisted folder moves, or runtime behavior changes.

## Internal Model/API Inventory and Read-Only View Models

Implemented the next bounded goal:

- `Studio Internal Model/API Inventory and Read-Only View Models`

Files added:

- `_Docs/Studio/Studio_Internal_Model_API_Inventory_2026-06-04.md`
- `tools/aiworkflow/studio/studioDirectorViewModels.js`
- `tools/aiworkflow/studio/studioDirectorViewModels.test.js`

Files updated:

- `tools/aiworkflow/studio_director_console_server.js`
- `_Docs/Studio/README.md`

Behavior/model summary:

- Added read-only Director view-model adapters:
  - `ConversationRecord`
  - `DecisionItem`
  - `ExecutionRequest`
  - `ResultReviewItem`
  - `RecordItem`
- Added `director_views` to `/api/summary` by adapting existing loaded artifacts after they are read.
- Existing artifact folders, JSON field names, route handlers, runtime execution policy, git behavior, and build settings were not changed.
- Added an inventory document listing Studio route modules, persisted artifact compatibility mapping, and internal-term concentration.

TDD/validation notes:

- Wrote `studioDirectorViewModels.test.js` first.
- Verified RED failure: missing `./studioDirectorViewModels` module.
- Implemented the read-only adapter module.
- Verified GREEN with `node tools/aiworkflow/studio/studioDirectorViewModels.test.js`.
- Verified server summary integration with `node tools/aiworkflow/studio_director_console_server.js --once` and a JSON assertion that `director_views` contains the five expected view arrays.
- Ran Studio server and browser smoke checked `/api/summary` from the page context. The response included `director_views` with keys `conversation_records`, `decision_items`, `execution_requests`, `result_review_items`, and `record_items`.
- Browser console had no messages and no JavaScript errors during the smoke check.
- Server process was stopped after validation.

## UI Consume Director View Models

Implemented the next bounded goal:

- `Studio UI Consume Director View Models`

Files added:

- `tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`

Files updated:

- `tools/aiworkflow/studio/directorConsolePage.js`

Behavior/model summary:

- Added client-side helpers that read `state.director_views` first:
  - `directorViewItems(key)`
  - `directorViewCount(key)`
  - `renderDirectorViewCard(item, options)`
- Updated the Director-facing primary UI to consume normalized read-only view arrays where available:
  - `conversation_records` for Studio Conversation records
  - `decision_items` for Decision queue cards
  - `execution_requests` for Execution Request cards
  - `result_review_items` for Result Review and home evidence cards
  - `record_items` for Record Keeping cards
- Updated navigation counts for the five Director-facing primary functions to prefer `director_views` counts.
- Preserved fallback behavior for decision gates when `decision_items` is empty.
- Did not remove legacy artifact loaders, API routes, persisted JSON fields, runtime behavior, build settings, git behavior, or source folders.

TDD/validation notes:

- Wrote `directorConsoleDirectorViews.test.js` first.
- Verified RED failure: `directorConsolePage` did not yet define the `directorViewItems` helper or consume the five `director_views` arrays.
- Implemented the UI consumption layer in `directorConsolePage.js`.
- Verified GREEN with `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`.
- Re-ran `studioDirectorViewModels.test.js` to confirm the server-side normalized view-model adapters still pass.
- Ran Node syntax checks for changed Studio modules and server entrypoint.
- Ran `node tools/aiworkflow/studio_director_console_server.js --once` and asserted the five expected `director_views` arrays still exist.
- Ran Studio server and browser smoke checked the primary pages. Evidence and Knowledge pages rendered normalized Director cards from `result_review_items` and `record_items`; pages with empty normalized arrays rendered safe empty/fallback states.
- Browser console had no messages and no JavaScript errors during the smoke check.
- Server process was stopped after validation.
- `git diff --check` passed; only Windows LF-to-CRLF working-copy warnings were emitted.

## Director API Alias Planning

Created a bounded planning document for the next API-boundary goal:

- `_Docs/Studio/Studio_Director_API_Alias_Plan_2026-06-04.md`

The plan is intentionally documentation/planning only. It does not add routes, remove routes, change `/api/summary`, change persisted JSON schemas, move folders, alter runtime behavior, or modify build/git behavior.

Plan summary:

- Defines Phase 1 read-only Director API aliases over existing `director_views`:
  - `GET /api/director/conversations`
  - `GET /api/director/decisions`
  - `GET /api/director/execution-requests`
  - `GET /api/director/result-reviews`
  - `GET /api/director/records`
- Defines a shared response envelope with `director_api_version`, `function`, `source`, `generated_at`, `count`, and `items`.
- Keeps legacy/action routes as compatibility routes.
- Recommends implementing aliases in a new `studioDirectorApiAliases.js` handler registered through `studioApiHandlers.js` after `/api/summary` and before legacy route modules.
- Explicitly defers POST/action aliases to a separate future plan because they touch state-changing approval, execution, record, and audit boundaries.

Future implementation recommendation:

- `/goal Studio Director Read-Only API Aliases`

## Director Read-Only API Aliases

Implemented the approved API-boundary goal:

- `Studio Director Read-Only API Aliases`

Files added:

- `tools/aiworkflow/studio/studioDirectorApiAliases.js`
- `tools/aiworkflow/studio/studioDirectorApiAliases.test.js`

Files updated:

- `tools/aiworkflow/studio/studioApiHandlers.js`

Behavior/model summary:

- Added five read-only Director API aliases over existing `director_views`:
  - `GET /api/director/conversations`
  - `GET /api/director/decisions`
  - `GET /api/director/execution-requests`
  - `GET /api/director/result-reviews`
  - `GET /api/director/records`
- Each alias returns a shared envelope with `ok`, `director_api_version`, `function`, `view_key`, `source`, `generated_at`, `count`, and `items`.
- Added read-only normalized filters for `status`, `source_type`, `q`, and `limit`.
- Registered the alias handler in `studioApiHandlers.js` after `/api/summary` and before legacy/action route modules.
- Preserved `/api/summary`, legacy routes, persisted JSON schemas, persisted folders, runtime behavior, build settings, commit/push behavior, and game source.
- Did not add POST/action aliases.

TDD/validation notes:

- Wrote `studioDirectorApiAliases.test.js` first.
- Verified RED failure: missing `./studioDirectorApiAliases` module.
- Implemented `studioDirectorApiAliases.js` and registered it in the central dispatcher.
- Verified GREEN with `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js`.
- Re-ran related Studio tests: `studioDirectorViewModels.test.js` and `directorConsoleDirectorViews.test.js`.
- Ran Node syntax checks for alias module, alias test, dispatcher, and server entrypoint.
- Ran `node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json`.
- Started Studio server. Requested port was `4317`; actual fallback URL was `http://127.0.0.1:4325/`.
- Fetched all five alias endpoints plus a filtered records request. Counts observed:
  - conversations: 0
  - decisions: 0
  - execution requests: 0
  - result reviews: 10
  - records: 24
  - records filtered by `source_type=devlog&limit=2`: 2
- Browser context fetched the same alias endpoints successfully and reported no console messages or JavaScript errors.
- Server process was stopped after validation.

## Director Surface Smoke and Commit Preparation

Prepared the current Studio Director surface chain for Human Director commit decision.

Created:

- `_Docs/Studio/Studio_Director_Surface_Smoke_and_Commit_Preparation_2026-06-04.md`

Updated:

- `_Docs/Studio/README.md`

Commit boundary summary:

- Studio commit candidate files: 26 after adding the commit-preparation report.
- Exclude pre-existing `_Docs/Handoff/*` changes from the Studio commit.
- No commit was created automatically.

Static/review summary:

- Ran static scan for obvious hardcoded credentials and dangerous execution patterns across Studio docs/source. No matches found.
- Independent review passed:
  - `security_concerns: []`
  - `logic_errors: []`
- Independent review listed only non-blocking suggestions: dispatcher-level alias test, href/path assertion coverage, and possible status wording update for the API alias plan.

Integrated validation summary:

- Re-ran Director API alias, Director view model, and UI director_views consumption tests.
- Ran Node syntax checks for the changed Studio modules and server entrypoint.
- Ran `node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json` and asserted the five `director_views` arrays.
- Started live Studio server. Requested port was `4317`; actual fallback URL was `http://127.0.0.1:4326/`.
- Fetched `/api/summary`, all five `/api/director/*` aliases, and a filtered records request.
- Browser-smoked the six primary Director pages and confirmed one visible primary page per navigation state.
- Browser console had no messages and no JavaScript errors.
- Server process was stopped after validation.

Remaining risk recorded:

- Server startup emitted `MaxListenersExceededWarning` while using port fallback. UI/API smoke passed, but this should be tracked as future technical cleanup.

## Server Port Fallback Listener Warning Fix

Fixed the runtime cleanup goal:

- `Studio Server Port Fallback Listener Warning Fix`

Root cause:

- `listenOnce()` reused the same Node `http.Server` across port fallback attempts.
- On each busy port, `server.listen(port, host, callback)` internally left a `listening` callback registered after the `EADDRINUSE` error path.
- After enough busy ports, stale `listening` listeners accumulated and Node emitted `MaxListenersExceededWarning`.

Fix:

- Replaced the `server.listen(..., callback)` callback form with explicit `server.once("listening", onListening)`.
- Updated cleanup to remove both `error` and `listening` handlers on success and failure.
- Kept existing port fallback behavior and `/api/summary` / `/api/director/*` behavior unchanged.

Test added:

- `tools/aiworkflow/studio/studioServerPortFallback.test.js`

TDD evidence:

- RED: the new test reproduced `MaxListenersExceededWarning` when 12 consecutive ports were occupied.
- GREEN: the same test passed after listener cleanup was fixed.

Environment cleanup:

- Found stale Studio server `node.exe` processes still listening on `4317` through `4326` from earlier smoke runs.
- Confirmed their command line was `tools/aiworkflow/studio_director_console_server.js --host 127.0.0.1 --port 4317`.
- Terminated those stale Studio server processes only.
- Confirmed port `4317` was free before live validation.

Validation summary:

- Re-ran Studio port fallback test, Director API alias test, Director view-model test, and UI director_views consumption test.
- Ran Node syntax checks for the changed server/test and key Studio modules.
- Ran `--once` summary validation.
- Started live server on requested port `4317`; observed URL was exactly `http://127.0.0.1:4317/`, with no port fallback and no listener warning.
- Fetched `/api/summary`, all five `/api/director/*` aliases, and filtered records request.
- Browser-smoked primary Director pages and verified all five `/api/director/*` aliases returned `ok: true`.
- Browser console had no messages and no JavaScript errors.
- After validation, stopped the server and confirmed port `4317` was free.

## Director API Contract and Action Model Planning

Continued the Studio Director-facing surface stabilization with four bounded follow-up tasks:

1. Added API handler wiring coverage for the read-only Director aliases.
2. Strengthened Director view card traceability expectations and added `rel="noopener noreferrer"` to source links opened with `target="_blank"`.
3. Documented the current read-only Director API contract.
4. Wrote the plan-only Director Action Model for future write/action work.

Files added:

- `tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `_Docs/Studio/Studio_Director_Read_Only_API_Contract_2026-06-05.md`
- `_Docs/Studio/Studio_Director_Action_Model_Plan_2026-06-05.md`

Files updated:

- `tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/studioServerPortFallback.test.js`
- `_Docs/Studio/README.md`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`

Boundary kept:

- No game source or game data changes.
- No `_Docs/Handoff/*` changes.
- No write/action API implementation.
- No JSON schema, persisted artifact, save/load, migration, build setting, package dependency, commit, push, release, or deployment change.

Validation summary:

- `node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js`
- `node tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `node tools/aiworkflow/studio/studioServerPortFallback.test.js`
- `node --check` for edited Studio JS/test modules and server module.
- `node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json`
- `git diff --check`
- Live browser smoke on `http://127.0.0.1:4317/` verified Director source links include `rel="noopener noreferrer"` and browser console had no messages/errors.
- After live smoke, stale Studio server child processes were terminated and port `4317` was confirmed free.

## Director Action Vocabulary UI Copy

Re-implemented the preview-only Director Action Vocabulary after the prior uncommitted implementation was lost during a separate terminal cleanup.

Implemented the first reduced-scope step from the Director Action Model:

- Added a preview-only `Director Action Vocabulary` panel to the Director Desk.
- Added five vocabulary groups for Conversation, Decision, Execution Request, Result Review, and Record Keeping.
- Added disabled preview buttons marked with `data-director-action-preview`.
- Added Korean copy stating that these actions are not executed yet and do not write records, run workers, or commit before separate approval.

Files added:

- `tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`

Files updated:

- `tools/aiworkflow/studio/directorConsolePage.js`
- `_Docs/Studio/Studio_Director_Action_Model_Plan_2026-06-05.md`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`

TDD evidence:

- RED: `node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js` failed because the action vocabulary constants/panel did not exist.
- GREEN: the same test passed after the preview-only vocabulary panel was implemented.

Boundary kept:

- No action endpoint implementation.
- No write/mutation route.
- No file write from the UI vocabulary panel.
- No worker execution.
- No commit/push/release/deployment automation.
- No game source/data, `_Docs/Handoff/*`, schema, save/load, migration, build setting, or dependency changes.

Validation summary:

- `node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`
- Targeted Studio regression chain including legacy Discord cleanup, Director API alias, view-model, director_views consumption, and port fallback tests.
- `node --check` for the restored test, edited Director console page, and Studio server module.
- `node tools/aiworkflow/studio_director_console_server.js --once > _Temp/studio_summary_check.json`
- `git diff --check`
- Live browser smoke on `http://127.0.0.1:4317/` verified 5 vocabulary cards, 19 disabled preview buttons, safety copy, and no browser console messages/errors.
- After live smoke, stale Studio server child processes were terminated and port `4317` was confirmed free.

## Studio Legacy Discord Reference Cleanup

After Hermes Discord gateway migration and legacy bot removal, the user approved a bounded cleanup goal for remaining current Studio/runtime references to the removed Discord bot.

Scope:

- Retire Studio workflow routes that still attempted to import removed `tools/discord-orchestrator` services.
- Remove legacy Discord bot status/restart toolbox entries from the Studio toolbox catalog.
- Remove the now-unused Studio server dynamic import helper for Discord services.
- Keep git commit/push routes, Director read-only aliases, `director_views`, and Studio UI behavior otherwise unchanged.

Files changed:

- `tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js`
- `tools/aiworkflow/studio/studioWorkflowApiRoutes.js`
- `tools/aiworkflow/studio/studioToolboxService.js`
- `tools/aiworkflow/studio_director_console_server.js`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`

Behavior notes:

- `POST /api/workflow/intake`, `POST /api/workflow/finalize`, and `POST /api/workflow/task/approve-start` now return HTTP `410` with a retired-route envelope instead of parsing a request body or importing removed legacy services.
- Studio toolbox catalog no longer exposes `discord_bot_status` or `discord_bot_restart`.
- Historical DevLog and older AIWorkflow documents may still mention the retired bot as past evidence, but current Studio/runtime code no longer points at the removed bot scripts/services.

Validation summary:

- RED observed: `node tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js` failed because the old workflow route imported the removed legacy service path.
- GREEN: `node tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js` passed.
- Regression tests passed:
  - `node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
  - `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js`
  - `node tools/aiworkflow/studio/studioDirectorViewModels.test.js`
  - `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
  - `node tools/aiworkflow/studio/studioServerPortFallback.test.js`
- Syntax/diff checks passed:
  - `node --check tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js`
  - `node --check tools/aiworkflow/studio/studioWorkflowApiRoutes.js`
  - `node --check tools/aiworkflow/studio/studioToolboxService.js`
  - `node --check tools/aiworkflow/studio_director_console_server.js`
  - `git diff --check`
- Live API smoke passed:
  - Started Studio server and tested `POST /api/workflow/intake`, `POST /api/workflow/finalize`, and `POST /api/workflow/task/approve-start`; all returned HTTP `410` retired-route envelopes.
  - Fetched `/api/toolbox/catalog`; confirmed no `discord_bot_status`, `discord_bot_restart`, or `tools/discord-orchestrator` catalog references.
  - Stopped verified Studio server child processes and confirmed ports `4317` and `4318` were free.

Boundary kept:

- No game source or game data changes.
- No `_Docs/Handoff/*` changes.
- No JSON schema, persisted artifact, save/load, migration, build setting, package dependency, commit, push, release, or deployment change.
- No new write/action Director API implementation.

## B-A-C Studio Planning Pass

After Action Vocabulary restoration and Discord gateway cleanup, the user approved proceeding in this order:

```text
B. Current Review / Risk Sweep
A. Goal E Worker Execution Integration architecture/scope packet
C. Director UX Flow Review
```

Files changed:

- `_Docs/Studio/Studio_B_Current_Review_Risk_Sweep_2026-06-05.md`
- `_Docs/Studio/Studio_Goal_E_Worker_Execution_Integration_Scope_2026-06-05.md`
- `_Docs/Studio/Studio_C_Director_UX_Flow_Review_2026-06-05.md`
- `_Docs/Studio/README.md`
- `tools/aiworkflow/studio/studioWorkflowApiRoutes.js`
- `tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js`

Review notes:

- Found and fixed one remaining Studio workflow route regression: the retained `/api/workflow/git/commit` route still called `readRequestJson(req)` after the legacy Discord cleanup removed `readRequestJson` from dependency destructuring.
- Restored `readRequestJson` dependency injection and added a regression test proving the retained git commit route uses the injected JSON reader.
- Independent reviewer found no blocking issue in that focused fix.

Planning outcome:

- Goal E should not immediately implement worker execution.
- Worker execution requires approved Execution Request storage/schema and an explicit dispatch contract first.
- The recommended next behavior step is Goal C-style Execution Request foundation before actual Goal E worker dispatch wiring.

Validation summary:

- `node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`
- `node tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js`
- `node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
- `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js`
- `node tools/aiworkflow/studio/studioDirectorViewModels.test.js`
- `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
- `node tools/aiworkflow/studio/studioServerPortFallback.test.js`
- `node --check tools/aiworkflow/studio/studioWorkflowApiRoutes.js`
- `node --check tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js`
- `git diff --check`

Boundary kept:

- No worker execution was implemented.
- No Director action POST endpoint was implemented.
- No game source/data, schema, save/load, migration, build setting, dependency, `_Temp`, `_Local`, `.env`, node_modules, commit, push, release, or deployment change.

## Goal C Execution Request Foundation Planning

After the B-A-C pass, the user approved committing the readiness review and moving to Goal C.

Commit recorded:

- `d0857ff docs: review Studio worker execution readiness`

Created the Goal C architecture/scope packet:

- `_Docs/Studio/Studio_Goal_C_Execution_Request_Foundation_Scope_2026-06-05.md`

Planning outcome:

- Goal C is the Execution Request storage/schema/readiness foundation.
- Goal C is not worker dispatch, PC Runner start, Codex CLI start, local shell execution, Backlog task creation, automatic approval, completion, commit, or push.
- Recommended durable store: `_Docs/AIWorkflow/Studio/ExecutionRequests/`.
- Recommended schema: `execution_request.v1`.
- Recommended first implementation slice: planner/status/list/read/validate/store only, with `_Temp/AIWorkflowStudio/execution_requests/` as the validation store override.
- `mark-ready` can be included only if the Human Director approves that first implementation slice; dispatch remains future Goal E.

Boundary kept:

- No Goal C implementation was performed.
- No Execution Request JSON records were stored.
- No runtime, worker, runner, source, game data, schema migration, save/load, build setting, dependency, `_Temp`, `_Local`, `.env`, node_modules, push, release, or deployment change.

## Goal C.1 Execution Request Foundation Implementation

The user approved Goal C.1 with this bounded scope:

```text
Execution Request storage, execution_request.v1 schema validation, planner status/list/read/validate/store, _Temp validation override, tests, README/WorkLog updates.
Excluded: mark-ready, worker dispatch, PC Runner start, Codex/local execution, Backlog task creation, commit/push.
```

Files changed:

- `_Docs/AIWorkflow/Studio/ExecutionRequests/README.md`
- `tools/aiworkflow/studio_execution_request_planner.js`
- `tools/aiworkflow/studio_execution_request_planner.bat`
- `tools/aiworkflow/studio/studioExecutionRequestPlanner.test.js`
- `_Docs/Studio/Studio_Goal_C_Execution_Request_Foundation_Scope_2026-06-05.md`
- `_Docs/Studio/README.md`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`

Implementation notes:

- Added a standalone Node.js planner with `status`, `list`, `read`, `validate`, and `store` commands.
- Added Windows `.bat` wrapper for local use.
- Default durable store is `_Docs/AIWorkflow/Studio/ExecutionRequests/`.
- `--store-path` override is allowed only inside repository `_Temp` for validation smoke tests.
- `store` is dry-run by default and requires `--execute` to write an Execution Request record.
- Duplicate `execution_request_id` writes are rejected.
- Planner safety metadata explicitly reports no runner start, worker dispatch, source change, or git change.
- Schema validation enforces `execution_request.v1`, required field groups, enum values, false-by-default safety flags, and no raw-shell authority in worker intent.

Validation summary:

- RED observed before implementation: `node tools/aiworkflow/studio/studioExecutionRequestPlanner.test.js` failed with missing `../studio_execution_request_planner` module.
- GREEN after implementation:
  - `node tools/aiworkflow/studio/studioExecutionRequestPlanner.test.js`
  - `node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js`
  - `node tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js`
  - `node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js`
  - `node tools/aiworkflow/studio/studioDirectorApiAliases.test.js`
  - `node tools/aiworkflow/studio/studioDirectorViewModels.test.js`
  - `node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js`
  - `node tools/aiworkflow/studio/studioServerPortFallback.test.js`
  - `node --check tools/aiworkflow/studio_execution_request_planner.js`
  - `node --check tools/aiworkflow/studio/studioExecutionRequestPlanner.test.js`
  - `git diff --check`
- Planner smoke under `_Temp` passed for:
  - `validate`
  - `store` dry-run
  - `store --execute`
  - `status`
  - `list`
  - `read`

Boundary kept:

- No `mark-ready` implementation.
- No worker dispatch, PC Runner start, Codex CLI start, local shell execution, build/test command execution, Backlog task creation, automatic approval, automatic completion, commit, or push.
- No game source/data changes.
- No tracked `_Temp`, `_Local`, `.env`, or node_modules files.

## AI Assistance

Hermes updated the documents and applied the bounded Fast UX Containment, Director Surface Refactor UI changes, Action Vocabulary restoration, legacy Discord cleanup, B-A-C Studio planning pass, Goal C Execution Request foundation planning, and Goal C.1 Execution Request planner foundation implementation based on the user's approved goals. Durable direction was recorded in memory where appropriate.

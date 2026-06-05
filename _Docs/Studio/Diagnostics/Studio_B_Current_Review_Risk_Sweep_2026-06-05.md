# Studio B Current Review / Risk Sweep

## Date

2026-06-05

## Status

Review completed with one blocking regression found and fixed.

This document is a review record for the current Studio Director-facing changes before Goal E Worker Execution Integration planning. It does not approve new worker execution behavior.

## Scope Reviewed

Reviewed the current Studio direction and recent implementation state around:

- Director-facing five-function model: Conversation, Decision, Execution Request, Result Review, Record Keeping
- read-only `/api/director/*` aliases and Director views
- preview-only Director Action Vocabulary UI
- legacy Discord workflow route retirement
- remaining workflow API behavior after Discord route cleanup
- Goal E readiness constraints for worker execution integration

## Evidence Checked

Repository evidence reviewed:

- `_Docs/Studio/README.md`
- `_Docs/Studio/Foundation/Studio_Director_Workflow_Principles.md`
- `_Docs/Studio/Contracts/Studio_Director_Action_Model_Plan_2026-06-05.md`
- `_Docs/Studio/Contracts/Studio_Director_Read_Only_API_Contract_2026-06-05.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Unified_PC_Runner_Orchestration_Entrypoint.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Build_Test_Runner.md`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/studioApiHandlers.js`
- `tools/aiworkflow/studio/studioWorkflowApiRoutes.js`
- `tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js`

## Review Findings

### Critical

None remaining.

### Major

None remaining.

### Fixed During Review

#### Major: remaining git commit route referenced `readRequestJson` after dependency cleanup

`tools/aiworkflow/studio/studioWorkflowApiRoutes.js` still used `readRequestJson(req)` in the retained `/api/workflow/git/commit` route after legacy Discord workflow route cleanup. The dependency was no longer destructured from `deps`, which would cause a `ReferenceError` if the commit route were invoked.

Fix applied:

- Restored `readRequestJson` dependency injection in `createWorkflowApiHandler`.
- Added regression coverage in `studioLegacyDiscordCleanup.test.js` proving the retained git commit route uses the injected JSON reader and forwards the parsed body to `commitSelectedFiles`.

This fix does not add worker execution, restore retired Discord routes, change approval policy, or change commit/push authority.

### Minor

- Current Studio still contains legacy/internal pages and route families, but the Director-facing Home surface and `/api/director/*` aliases are aligned with the five-function model.
- The retained git commit/push routes remain operational workflow routes. They should not become part of the default Director UX unless separate commit/push approval is explicit.

### Optional

- Future tests could add direct negative coverage that Director Action Vocabulary preview buttons cannot trigger POST/action endpoints.
- Future docs could split Studio action record storage from DevLog storage once Goal B/C is approved.

## Goal E Readiness Assessment

Goal E should not jump directly to worker execution.

Current readiness:

- Action Vocabulary preview is implemented.
- Read-only Director aliases are stable.
- Legacy Discord route cleanup is mostly stable after the fixed regression.
- Existing AIWorkflow PC Runner and build/test runner documents already define a safe allowlisted execution model.

Missing before implementation:

- first-class Execution Request storage is not approved
- Execution Request schema is not approved
- approval state transition for `mark_ready_for_worker` is not implemented
- Studio-to-worker route contract is not approved
- UI confirmation model for worker-triggering actions is not approved

Therefore Goal E should be treated as architecture/scope planning only at this stage.

## Required Safety Boundaries For Goal E

Goal E must preserve these boundaries:

1. Studio records Director intent; it must not become a raw command dashboard.
2. Worker execution requires a bounded approved Execution Request.
3. Studio must not execute arbitrary user shell strings.
4. Worker execution must use allowlisted execution paths such as PC Runner profiles, `codex_cli`, `local_cli`, and build/test `command_id` entries.
5. Execution adapters collect evidence; they do not decide pass/fail.
6. Result Review decides accept/request changes/reject/defer after evidence is summarized.
7. Commit, push, release, deploy, and task-done decisions remain separate explicit Director decisions.
8. `_Temp`, `_Local`, `node_modules`, `.env`, and local config files must remain untracked.

## Validation Run

Commands run:

```text
node tools/aiworkflow/studio/directorConsoleActionVocabulary.test.js
node tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js
node tools/aiworkflow/studio/studioApiHandlersDirectorAliases.test.js
node tools/aiworkflow/studio/studioDirectorApiAliases.test.js
node tools/aiworkflow/studio/studioDirectorViewModels.test.js
node tools/aiworkflow/studio/directorConsoleDirectorViews.test.js
node tools/aiworkflow/studio/studioServerPortFallback.test.js
node --check tools/aiworkflow/studio/studioWorkflowApiRoutes.js
node --check tools/aiworkflow/studio/studioLegacyDiscordCleanup.test.js
git diff --check
```

Observed result:

```text
director console action vocabulary test passed
studio legacy Discord cleanup tests passed
studioApiHandlers director alias wiring tests passed
studioDirectorApiAliases tests passed
studioDirectorViewModels tests passed
director console director_views consumption test passed
studioServerPortFallback tests passed
```

`git diff --check` exited with code 0. Git reported LF-to-CRLF working-copy warnings for two edited JavaScript files; no whitespace error was reported.

Independent review:

- A reviewer subagent reviewed the `readRequestJson` fix and regression test.
- Finding summary: no Critical/High/Medium/Low issues; no new security concern; the fix is consistent with the intended dependency-injection behavior.

## Recommendation

Proceed to A: Goal E Worker Execution Integration as an architecture/scope packet only.

Do not implement worker-triggering Studio endpoints until the Human Director approves:

- Execution Request storage path
- Execution Request schema
- approval transition rules
- worker adapter surface
- result-review return contract

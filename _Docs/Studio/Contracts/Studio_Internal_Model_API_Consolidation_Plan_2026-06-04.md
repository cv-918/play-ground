# Studio Internal Model/API Consolidation Plan

## Date

2026-06-04

## Status

Planning document for the next Studio goal.

No source code, API route, JSON schema, persisted artifact, runtime behavior, or build setting is changed by this plan.

## Goal

Plan how to consolidate Studio's internal model, artifact taxonomy, and API route surface so the Director-facing five-function product model can remain stable while internal AIWorkflow/runtime concepts move behind clearer boundaries.

The Director-facing functions remain:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

This goal is a planning goal, not an implementation goal.

## Source of Truth

Read these first:

- `_Docs/Studio/Foundation/Personal_AI_Game_Development_Operating_System_North_Star.md`
- `_Docs/Studio/Foundation/Personal_AI_Game_Development_Operating_Rules.md`
- `_Docs/Studio/Foundation/Studio_Director_Workflow_Principles.md`
- `_Docs/Studio/Diagnostics/Studio_Current_System_Diagnostic_2026-06-04.md`
- `_Docs/Studio/DirectorSurface/Studio_Director_Surface_Refactor_Plan_2026-06-04.md`
- `_DevLog/WorkLog/2026-06-04_Studio_North_Star_Scope_Correction.md`
- `AGENTS.md`

## Background

The previous goals addressed the visible product surface:

- Goal 1: Fast UX Containment
  - Fixed page visibility leaks.
  - Demoted obvious internal/operator terminology from the primary UX.
  - Kept backend and persisted artifacts intact.

- Goal 2: Director Surface Refactor
  - Reorganized the primary shell around Director Flow.
  - Rebuilt Home as Director Desk.
  - Made Conversation, Decision, Execution Request, Result Review, and Record Keeping the first-class product functions.
  - Kept backend and internal data models intact.

The remaining problem is that internal code, route modules, payload builders, data loaders, artifact renderers, and persisted folders still reflect the older AIWorkflow/runtime dashboard model.

Internal concepts are still structurally prominent:

- DirectorGoalPlan
- MeetingSession
- WorkOrder
- Handoff
- ContextPacket
- RoleRun / StaffRun
- ToolRunRequest
- Materialization
- Proposal
- Decision
- ActiveTask
- Runner
- Completion / Finalization
- Git / Diff gate
- Department and staff registries
- Tool adapter registry
- Policy evaluation

Some of these concepts are valuable as internal implementation details or evidence artifacts. The problem is not their existence. The problem is that they are not yet clearly classified under the five Director-facing functions and the internal execution/evidence layers.

## Current Inventory Snapshot

Inspection was performed against `tools/aiworkflow/studio/`.

### JavaScript module surface

- Studio JS files under `tools/aiworkflow/studio/`: 38

### API route modules

Route-ish comparisons by module:

```text
studioToolAutomationApiRoutes.js: 22
studioPlanningMeetingApiRoutes.js: 17
studioEvidenceReviewApiRoutes.js: 13
studioKnowledgeDecisionApiRoutes.js: 7
studioWorkOrderApiRoutes.js: 7
studioWorkflowApiRoutes.js: 5
studioApiHandlers.js: 1
```

The route count itself is not automatically wrong, but it shows that the current Studio backend is still organized around implementation domains rather than the Director-facing five-function contract.

### Internal terminology density

Approximate term counts from the Studio JS surface:

```text
meeting / Meeting: 440
proposal / Proposal: 139
decision / Decision: 258
work_order / WorkOrder: 102
handoff / Handoff: 74
runner / Runner: 79
active_task / ActiveTask: 22
tool_run / ToolRun: 22
role_run / RoleRun: 14
context_packet / ContextPacket: 33
materialization / Materialization: 23
```

Top files by internal-term density:

```text
studioActionPayloadBuilders.js
studioWorkflowReviewPlanBuilders.js
studioPlanningMeetingApiRoutes.js
studioOperationalPlanBuilders.js
studioClientGenericResultScript.js
studioDocumentDataLoaders.js
studioKnowledgeDecisionApiRoutes.js
studioWorkOrderApiRoutes.js
studioDataService.js
studioWorkflowApiRoutes.js
```

Interpretation:

- The internal model is not just a UI wording issue.
- The old AIWorkflow artifact graph is embedded in payload builders, data loaders, API route modules, and result formatting.
- Consolidation should be staged and compatibility-preserving.
- Direct deletion or schema rewrite would be too risky without a migration plan.

## Planning Scope

This plan defines how to approach Goal 3.

Allowed in this planning goal:

- Classify current internal models and APIs.
- Define a target taxonomy that maps internal concepts to the five Director-facing functions.
- Identify which artifacts should be preserved, renamed in UI only, wrapped, consolidated, demoted, or archived.
- Identify implementation phases for a future approved consolidation task.
- Define compatibility and migration constraints.
- Define validation and review requirements.
- Update documentation and WorkLog references.

Not allowed in this planning goal:

- Do not modify API behavior.
- Do not rename or delete persisted JSON artifact types.
- Do not move persisted folders.
- Do not change JSON schemas.
- Do not change save/load behavior.
- Do not change execution runtime policy.
- Do not remove route modules.
- Do not commit, push, release, or deploy.
- Do not modify the game project source under `PlayGround/`.

## Target Taxonomy

The future internal model should separate:

```text
Director Concept
  What the Human Director sees and decides.

Operational Contract
  A bounded internal artifact used to execute or record the Director decision.

Evidence Artifact
  Raw or semi-raw proof used for review, audit, or debugging.

Runtime Mechanism
  Execution machinery that should not define the product UX.

Legacy / Historical Artifact
  Existing structure kept for compatibility, migration, or audit only.
```

## Proposed Mapping

### 1. Conversation

Director-facing concept:

```text
Conversation
```

Current internal artifacts:

```text
MeetingSession
MeetingRunbook
MeetingBoard
AgentTurnWorkOrder
```

Recommended classification:

```text
MeetingSession -> preserve as ConversationRecord or wrap as conversation record.
MeetingRunbook -> evidence/support artifact, not primary UX.
MeetingBoard -> derived summary/evidence artifact.
AgentTurnWorkOrder -> internal execution request for one AI staff response; do not expose as WorkOrder to Director.
```

Future consolidation direction:

- Introduce a Director-facing `ConversationRecord` adapter/view model.
- Keep existing MeetingSession JSON during compatibility phase.
- Route all UI rendering through `ConversationRecord` view mapping rather than raw meeting fields.
- Rename only at the adapter/UI level first; do not migrate persisted JSON until approved.

### 2. Decision

Director-facing concept:

```text
Decision
```

Current internal artifacts:

```text
Decision
Proposal
Materialization
DirectorGoalPlan approval items
Completion finalization decisions
```

Recommended classification:

```text
Decision -> preserve as durable director decision.
Proposal -> preserve as decision candidate.
Materialization -> internal bridge from AI output to records; demote from primary UX.
DirectorGoalPlan approval items -> decision candidates.
Completion finalization decisions -> result-review decisions, not generic proposal decisions.
```

Future consolidation direction:

- Define a `DecisionItem` view model.
- Sources may include proposals, completion cards, DirectorGoalPlan approvals, and unresolved conversation items.
- Keep source-specific persistence, but expose one decision queue to the Director.
- Do not merge proposal and decision schemas until a migration plan is approved.

### 3. Execution Request

Director-facing concept:

```text
Execution Request
```

Current internal artifacts:

```text
WorkOrder
HandoffPlan
ContextPacket
ActiveTask
Backlog task
ToolRunRequest
```

Recommended classification:

```text
WorkOrder -> internal representation of an Execution Request contract.
HandoffPlan -> internal assignment/worker-prep detail.
ContextPacket -> internal worker context bundle.
ActiveTask / Backlog task -> execution runtime state, not Director-facing request model.
ToolRunRequest -> admin/internal tool automation request.
```

Future consolidation direction:

- Introduce an `ExecutionRequest` adapter around WorkOrder.
- Preserve `work_order_id` and file paths during compatibility phase.
- Move handoff/context-packet generation behind explicit execution-prep actions.
- Keep ActiveTask/Backlog separate as runtime state; do not let it define the request UX.
- ToolRunRequest remains admin/internal unless surfaced as evidence.

### 4. Result Review

Director-facing concept:

```text
Result Review
```

Current internal artifacts:

```text
ReviewPacket
CompletionReport
CompletionCard
RunnerRun
StaffRun / RoleRun
DiffSummary
Finalization
```

Recommended classification:

```text
CompletionReport / CompletionCard -> primary ResultReview source.
ReviewPacket -> evidence/source detail.
RunnerRun -> runtime mechanism/evidence, not primary UX.
StaffRun / RoleRun -> internal/evidence artifact.
DiffSummary -> evidence artifact.
Finalization -> Director result decision record.
```

Future consolidation direction:

- Define a `ResultReviewItem` view model.
- It should show: summary, changed files, validation, risks, recommended judgment, allowed decisions.
- Raw runner/staff/session IDs should be available only in details/debug.
- Finalization should be recorded as a Director decision type or linked ResultReview outcome.

### 5. Record Keeping

Director-facing concept:

```text
Record Keeping
```

Current internal artifacts:

```text
DevLog
WorkLog
Decision JSON
Memory records
Canon candidates
Proposal records
Materialization records
```

Recommended classification:

```text
DevLog / WorkLog -> durable development record.
Decision JSON -> durable Director decision record.
Memory records -> durable reference memory.
Canon candidates -> formal setting candidates; require explicit approval.
Proposal records -> candidates, not final record unless accepted.
Materialization records -> internal bridge/audit artifact.
```

Future consolidation direction:

- Define a `RecordItem` view model.
- Separate accepted decisions, rejected proposals, reference notes, canon candidates, and WorkLog/DevLog links.
- Hide materialization mechanics behind record creation details.

## Proposed Internal Layering

Future Studio internals should use this responsibility boundary:

```text
Studio Director Surface
  - Pages, labels, flow, cards, Director decisions.
  - Does not know raw artifact taxonomy deeply.

Director View Models
  - ConversationRecord
  - DecisionItem
  - ExecutionRequest
  - ResultReviewItem
  - RecordItem
  - Normalized shape for UI.

Compatibility Adapters
  - MeetingSession -> ConversationRecord
  - WorkOrder -> ExecutionRequest
  - CompletionReport/Card -> ResultReviewItem
  - Proposal/Decision/Materialization -> DecisionItem/RecordItem
  - Runner/StaffRun/ReviewPacket -> Evidence detail.

Internal Artifact Loaders
  - Existing read/write functions for current JSON/folders.
  - No schema change during initial consolidation.

Runtime / Evidence / Admin
  - ActiveTask, Runner, ToolRun, RoleRun, ContextPacket, raw routes.
  - Available for debug/evidence, not normal Director UX.
```

## Proposed API Consolidation Direction

Current route modules are implementation-domain oriented:

```text
studioPlanningMeetingApiRoutes.js
studioWorkOrderApiRoutes.js
studioWorkflowApiRoutes.js
studioKnowledgeDecisionApiRoutes.js
studioEvidenceReviewApiRoutes.js
studioToolAutomationApiRoutes.js
```

Target route grouping should be Director-function oriented at the public Studio API boundary:

```text
/api/summary
/api/conversation/*
/api/decision/*
/api/execution-request/*
/api/result-review/*
/api/record/*
/api/admin/*
```

Compatibility rule:

- Do not delete old route handlers immediately.
- Add new route aliases/adapters first.
- Mark old route names as internal/legacy in code comments and documentation.
- Keep old routes working until all UI calls have moved and validation confirms compatibility.

Proposed mapping:

```text
/api/studio/meeting*                -> /api/conversation/*
/api/studio/decision*               -> /api/decision/*
/api/studio/work-order*             -> /api/execution-request/*
/api/studio/workflow* completion    -> /api/result-review/*
/api/studio/knowledge*              -> /api/record/*
/api/studio/tool*                   -> /api/admin/*
```

The exact old paths should be inventoried before implementation because the route modules currently use multiple route comparisons rather than a single route manifest.

## Proposed Implementation Phases

### Phase 0: Route and artifact manifest only

Objective:
Create a generated or manually maintained manifest of existing Studio routes and artifact types.

Allowed changes:

- Add documentation or a read-only manifest file.
- No behavior change.

Deliverables:

```text
_Docs/Studio/Studio_Internal_Model_API_Inventory_YYYY-MM-DD.md
```

Validation:

```text
node --check existing route modules
git diff --check
```

### Phase 1: Director view-model adapters

Objective:
Introduce read-only adapter functions that normalize existing artifacts into Director-facing view models.

Candidate file:

```text
tools/aiworkflow/studio/studioDirectorViewModels.js
```

Candidate exports:

```js
function toConversationRecord(meeting) {}
function toDecisionItem(source) {}
function toExecutionRequest(workOrder) {}
function toResultReviewItem(source) {}
function toRecordItem(source) {}
```

Rules:

- Read-only adapters first.
- No persisted JSON change.
- No API route behavior change.
- Existing data loaders remain the source.

Validation:

```text
node --check tools/aiworkflow/studio/studioDirectorViewModels.js
node --check tools/aiworkflow/studio/studioDataService.js
```

### Phase 2: UI consumes Director view models

Objective:
Move Director-facing pages away from raw WorkOrder/Meeting/Runner shapes.

Candidate files:

```text
tools/aiworkflow/studio/directorConsolePage.js
tools/aiworkflow/studio/studioSessionsPageRenderer.js
tools/aiworkflow/studio/studioInboxPageRenderer.js
tools/aiworkflow/studio/studioWorkPageRenderer.js
tools/aiworkflow/studio/studioEvidencePageRenderer.js
tools/aiworkflow/studio/studioKnowledgePageRenderer.js
```

Rules:

- UI should use `ConversationRecord`, `DecisionItem`, `ExecutionRequest`, `ResultReviewItem`, and `RecordItem` names in Director-facing code.
- Raw IDs remain available in details/debug, not first-view labels.
- Do not change write behavior yet.

Validation:

- JS syntax checks.
- Served inline script syntax check.
- Browser smoke check for the five primary pages.
- DOM inspection for visible labels.

### Phase 3: API aliases by Director function

Objective:
Add new API route aliases that match the five-function model while keeping old routes alive.

Candidate files:

```text
tools/aiworkflow/studio/studioApiHandlers.js
tools/aiworkflow/studio/studioConversationApiRoutes.js
tools/aiworkflow/studio/studioDecisionApiRoutes.js
tools/aiworkflow/studio/studioExecutionRequestApiRoutes.js
tools/aiworkflow/studio/studioResultReviewApiRoutes.js
tools/aiworkflow/studio/studioRecordApiRoutes.js
tools/aiworkflow/studio/studioAdminApiRoutes.js
```

Rules:

- New route modules may delegate to old route handlers.
- Old route handlers are kept for compatibility.
- No schema change.
- No persisted artifact migration.

Validation:

- Static route manifest before/after.
- API smoke for old and new route aliases where safe.
- Browser smoke to ensure UI still works.

### Phase 4: Write-path consolidation plan

Objective:
Only after read/adapters/aliases are stable, decide whether any persisted schemas or folders should change.

This phase should be its own approved goal because it may involve schema, migration, save/load, and compatibility risk.

Possible future actions:

- Rename persisted folder concepts.
- Migrate WorkOrder JSON to ExecutionRequest JSON.
- Merge proposal/decision/materialization record flow.
- Archive legacy route names.

Do not perform Phase 4 without explicit renewed approval.

## Risk Classification

### Low risk

- Documentation inventory.
- Read-only taxonomy mapping.
- Read-only Director view-model adapters.
- UI using adapter names while underlying data remains unchanged.

### Medium risk

- Adding new API route aliases.
- Moving UI calls from old paths to new paths.
- Consolidating result formatting across old artifact types.

### High risk

- Renaming persisted JSON fields.
- Moving folders under `_Docs/AIWorkflow/Studio/`.
- Deleting route modules.
- Removing old API paths.
- Changing ActiveTask/Backlog/Runner behavior.
- Changing completion/finalization semantics.

## Renewed Approval Triggers

Ask the Human Director before:

- Any JSON schema change.
- Any migration script.
- Any folder move or persisted artifact rename.
- Any route removal.
- Any runtime execution behavior change.
- Any commit/push/release/deploy action.
- Any build setting or dependency change.
- Any broad refactor outside `tools/aiworkflow/studio/` and `_Docs/Studio/`.
- Any change to game project source under `PlayGround/`.

## Validation Plan for Future Implementation

For any implementation based on this plan:

1. Run `git status --short` before starting.
2. Run route/artifact inventory before changes.
3. Run `node --check` on every edited JS file.
4. If served HTML embeds generated script, extract it and run `node --check` on the extracted script.
5. Run `git diff --check`.
6. Start Studio server locally.
7. Browser smoke check:
   - Director Desk
   - Conversation
   - Decision
   - Execution Request
   - Result Review
   - Record Keeping
8. Check browser console for JS errors.
9. If API aliases are added, smoke check safe GET endpoints and safe no-write operations.
10. Stop the server.
11. Record validation results in WorkLog or DevLog.
12. Clearly state anything not validated.

## Recommended Next Goal

After this plan is reviewed, the safest next implementation goal is:

```text
/goal Studio Internal Model/API Inventory and Read-Only View Models
```

Purpose:

```text
Create a route/artifact inventory and add read-only Director view-model adapters without changing persisted JSON, route behavior, or runtime execution policy.
```

Why this is the right next step:

- It reduces conceptual drift without risky migration.
- It gives the UI and future APIs a clean Director-facing contract.
- It preserves old artifacts while establishing a path away from raw WorkOrder/Runner/Materialization terminology.
- It creates objective evidence for deciding which old concepts to keep, alias, or eventually migrate.

## Commit Recommendation

Do not commit this plan automatically.

If committed together with the Studio direction work, keep `_Docs/Handoff/*` pre-existing changes out of the commit.

Recommended commit message for the Studio direction + planning set:

```text
Refactor Studio around Director-facing workflow
```

If committing this plan separately:

```text
docs: plan Studio internal model and API consolidation
```

# 2026-05-28 Studio API Feature Route Split

## Summary

Continued the Studio Director Console API refactor by moving the remaining large API feature groups out of `studioApiHandlers.js`.

This keeps the Studio server behavior the same while making the API layer easier to inspect and maintain.

## Scope

- Moved remaining meeting runtime routes into `studioPlanningMeetingApiRoutes.js`.
- Added `studioWorkOrderApiRoutes.js` for WorkOrder, completion-fix WorkOrder, context, handoff, and staff execution planning routes.
- Added `studioKnowledgeDecisionApiRoutes.js` for proposal, decision, memory, and knowledge transition routes.
- Added `studioEvidenceReviewApiRoutes.js` for completion/evidence, approval/readiness, smoke, recovery, traceability, project, model, company runtime, and staff operating-plan routes.
- Reduced `studioApiHandlers.js` to the summary endpoint plus feature-route delegation.

## Files Changed

- `tools/aiworkflow/studio/studioApiHandlers.js`
- `tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js`
- `tools/aiworkflow/studio/studioWorkOrderApiRoutes.js`
- `tools/aiworkflow/studio/studioKnowledgeDecisionApiRoutes.js`
- `tools/aiworkflow/studio/studioEvidenceReviewApiRoutes.js`

## Architecture Notes

The main API handler now acts as a thin route coordinator. Feature groups own their own route matching and return `false` when they do not handle the request.

This keeps the current service dependency injection model intact while reducing the chance that unrelated Studio screens collide inside one large handler.

## Validation

Commands run:

```bat
node --check tools\aiworkflow\studio\studioApiHandlers.js
node --check tools\aiworkflow\studio\studioPlanningMeetingApiRoutes.js
node --check tools\aiworkflow\studio\studioWorkOrderApiRoutes.js
node --check tools\aiworkflow\studio\studioKnowledgeDecisionApiRoutes.js
node --check tools\aiworkflow\studio\studioEvidenceReviewApiRoutes.js
node --check tools\aiworkflow\studio\studioToolAutomationApiRoutes.js
node --check tools\aiworkflow\studio\studioWorkflowApiRoutes.js
git diff --check -- tools/aiworkflow/studio/studioApiHandlers.js tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js tools/aiworkflow/studio/studioWorkOrderApiRoutes.js tools/aiworkflow/studio/studioKnowledgeDecisionApiRoutes.js tools/aiworkflow/studio/studioEvidenceReviewApiRoutes.js
tools\aiworkflow\studio_smoke_check.bat
```

Additional route checks:

- `POST /api/studio/workorder/handoff-plan`
- `POST /api/studio/knowledge/transition-plan`
- `POST /api/studio/completion/evidence-checklist`

Results:

- Node syntax checks passed.
- `git diff --check` passed.
- Studio server restarted on `127.0.0.1:47831`.
- Studio smoke passed with no failures.
- Smoke used port fallback to `47832` because the restarted Studio server already occupied `47831`.
- Additional WorkOrder, knowledge, and evidence route checks returned `ok: true`.

## Remaining Risks

- This does not change Studio UX, policy, or user workflow.
- Route-level behavior is preserved; deeper screen-level UX validation remains a separate Human Director review task.

## Guide Update Decision

No Human Director guide update is needed. This is an internal API organization refactor and does not change user-facing workflow steps, labels, or approval gates.

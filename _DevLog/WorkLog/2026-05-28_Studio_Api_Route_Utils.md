# 2026-05-28 Studio API Route Utils

## Summary

Refactored repeated Studio API route response patterns into a shared route utility module.

## Background

The Studio Director Console server had already been split into route modules, but each module still repeated the same local tool response handling, Studio record lookup, and payload tool invocation patterns. This made route edits slower and easier to drift.

## Scope

- Added `studioApiRouteUtils.js`.
- Applied the shared helpers to Studio route modules for:
  - local tool JSON response handling
  - payload-to-temp-file tool execution
  - Studio record request loading
  - read-only Studio payload responses
- Did not change Studio UX, workflow policy, game source, game data, Discord command schema, or commit/push behavior.

## Files Changed

- `tools/aiworkflow/studio/studioApiRouteUtils.js`
- `tools/aiworkflow/studio/studioWorkflowApiRoutes.js`
- `tools/aiworkflow/studio/studioWorkOrderApiRoutes.js`
- `tools/aiworkflow/studio/studioKnowledgeDecisionApiRoutes.js`
- `tools/aiworkflow/studio/studioEvidenceReviewApiRoutes.js`
- `tools/aiworkflow/studio/studioToolAutomationApiRoutes.js`
- `tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js`

## Review Summary

The refactor keeps existing response shapes: tool routes still return `result.json || result`, read-only planning routes still return `{ ok: true, <payload_key>, safety }`, and task-changing routes keep their existing execution boundaries.

## Validation Summary

- `node --check` passed for the shared utility and all Studio API route modules.
- `git diff --check` passed for the touched route files.
- Studio server restarted on `127.0.0.1:47831`.
- `tools\aiworkflow\studio_smoke_check.bat` passed.
- Additional API smoke checks passed for:
  - `/api/studio/completion/evidence-checklist`
  - `/api/studio/smoke/status`
  - `/api/studio/workorder/handoff-plan`
  - `/api/studio/knowledge/transition-plan`
  - `/api/studio/meeting/board`

## Guide Update Decision

No user guide update is needed. This change is internal route refactoring and does not alter user-facing workflow steps, labels, commands, or intervention points.

## Remaining Risks

Some older route branches still contain legacy fallback text and specialized response objects. They were left in place to avoid mixing cleanup with this utility extraction.

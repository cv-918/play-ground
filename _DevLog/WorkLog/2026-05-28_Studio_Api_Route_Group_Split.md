# 2026-05-28 Studio API Route Group Split

## Summary

Split several Studio Director Console API route groups out of the large `studioApiHandlers.js` module.

This is a behavior-preserving refactor intended to reduce the size and coupling of the Studio server API layer.

## Scope

- Tool and automation API routes moved into `studioToolAutomationApiRoutes.js`.
- Director goal and meeting creation API routes moved into `studioPlanningMeetingApiRoutes.js`.
- Workflow and git-facing API routes moved into `studioWorkflowApiRoutes.js`.
- `studioApiHandlers.js` now delegates to those route modules before handling the remaining API routes.

## Files Changed

- `tools/aiworkflow/studio/studioApiHandlers.js`
- `tools/aiworkflow/studio/studioToolAutomationApiRoutes.js`
- `tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js`
- `tools/aiworkflow/studio/studioWorkflowApiRoutes.js`

## Architecture Notes

The split keeps the existing dependency injection shape. Each route module receives the same service dependency object and returns `false` when it does not handle the current route.

This allows the main API handler to remain the routing entry point while feature-specific route code can continue shrinking into smaller files.

## Validation

Commands run:

```bat
node --check tools\aiworkflow\studio\studioApiHandlers.js
node --check tools\aiworkflow\studio\studioToolAutomationApiRoutes.js
node --check tools\aiworkflow\studio\studioPlanningMeetingApiRoutes.js
node --check tools\aiworkflow\studio\studioWorkflowApiRoutes.js
git diff --check -- tools/aiworkflow/studio/studioApiHandlers.js tools/aiworkflow/studio/studioToolAutomationApiRoutes.js tools/aiworkflow/studio/studioPlanningMeetingApiRoutes.js tools/aiworkflow/studio/studioWorkflowApiRoutes.js
tools\aiworkflow\studio_smoke_check.bat
```

Results:

- Node syntax checks passed.
- `git diff --check` passed.
- Studio smoke passed with no failures.
- Smoke used port fallback from 47831 to 47832 because a Studio server was already running on 47831.

## Remaining Risks

- `studioApiHandlers.js` still contains several feature groups. Additional route-group splits may still be useful.
- This change does not alter Studio UX or workflow policy.

## Guide Update Decision

No Human Director guide update is needed. This refactor does not change user-facing workflow behavior, Studio labels, commands, or approval gates.

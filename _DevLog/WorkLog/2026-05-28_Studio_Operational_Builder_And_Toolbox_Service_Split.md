# Studio Operational Builder And Toolbox Service Split

## Summary

Split the remaining Studio operational report builders and toolbox execution code out of `studio_director_console_server.js`.

This completes the Part 5 refactor pass that moves API/action support code away from the server entrypoint while preserving the existing Studio behavior.

## Background

The Studio server had already been reduced through page renderer, common UI, data loader, and action payload builder splits.

The remaining server responsibilities still included:

- operational readiness and recovery report builders
- toolbox catalog and allowlisted local tool execution
- company runtime readiness report construction

These made the entrypoint harder to inspect and slowed future UX work.

## Scope

Changed:

- `tools/aiworkflow/studio_director_console_server.js`
- `tools/aiworkflow/studio/studioOperationalPlanBuilders.js`
- `tools/aiworkflow/studio/studioToolboxService.js`

Not changed:

- Studio UI behavior
- workflow policy
- game source or data
- Discord command behavior
- commit or push policy
- `_Local`, `_Temp`, `.env`, `node_modules`, or local config

## Implementation Notes

- Added an operational builder factory for Studio operational/readiness plans.
- Moved company runtime readiness generation into the operational builder module.
- Added a toolbox service for the toolbox catalog, allowlisted local tool execution, Studio restart scheduling, and Google Drive publish summary parsing.
- Kept `studio_director_console_server.js` focused on server startup, shared helpers, summary assembly, and API route wiring.
- Fixed the API dependency wiring so existing route handlers still receive `runTool` and `runToolboxTool`.

## Validation

Ran:

```text
node --check tools/aiworkflow/studio_director_console_server.js
node --check tools/aiworkflow/studio/studioOperationalPlanBuilders.js
node --check tools/aiworkflow/studio/studioToolboxService.js
node --check tools/aiworkflow/studio/studioApiHandlers.js
node --check tools/aiworkflow/studio/studioToolAutomationApiRoutes.js
node --check tools/aiworkflow/studio/studioWorkflowApiRoutes.js
node --check tools/aiworkflow/studio/studioEvidenceReviewApiRoutes.js
git diff --check -- tools/aiworkflow/studio_director_console_server.js tools/aiworkflow/studio/studioOperationalPlanBuilders.js tools/aiworkflow/studio/studioToolboxService.js
tools\aiworkflow\studio_smoke_check.bat
Invoke-RestMethod http://127.0.0.1:47831/api/summary
```

Results:

- Node syntax checks passed.
- `git diff --check` passed.
- Studio smoke passed with no failures.
- Studio server was restarted on `127.0.0.1:47831`.
- `/api/summary` returned `ok: true`.

## Remaining Risks

- This was a structural refactor of a large existing server file, so future route work should keep using the split modules instead of adding new builder logic back into the entrypoint.
- Existing Korean text in some moved builder outputs was preserved as-is; this change did not attempt copy cleanup.

## Next Tasks

- Treat the Part 1-5 Studio server refactor as complete.
- Use follow-up work for actual Studio UX/product direction changes, not for more entrypoint growth.

# Studio Data Service Split

## Summary

Split the Studio Director Console read-model/data-loader functions out of
`tools/aiworkflow/studio_director_console_server.js` into
`tools/aiworkflow/studio/studioDataService.js`.

## Background

The Studio server had grown into a large mixed file containing HTTP routing,
tool execution, UI endpoint handlers, data loading, workflow summary building,
and operational helper logic. Earlier refactors separated CLI parsing, Git
helpers, page rendering, and artifact rendering. This change continues that
direction by moving read-only Studio data collection into its own module.

## Scope

- Move read-only loader functions for Studio artifacts and registries:
  - review packets
  - director goal plans
  - DevLogs
  - staff runs
  - context packets
  - materializations
  - work orders
  - proposals
  - decisions
  - memories
  - meetings
  - project profiles
  - tool adapters
  - tool run requests
  - conditional automation evaluations
  - staff directory
  - handoff candidates
- Keep runtime behavior and public Studio UI unchanged.
- Avoid game source, game data, Discord workflow state, and local config changes.

## Files Changed

- `tools/aiworkflow/studio_director_console_server.js`
- `tools/aiworkflow/studio/studioDataService.js`

## Implementation Notes

The server now imports the read-model functions from `studioDataService`.
The new module keeps local read-only helper functions so the extraction does
not force a broader shared-utils migration in the same change.

This is an incremental refactor, not a product behavior change.

## Validation

Commands run:

```powershell
node --check tools\aiworkflow\studio_director_console_server.js
node --check tools\aiworkflow\studio\studioDataService.js
git diff --check -- tools/aiworkflow/studio_director_console_server.js tools/aiworkflow/studio/studioDataService.js
tools\aiworkflow\studio_smoke_check.bat
```

Additional runtime check:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:47831/api/summary
```

Results:

- Syntax checks passed.
- Diff whitespace check passed.
- Studio summary endpoint returned HTTP 200.
- Studio smoke passed. The smoke runner used a fallback port because the main
  Studio server was already running on `127.0.0.1:47831`.

## Remaining Risks

- Some common helpers are still duplicated between the server and the new data
  service. A later refactor can extract shared utility helpers after the data
  service boundary proves stable.
- This change intentionally does not alter Studio UX, workflow policy, or
  product behavior.

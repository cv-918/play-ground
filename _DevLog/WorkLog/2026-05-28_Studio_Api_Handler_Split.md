# Studio API Handler Split

## Summary

Split the Studio Director Console API entrypoint out of
`tools/aiworkflow/studio_director_console_server.js` into
`tools/aiworkflow/studio/studioApiHandlers.js`.

## Background

The Studio server still contained a large `handleApi` function with most
`/api/*` route handling mixed into the HTTP server file. This made ordinary
Studio page and button work slower because endpoint routing, tool execution,
workflow helper calls, and server lifecycle code all lived in the same file.

## Scope

- Move the API entrypoint into `createStudioApiHandler(deps)`.
- Keep public endpoint paths and behavior unchanged.
- Keep the existing server lifecycle, file serving, and port fallback logic in
  the main server file.
- Avoid game source, game data, workflow state, Discord state, and local config
  changes.

## Files Changed

- `tools/aiworkflow/studio_director_console_server.js`
- `tools/aiworkflow/studio/studioApiHandlers.js`

## Implementation Notes

The new module receives dependencies explicitly from the server. This keeps the
first split low-risk while making the next refactor easier: API routes can now
be grouped by area inside the API layer without touching server startup logic.

This is an incremental refactor, not a product behavior change.

## Validation

Commands run:

```powershell
node --check tools\aiworkflow\studio_director_console_server.js
node --check tools\aiworkflow\studio\studioApiHandlers.js
git diff --check -- tools/aiworkflow/studio_director_console_server.js tools/aiworkflow/studio/studioApiHandlers.js
tools\aiworkflow\studio_smoke_check.bat
```

Runtime checks:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:47831/api/summary
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:47831/api/toolbox/catalog
```

Results:

- Syntax checks passed.
- Diff whitespace check passed.
- Studio summary endpoint returned HTTP 200.
- Studio toolbox catalog endpoint returned HTTP 200.
- Studio smoke passed. The smoke runner used a fallback port because the main
  Studio server was already running on `127.0.0.1:47831`.

## Remaining Risks

- `studioApiHandlers.js` is still large. The next useful refactor is to split
  the API layer by feature area, such as toolbox, meeting, work order,
  knowledge/decision, and workflow completion endpoints.
- This change intentionally does not alter user-facing Studio UX or workflow
  policy.

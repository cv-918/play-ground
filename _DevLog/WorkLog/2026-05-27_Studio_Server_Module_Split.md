# Studio Server Module Split

## Summary

Split the largest Studio Director Console server responsibilities into focused modules without changing public Studio behavior.

## Background

The Studio server had grown into a single large file that mixed HTTP routing, workflow data loading, artifact rendering, and the full HTML/CSS/client JavaScript page. This made Studio changes slow to inspect and risky to edit.

## Scope

- Extracted the Director Console HTML page into `tools/aiworkflow/studio/directorConsolePage.js`.
- Extracted Markdown/JSON artifact rendering into `tools/aiworkflow/studio/artifactRenderer.js`.
- Kept server routes, APIs, workflow policy, game data, game source, git behavior, and user-facing workflow behavior unchanged.

## Files Changed

- `tools/aiworkflow/studio_director_console_server.js`
- `tools/aiworkflow/studio/directorConsolePage.js`
- `tools/aiworkflow/studio/artifactRenderer.js`

## Validation

- `node --check tools\aiworkflow\studio_director_console_server.js`
- `node --check tools\aiworkflow\studio\directorConsolePage.js`
- `node --check tools\aiworkflow\studio\artifactRenderer.js`
- `git diff --check -- tools/aiworkflow/studio_director_console_server.js tools/aiworkflow/studio/directorConsolePage.js tools/aiworkflow/studio/artifactRenderer.js`
- Restarted Studio on `127.0.0.1:47831`.
- Verified Studio HTML, Markdown preview, JSON artifact preview, and `tools\aiworkflow\studio_smoke_check.bat`.

## Remaining Notes

This was a low-risk structural split. The next useful refactor is to split Studio data loading and Studio API action handlers into separate modules.

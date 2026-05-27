# Studio Server CLI and Git Service Split

## Summary

Split Studio server startup argument parsing and Git helper behavior into focused modules.

## Background

After extracting the Studio HTML page and artifact renderer, the server still mixed startup parsing, Git status/commit/push helpers, HTTP routing, and Studio domain logic. This change continues reducing the single-file bottleneck without changing Studio behavior.

## Scope

- Added `tools/aiworkflow/studio/cliArgs.js` for Studio CLI argument parsing and default host/port constants.
- Added `tools/aiworkflow/studio/gitService.js` for Git status parsing, selected-file commit handling, and push handling.
- Updated `tools/aiworkflow/studio_director_console_server.js` to import these modules.

## Validation

- `node --check tools\aiworkflow\studio_director_console_server.js`
- `node --check tools\aiworkflow\studio\cliArgs.js`
- `node --check tools\aiworkflow\studio\gitService.js`
- `git diff --check -- tools/aiworkflow/studio_director_console_server.js tools/aiworkflow/studio/cliArgs.js tools/aiworkflow/studio/gitService.js`
- Restarted Studio on `127.0.0.1:47831`.
- Confirmed `/api/summary` returns HTTP 200.
- Ran `tools\aiworkflow\studio_smoke_check.bat` successfully.

## Remaining Notes

The next useful split is to move Studio data loading/read models into a `studioDataService` module. Avoid one-shot extraction of many unrelated helper functions because template strings and legacy text make broad mechanical moves riskier than contiguous service splits.

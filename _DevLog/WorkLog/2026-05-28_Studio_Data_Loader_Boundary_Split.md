# Studio Data Loader Boundary Split

## Summary

Split the Studio data service so common file/JSON helpers and document-backed data loaders are no longer embedded in `studioDataService.js`.

## Scope

- Added `studioDataUtils.js` for repository path helpers, JSON/text reads, recursive file listing, and common list normalization helpers.
- Added `studioDocumentDataLoaders.js` for document/runtime-backed Studio collections such as goal plans, meetings, work orders, proposals, decisions, memories, review packets, project profiles, tool adapters, tool run requests, and handoff candidates.
- Kept `studioDataService.js` focused on composing those loaders with the staff directory registry view.

## Files Changed

- `tools/aiworkflow/studio/studioDataService.js`
- `tools/aiworkflow/studio/studioDataUtils.js`
- `tools/aiworkflow/studio/studioDocumentDataLoaders.js`
- `_DevLog/WorkLog/2026-05-28_Studio_Data_Loader_Boundary_Split.md`

## Validation

- `node --check tools/aiworkflow/studio/studioDataService.js`
- `node --check tools/aiworkflow/studio/studioDocumentDataLoaders.js`
- `node --check tools/aiworkflow/studio/studioDataUtils.js`
- `node --check tools/aiworkflow/studio_director_console_server.js`
- Studio server restart on `127.0.0.1:47831`
- `/api/summary` request returned `ok: true`
- `tools\aiworkflow\studio_smoke_check.bat`

## Guide Update Decision

No user-guide update is required. This is an internal data-loading boundary refactor and does not change the Human Director workflow.

## Progress

- Completed: Part 4, data utility and document data loader extraction
- Overall refactor progress estimate: 85%
- Next: Part 5, API action handler boundary review and extraction

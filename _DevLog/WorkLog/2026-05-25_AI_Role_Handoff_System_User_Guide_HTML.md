# AI Role Handoff System User Guide HTML

## Summary

Added a user-facing HTML guide for the AI Role Handoff System.

## Background

After completing Phase 1 through Phase 6 of the document-based Handoff System setup, the user requested a durable HTML guide and asked where it should be stored.

The selected location is `_Docs/Handoff/Guide/Handoff_System_User_Guide_KR.html`, matching the existing AIWorkflow guide pattern while keeping Handoff documentation under the Handoff folder.

## Scope

- Added `_Docs/Handoff/Guide/`.
- Added English and Korean folder purpose documents.
- Added `Handoff_System_User_Guide_KR.html`.
- Linked the HTML guide from `_Docs/Handoff/00_Index.md`.
- Mentioned the guide location in `_Docs/Handoff/Handoff_Guide_KR.md`.

## Files Changed

- `_Docs/Handoff/Guide/_FolderPurpose.md`
- `_Docs/Handoff/Guide/_FolderPurpose_KR.md`
- `_Docs/Handoff/Guide/Handoff_System_User_Guide_KR.html`
- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Handoff_Guide_KR.md`
- `_DevLog/WorkLog/2026-05-25_AI_Role_Handoff_System_User_Guide_HTML.md`

## User Guide Update Decision

The new Handoff-specific guide was created under `_Docs/Handoff/Guide/`. The canonical AIWorkflow user guide was not updated because no AIWorkflow command, runner, executor, approval gate, or finalization behavior changed.

## Validation Summary

Ran HTML existence and `git diff --check` validation before commit. No build or runtime validation is required for this documentation-only work.

## Remaining Risks

- The guide is static HTML and should be updated when later Handoff phases materially change user behavior.

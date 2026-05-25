# Studio Data Publish And Decision UX Cleanup

## Summary

Recorded the AIWorkflow Studio and Google Drive team Data publishing changes found in the working tree as a dedicated commit boundary.

## Background

The working tree contained Studio console UX updates, Google Drive publish/rollback/archive management tool updates, versioned Data publish configuration, and generated Studio planning records.

## Scope

- `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html`
- `_Docs/AIWorkflow/Studio/`
- `PlayGround/DataUpdateConfig.json`
- `tools/aiworkflow/studio_director_console_server.js`
- `tools/google-drive-data-upload/`

## Implementation Notes

- Updated the Studio console terminology from resource upload toward team Data publishing.
- Added publish summary parsing and user-facing data version reporting.
- Added Google Drive manifest backup, rollback, archive listing, and archive cleanup flows.
- Enabled runtime Data update configuration with the latest manifest URL.
- Preserved generated Studio proposal, decision, meeting session, work order, and director goal records as data artifacts.

## User Guide Decision

The canonical Korean user guide was updated in the same change set because this affects a regular user intervention point: team Data publish operation wording and behavior.

## Validation Summary

No new end-to-end Google Drive publish, rollback, or Studio browser validation was run during the workbench cleanup commit pass.

## Remaining Risks

- Google Drive operations should be smoke-tested with local credentials before relying on rollback or cleanup in production use.
- Generated Studio JSON records were committed as-is from the working tree.

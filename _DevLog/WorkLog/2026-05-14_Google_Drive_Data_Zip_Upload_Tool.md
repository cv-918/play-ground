# Google Drive Data ZIP Upload Tool

## Summary

Added a local Windows tool plan implementation for creating a ZIP snapshot of `PlayGround\Data` and uploading it to Google Drive.

## Background

The project needs a local utility that uploads the full current `PlayGround\Data` directory to the user's Google Drive. The upload should include actual disk contents, including modified and untracked data resources, without changing game runtime code.

## Scope

- Add a new local tool under `tools/google-drive-data-upload/`.
- Keep credentials and local upload configuration under `_Local/GoogleDriveDataUpload/`.
- Keep generated archives and upload logs under `_Temp/GoogleDriveDataUpload/`.
- Do not modify game source, game data schema, Discord workflow commands, PC Runner behavior, or AIWorkflow approval/finalization behavior.

## Files Changed

- `tools/google-drive-data-upload/upload_playground_data.bat`
- `tools/google-drive-data-upload/upload_playground_data.ps1`
- `tools/google-drive-data-upload/src/uploadDataSnapshot.js`
- `tools/google-drive-data-upload/config.example.json`
- `tools/google-drive-data-upload/package.json`
- `tools/google-drive-data-upload/package-lock.json`
- `_Docs/Systems/GoogleDriveDataUpload_User_Guide_KR.html`
- `_DevLog/WorkLog/2026-05-14_Google_Drive_Data_Zip_Upload_Tool.md`

## Architecture Notes

The tool separates execution responsibilities:

- PowerShell wrapper: repository resolution, config loading, data scan, ZIP snapshot creation, local archive cleanup.
- Node CLI: Google OAuth token handling, Google Drive API upload, upload result logging.
- Local data: credentials and machine-specific settings remain in `_Local/`.
- Runtime artifacts: ZIP snapshots and upload logs remain in `_Temp/`.

## Implementation Notes

- The ZIP entries are written as `Data/...` paths.
- The default data source is `PlayGround\Data`.
- Dry run reports source, file count, and expected archive path without creating a ZIP or uploading.
- Uploads use Google Drive API `files.create` with a resumable upload session and `drive.file` OAuth scope.
- The first real upload opens a browser for OAuth consent and stores the refresh token locally.
- Windows OAuth browser launch uses `rundll32.exe url.dll,FileProtocolHandler` so OAuth query parameters such as `response_type=code` are not truncated by `cmd start`.
- OAuth callback server tries ports `53682` through `53720` so a stale previous run does not block first-time authorization.

## Review Summary

Self-review completed.

- The implementation stays outside game source and game data schema.
- Runtime credentials and user-specific config paths point to `_Local/GoogleDriveDataUpload/`.
- Runtime archives and upload logs point to `_Temp/GoogleDriveDataUpload/`.
- No Discord command, PC Runner, approval, finalization, or AIWorkflow guide behavior was changed.

## Validation Summary

Commands run:

- `npm install --package-lock-only`
- `npm install`
- `node --check tools\google-drive-data-upload\src\uploadDataSnapshot.js`
- PowerShell parser check for `tools\google-drive-data-upload\upload_playground_data.ps1`
- `tools\google-drive-data-upload\upload_playground_data.bat --dry-run`
- `node --check tools\google-drive-data-upload\src\uploadDataSnapshot.js` after OAuth browser launch fix
- `tools\google-drive-data-upload\upload_playground_data.bat --dry-run` after OAuth browser launch fix
- `node --check tools\google-drive-data-upload\src\uploadDataSnapshot.js` after OAuth callback port fallback fix
- `tools\google-drive-data-upload\upload_playground_data.bat --dry-run` after OAuth callback port fallback fix
- `tools\google-drive-data-upload\upload_playground_data.bat`
- `tools\google-drive-data-upload\upload_playground_data.bat --config tools\google-drive-data-upload\config.example.json --keep-archive`
- ZIP entry inspection for `_Temp\GoogleDriveDataUpload\archives\PlayGround_Data_20260514_203216.zip`

Results:

- `package-lock.json` was generated successfully.
- Local `node_modules/` was installed for the tool and remains ignored by Git.
- Node syntax check passed.
- PowerShell parser check passed.
- Dry run passed and reported 104 files under `PlayGround\Data`.
- Dry run after OAuth browser launch fix passed and reported 104 files under `PlayGround\Data`.
- Dry run after OAuth callback port fallback fix passed and reported 104 files under `PlayGround\Data`.
- Missing local config failure path returned a non-zero result with a `CONFIG_ERROR` message.
- ZIP creation passed with 104 entries and a 5,887,895 byte archive.
- ZIP inspection confirmed `Data/UserData.json`, `Data/Resources/Textures/Characters/Dusty/...`, `Data/Resources/Textures/SceneImages/...`, and `Data/Resources/Textures/UI/...` entries are included.
- Missing OAuth client failure path returned a non-zero result with an `AUTH_ERROR` message after ZIP creation.
- Korean HTML user guide was added under `_Docs/Systems/`.

Google Drive live upload validation requires local OAuth client setup and user confirmation in Google Drive.

## AIWorkflow User Guide Decision

No update needed for `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html`.

Reason: this is an independent local utility and does not change Discord command names, options, cards, prompts, intake handoff behavior, PC Runner routing, approval gates, task completion, finalization, commit, push, or manual escalation workflow.

## Remaining Risks

- Actual Google Drive upload depends on local OAuth configuration and network access.
- If the selected Drive folder ID is wrong or inaccessible, upload will fail at runtime.
- Google Drive UI confirmation must be performed by the user after a real upload.
- Live upload was not performed in this implementation pass because `_Local/GoogleDriveDataUpload/config.local.json` and OAuth credentials are not present.

## Next Tasks

- Create `_Local/GoogleDriveDataUpload/config.local.json` from `tools/google-drive-data-upload/config.example.json`.
- Place the Google Desktop OAuth client JSON at `_Local/GoogleDriveDataUpload/oauth_client.json`.
- Run `tools\google-drive-data-upload\upload_playground_data.bat --keep-archive` once and confirm the ZIP appears in the selected Google Drive folder.

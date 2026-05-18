# Launcherless Data Auto Update

## Summary

Added a launcherless startup Data update path for the Windows game build and extended the existing Google Drive upload tool with a team distribution mode.

## Background

The game needs to let team members run the distributed exe directly while still receiving updated `Data` contents. The update flow should skip work when the remote manifest matches the local applied manifest, preserve each team member's `Data/UserData.json`, and keep the game playable when update checks or downloads fail.

## Scope

- Run a startup update check before `GameDataLoader::LoadAll()`.
- Read `DataUpdateConfig.json` from the exe directory.
- Download and validate a remote manifest through WinHTTP.
- Apply updates through a PowerShell helper located beside the exe.
- Extend `tools/google-drive-data-upload` with team publish mode for latest ZIP and manifest files.
- Update the Korean Google Drive upload guide with team publish and runtime configuration instructions.

## Files Changed

- `PlayGround/Project/App/EntryPoint.cpp`
- `PlayGround/Project/App/DataUpdateService.h`
- `PlayGround/Project/App/DataUpdateService.cpp`
- `PlayGround/DataUpdater/apply_data_update.ps1`
- `PlayGround/DataUpdateConfig.json`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`
- `tools/google-drive-data-upload/upload_playground_data.bat`
- `tools/google-drive-data-upload/upload_playground_data.ps1`
- `tools/google-drive-data-upload/src/uploadDataSnapshot.js`
- `tools/google-drive-data-upload/config.example.json`
- `_Docs/Systems/GoogleDriveDataUpload_User_Guide_KR.html`
- `_DevLog/WorkLog/2026-05-15_Launcherless_Data_Auto_Update.md`

## Architecture Notes

The implementation keeps decision, execution, and data separated:

- Startup decision: `DataUpdateService` reads config, checks the remote manifest, compares local applied manifest, and launches the helper only when needed.
- Execution: `DataUpdater/apply_data_update.ps1` performs archive download, size and SHA256 validation, extraction, preservation, backup, replace, and rollback attempt.
- Data: `DataUpdateConfig.json`, remote `PlayGround_Data_Manifest.json`, and local `Data/DataUpdateManifest.json` carry update state without changing gameplay data schema.
- Publishing: `tools/google-drive-data-upload` creates the team ZIP and manifest and updates Google Drive files in place.

## Implementation Notes

- `EntryPoint.cpp` now calls `DataUpdateService::RunStartupUpdateCheck()` before `pg.Initialize()`.
- `DataUpdateConfig.json` is disabled by default, so normal local builds are unaffected until a manifest URL is configured.
- The Visual Studio project now creates the default output `DataUpdateConfig.json` only when it is missing, preserving a configured Release/Debug output file across rebuilds.
- The startup manifest download runs through `DataUpdater/download_manifest.ps1` so Google Drive redirects and transient download failures stay outside the game process.
- Startup update check failures are appended to `_DataUpdate/data_update_service.log` beside the exe.
- Each startup check writes `_DataUpdate/last_update_result.json` with a machine-readable status such as `updated`, `skipped_already_applied`, `update_failed`, `check_failed`, or `disabled`.
- Non-`SHIPPING` builds render a short top-right startup overlay from `last_update_result.json`, showing `Data updated`, `Data already latest`, or a failure message for about eight seconds.
- Startup MessageBox calls were removed from the update service after runtime testing showed they can crash before the main game window/message loop is fully active. Update progress is recorded in `_DataUpdate/data_update_service.log` and debug output instead.
- The PowerShell helper preserves `Data/UserData.json` by default and also honors manifest `preserve_paths`.
- Team publish mode excludes preserved paths from the ZIP by default.
- The publisher maintains fixed Drive file names: `PlayGround_Data_Latest.zip` and `PlayGround_Data_Manifest.json`.
- Publisher uploads set `anyone reader` permission for team download without Google login.

## Review Summary

Self-review completed.

- The startup check occurs before the game data loader.
- Update failure policy is fail-open: existing `Data` remains in use whenever check or apply fails.
- No gameplay JSON schema was changed.
- `UserData.json` is treated as local save data and is not included in the team ZIP by default.
- Runtime artifacts stay under `_DataUpdate` beside the distributed exe, while publisher artifacts remain under `_Temp`.

## Validation Summary

Commands run:

- `node --check tools\google-drive-data-upload\src\uploadDataSnapshot.js`
- PowerShell parser check for `tools\google-drive-data-upload\upload_playground_data.ps1`
- PowerShell parser check for `PlayGround\DataUpdater\apply_data_update.ps1`
- `tools\google-drive-data-upload\upload_playground_data.bat --dry-run`
- `tools\google-drive-data-upload\upload_playground_data.bat --publish-team-data --data-version smoke --dry-run`
- Team publish smoke with a temporary config, expected to stop at missing OAuth after creating local ZIP and manifest
- ZIP inspection for `PlayGround_Data_Latest.zip`
- PowerShell apply helper smoke against a temporary game root
- `MSBuild.exe PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m`
- `MSBuild.exe PlayGround\PlayGround.sln /p:Configuration=Release /p:Platform=x64 /m`
- `node --check tools\google-drive-data-upload\src\uploadDataSnapshot.js` after Google Drive direct download URL adjustment
- `MSBuild.exe PlayGround\PlayGround.sln /p:Configuration=Release /p:Platform=x64 /m` after startup redirect handling and service log addition
- PowerShell parser check for `PlayGround\DataUpdater\download_manifest.ps1`
- `MSBuild.exe PlayGround\PlayGround.sln /p:Configuration=Release /p:Platform=x64 /m` after moving manifest download to helper process
- Release exe runtime smoke with `DataUpdateConfig.json` enabled and real Google Drive manifest URL
- Release exe second-run smoke confirming already-applied skip path
- Release exe runtime smoke confirming `last_update_result.json` reports `updated`
- Release exe second-run smoke confirming `last_update_result.json` reports `skipped_already_applied`
- Release exe window capture confirming `Data updated 2026.05.15.001` top-right overlay
- Release exe window capture confirming `Data already latest 2026.05.15.001` top-right overlay
- `MSBuild.exe PlayGround\PlayGround.sln /p:Configuration=Release /p:Platform=x64 /m` after changing output config copy behavior to missing-only
- Release exe runtime smoke after the missing-only config copy fix

Results:

- Node syntax check passed.
- PowerShell parser checks passed.
- Dry runs passed.
- Team publish smoke created `PlayGround_Data_Latest.zip` and `PlayGround_Data_Manifest.json`.
- ZIP inspection confirmed `Data/UserData.json` was excluded from the team ZIP.
- Apply helper smoke downloaded from a local `file:///` URL, validated SHA256 and size, replaced `Data`, preserved `UserData.json`, and wrote `Data/DataUpdateManifest.json`.
- Debug x64 build succeeded with one existing conversion warning in `EntryPoint.cpp`.
- Release x64 build succeeded with existing conversion warnings.
- Release x64 rebuild after redirect handling succeeded with 0 warnings and 0 errors.
- Release x64 runtime smoke applied `data_version=2026.05.15.001`, created `Data/DataUpdateManifest.json`, downloaded `PlayGround_Data_Latest.zip`, and created `_DataUpdate/backup/Data_20260515_031115`.
- Second Release x64 runtime smoke skipped update because local manifest matched the remote manifest.
- `last_update_result.json` records the current startup check result for both update and skip paths.
- Top-right status overlay rendered correctly in Release x64 for both update and skip paths.
- Release x64 build preserved the configured output `DataUpdateConfig.json` with `enabled=true` and the Google Drive manifest URL after the missing-only copy behavior was applied.
- Release x64 runtime smoke after the config-copy fix wrote `status=skipped_already_applied`, confirming the exe no longer reported `disabled`.
- Live Google Drive team publish and anonymous browser download were not performed in this pass.

## AIWorkflow User Guide Decision

No update needed for `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html`.

Reason: this task changes a local game startup updater and a standalone Google Drive data publishing tool. It does not change Discord command names, command options, cards, labels, next-command prompts, intake auto-handoff behavior, PC Runner routing, approval gates, task done/finalization flow, commit/push flow, or manual escalation workflow.

## Remaining Risks

- Team publish mode still needs one live Google Drive run after local OAuth configuration.
- The published manifest URL must be copied into the distributed `DataUpdateConfig.json` once per output folder. Subsequent builds preserve that configured output file.
- Google Drive public download behavior should be checked once in an incognito browser.
- Runtime update was smoke-tested through the helper, but the full game executable was not manually launched through an actual remote update scenario.

## Next Tasks

- Run `tools\google-drive-data-upload\upload_playground_data.bat --publish-team-data --data-version <version>` with real Google Drive config.
- Copy the printed manifest URL into the distributed exe folder's `DataUpdateConfig.json` and set `enabled` to `true` when preparing a new output folder.
- Verify an incognito browser can download the manifest and ZIP without login.
- Run the distributed exe once with an older local manifest and confirm `Data` updates while `Data\UserData.json` is preserved.

# UserData LocalAppData Save Separation

## Summary

`UserData.json` was separated from patchable game `Data/` and moved to a player-save responsibility owned by `UserDataManager`.

The default save path is now:

```text
%LOCALAPPDATA%/PlayGround/UserData.json
```

## Background

Shipping tests may distribute only:

```text
PlayGround.exe
DataUpdateConfig.json
DataUpdater/
```

In that flow, the first startup update downloads `Data/`, but the publish pipeline excludes `Data/UserData.json` because it is user-specific save data. The game therefore needed to boot when no `UserData.json` exists in patchable `Data/`.

## Scope

- Centralized UserData load/save through `UserDataManager`.
- Added default UserData creation when no LocalAppData save exists.
- Added one-time migration from legacy `Data/UserData.json`.
- Added corrupt save backup before default recreation.
- Updated GameDataLoader and StageManager to use the new UserData-specific methods.
- Updated workflow validation scripts so publish Data can omit `UserData.json`.

## Implementation Notes

- Missing save creates a schema-valid default profile, not an empty file.
- Default values include `stage_progress_ = 1`, `main_story_progress_ = Prologue1`, and empty progression/equipment defaults.
- Existing `UserProfile::StoreUserData` still applies the default unlocked character fallback.
- Corrupt saves are copied to `UserData.corrupt_<timestamp>.json` before default save creation.
- Legacy `Data/UserData.json` is copied to LocalAppData only when no LocalAppData save exists.

## Validation

Performed:

```text
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround\Data
tools\aiworkflow\json_smoke_check.bat PlayGround\Data
tools\aiworkflow\run_result_semantics_check.bat
tools\aiworkflow\json_smoke_check.bat _Temp\UserDataLocalAppDataValidation\DataNoUserData
tools\aiworkflow\game_data_loader_readability_check.bat _Temp\UserDataLocalAppDataValidation\DataNoUserData
MSBuild PlayGround\PlayGround.sln Debug|x64
git diff --check -- <changed files>
```

Results:

- JSON smoke passed for current `PlayGround\Data`.
- Game data loader readability passed for current `PlayGround\Data`.
- JSON smoke passed for a temporary Data copy with `UserData.json` removed.
- Game data loader readability passed for a temporary Data copy with `UserData.json` removed.
- Run result semantics check passed.
- Debug x64 build passed with existing warnings and no errors.
- `git diff --check` returned no whitespace errors. It only reported line-ending normalization warnings.

## Remaining Risks

- Full interactive first-run client smoke was not performed in this change.
- The build output post-build step still copies `PlayGround\Data` for local Debug output; shipping packaging should continue to choose only the intended runtime files.

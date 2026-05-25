# UserData Runtime Migration

## Summary
- Added a runtime UserData schema version and migration path.
- Existing LocalAppData saves without a version are treated as schema version 1 and migrated to version 2.

## Background
- `UserData.json` is now local save data under `%LOCALAPPDATA%/PlayGround/UserData.json`.
- Team distribution can update the exe without replacing each user's local save.
- A versioned migration layer is needed before future save schema changes.

## Scope
- Added `save_schema_version_` to `UserDataJsonInfo`.
- Added `UserDataMigration` for raw JSON version detection and migration.
- Connected `UserDataManager` load flow to migrate before deserializing to `UserDataJsonInfo`.
- Did not change the actual save data shape beyond adding `save_schema_version_`.

## Files Changed
- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataMigration.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataMigration.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/UserProfile.cpp`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`

## Architecture Notes
- `UserDataManager` owns file IO, backups, migration invocation, and save creation.
- `UserDataMigration` owns raw JSON schema version transitions.
- `UserProfile` still receives only the latest `UserDataJsonInfo` model.

## Implementation Notes
- Current latest schema version is `2`.
- Missing `save_schema_version_` is interpreted as version `1`.
- Version `1 -> 2` only stamps `save_schema_version_ = 2`.
- Migrated files attempt a `UserData.before_migration_v{from}_<timestamp>.json` backup before saving the latest schema.
- Corrupt or unsupported saves still flow through the existing corrupt-backup/default-save recovery path.

## Review Summary
- No distribution-data policy change was made: publish Data can still omit `Data/UserData.json`.
- Existing normalization remains in place for missing attribute nodes, zero levels, duplicate nodes, and stage progress.

## Validation Summary
- `PlayGround/PlayGround.sln Debug|x64 /t:ClCompile`: passed with existing warnings, no errors.
- `PlayGround/PlayGround.sln Debug|x64 /t:Build`: passed with 0 warnings and 0 errors.
- `tools/aiworkflow/json_smoke_check.bat PlayGround/Data`: passed.
- `tools/aiworkflow/game_data_loader_readability_check.bat PlayGround/Data`: failed on AttributeNode child reference checks unrelated to UserData migration. A focused Node.js child-id check confirmed first tuple elements are valid child IDs.
- Runtime LocalAppData migration smoke passed with a temp `LOCALAPPDATA` path:
  - Legacy save without `save_schema_version_` was loaded.
  - `UserData.before_migration_v1_<timestamp>.json` backup was created.
  - `UserData.json` was rewritten with `save_schema_version_ = 2`.
  - Existing dust, experience, stage progress, main story progress, equipped skills, and acquired nodes were preserved.
  - The real user LocalAppData path was not touched.

## Remaining Risks
- Readability script appears to treat `children_nodes_info_` direction values as child IDs for the redesigned AttributeNode data; that validation script should be reviewed separately.
- Missing-save and corrupt-save runtime scenarios were not separately smoke-tested after this migration change.

# GAME-20260513-181243 UserData Default And Node Load Guard

## Summary

Implemented the approved minimal UserData data/loader fix.

## Background

The active AIWorkflow task requested a minimal fix for `UserData.json` `stage_progress_` default handling and attribute node state safety, without a JSON schema change or unrelated refactor.

## Scope

- Normalize missing or zero `stage_progress_` to `1`.
- Reset the tracked `UserData.json` `stage_progress_` default to `1`.
- Guard loaded acquired node entries so invalid level-0, missing-node, zero-max-level, over-max-level, and duplicate entries do not produce inconsistent node state or duplicated stat application.

## Files Changed

- `PlayGround/Data/UserData.json`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.cpp`
- `_DevLog/FixLog/2026-05-13_GAME-20260513-181243_UserData_Default_And_Node_Load_Guard.md`

## Architecture Notes

Schema parsing remains in `from_json`. Cross-table validation stays in `UserDataManager::Load`, where `AttributeNodeDataManager` is available because `GameDataLoader` loads attribute node data before user data.

## Implementation Notes

No schema fields were added or removed. Invalid acquired-node entries are normalized during load before data is stored in `UserProfile`.

## Review Summary

Post-change diff review found only the intended UserData data change, loader normalization code, and this FixLog. No schema fields were added or removed. No `_Local`, `_Temp`, `node_modules`, `.env`, or local config files were modified by tracked edits.

AIWorkflow user guide update decision: not needed. This task changed game data/loader behavior, not Discord commands, PC Runner profiles, completion gates, task finalization, or regular workflow user intervention points.

## Validation Summary

- JSON smoke: passed. All 11 files under `PlayGround/Data` parsed with `ConvertFrom-Json`; failed count was 0.
- GameDataLoader readability: passed. Expected loader files parsed, required arrays were non-empty, ID/reference checks passed, `UserData.stage_progress_ >= 1` passed, and acquired-node level checks passed.
- Debug x64 build: passed. `MSBuild.exe PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64` exited 0.
- Build warnings: 5 existing C4244 conversion warnings in `StageManager.cpp`; no errors.
- Runtime boot/manual gameplay validation: not run by this executor.

## Remaining Risks

This load-time normalization is intentionally non-fatal. It preserves bootability for recoverable save-data problems, but severe corrupted save data may still need manual inspection. Runtime boot/manual gameplay validation remains outside this executor pass.

## Next Tasks

Human Director should review the final diff and decide whether to commit.

## AI Assistance

Codex implemented the approved bounded change.

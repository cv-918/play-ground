# 2026-06-12 NightWork Game Batch A

## Summary
- Implemented approved Batch A game fixes for dialogue input blocking, attribute tooltip refresh, and cursor visibility.
- Implemented the optional next-stage prompt because the existing UI path was simple and localized.

## Background
- The approved work packet requested the safest high-value overnight fixes only.
- Primary constraints were no schema/save-load/build-setting/rendering-policy changes and no unrelated refactors.

## Scope
- Dialogue-active gameplay input blocking in OutGame town gameplay.
- Attribute node tooltip refresh after node click/selection.
- Cursor visibility for in-game active state versus interactive UI state.
- Optional blinking next-stage prompt on the next-stage progress gauge.

## Files Changed
- `PlayGround/Project/App/EntryPoint.cpp`
- `PlayGround/Project/App/EntryPoint.h`
- `PlayGround/Project/Gameplay/Actors/Town/TownPlayer.cpp`
- `PlayGround/Project/Gameplay/Actors/Town/TownPlayer.h`
- `PlayGround/Project/Gameplay/Components/PlayerMovement.cpp`
- `PlayGround/Project/Gameplay/Components/PlayerMovement.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/StageManager.h`
- `PlayGround/Project/Gameplay/Scenes/InGameScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/InGameScene.h`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.h`
- `PlayGround/Project/Gameplay/UI/Views/InGamePlayView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/InGamePlayView.h`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.cpp`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp`
- `_Temp/NightWork_2026-06-12_GameBatchA_Result.md`

## Architecture Notes
- Dialogue input blocking uses existing `DialogueSystem::IsBlockingGameInput()` as the decision source.
- Town movement blocking is localized to `TownPlayer` and `PlayerMovement`; dialogue confirm/choice input remains in `OutGameScene`.
- Cursor visibility is centralized through `SetGameCursorVisible()` in the app entry point to avoid scattered `ShowCursor` calls and counter imbalance.
- Attribute tooltip refresh remains inside the attribute UI widget path.
- Optional next-stage prompt exposes a read-only `StageManager::CanProgressNextStage()` getter for UI display.

## Implementation Notes
- `PlayerMovement` now has a gameplay-input-blocked flag that stops velocity immediately and ignores movement input while active.
- `TownPlayer` skips NPC interaction input while gameplay input is blocked.
- `OutGameScene` syncs the town-player block before object updates and after dialogue result consumption.
- `AttributeNodeTree` rebuilds the tooltip on left/right click release when the hovered node remains the same.
- `AttributeNodeToolTip` clears stale target/text on null target.
- `InGameScene` hides the cursor for in-game play/HUD view and shows it for pause/result UI; `OutGameScene` restores visible cursor.
- `InGamePlayView` blinks `스페이스바를 누르세요` on `next_stage_progress_` while next-stage progression is available.

## Review Summary
- Diff was reviewed for scope boundaries.
- No JSON schema, save/load, migration, build setting, GDI+, or workflow document changes were made.
- `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` update is not needed because this was not workflow-affecting.

## Validation Summary
- `git status --short` was clean before implementation.
- `MSBuild.exe PlayGround\PlayGround.sln /m /p:Configuration=Debug /p:Platform=x64 /v:minimal` passed.
- A final incremental build passed with no new warnings in the changed file set.
- `git diff --check` passed; only Git CRLF normalization warnings were printed.
- Runtime/manual gameplay validation was not performed.

## Remaining Risks
- Cursor visibility should be manually verified in the WinAPI game window through InGame, Pause, Result, and OutGame transitions.
- Dialogue input blocking should be manually verified with active NPC dialogue.
- Attribute tooltip refresh should be manually verified with left and right node clicks.
- Optional prompt text currently follows the requested Korean wording even though the existing StageProgress default binding appears to be `F`.

## Next Tasks
- Run manual gameplay smoke checks before commit.
- Decide whether the next-stage prompt should later use the actual remapped StageProgress binding text.

## AI Assistance
- Implemented by Codex during the approved NightWork 2026-06-12 Game Batch A run.

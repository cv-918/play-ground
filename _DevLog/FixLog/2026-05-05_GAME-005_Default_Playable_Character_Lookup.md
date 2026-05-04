# GAME-005 Default Playable Character Lookup

## Summary

Replaced unordered `GetDataByIndex(0)` playable character selection with an explicit default playable character ID lookup.

## Background

OutGame town player creation and InGame stage player creation both selected playable character data through `JsonDataManager::GetDataByIndex(0)`. Because the backing table is an `std::unordered_map`, index-based iteration order is not deterministic.

## Scope

- Use Dusty as the reduced-scope default playable character.
- Keep OutGame and InGame spawn paths on the same lookup path.
- Preserve current Dusty behavior.
- Do not change save schema, `UserData.json`, unlock policy, or selection UI.

## Files Changed

- `PlayGround/Project/Gameplay/GamePlaySystems/Json/PlayableCharacterDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/PlayableCharacterDataManager.cpp`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/StageManager.cpp`

## Architecture Notes

`PlayableCharacterDataManager` now owns the reduced-scope default playable character lookup:

- `DEFAULT_PLAYABLE_CHARACTER_ID = PlayableCharacterId::Dusty`
- `GetDefaultPlayableCharacterData()` resolves the default through `GetData(DEFAULT_PLAYABLE_CHARACTER_ID)`

This keeps the selection decision explicit while leaving JSON loading and actor creation responsibilities unchanged.

## Implementation Notes

Before:

- OutGame `TownPlayer` spawn called `_CharacterDagaMgr.GetDataByIndex(0)`.
- InGame `StagePlayer` spawn called `_CharacterDagaMgr.GetDataByIndex(0)`.
- The selected character depended on `std::unordered_map` iteration order.

After:

- OutGame `TownPlayer` spawn calls `_CharacterDagaMgr.GetDefaultPlayableCharacterData()`.
- InGame `StagePlayer` spawn calls `_CharacterDagaMgr.GetDefaultPlayableCharacterData()`.
- The helper resolves Dusty through explicit ID lookup: `GetData(PlayableCharacterId::Dusty)`.

## Review Summary

- Confirmed no remaining `GetDataByIndex(0)` playable character spawn usage in `PlayGround/Project`.
- Confirmed both OutGame and InGame spawn paths use the shared default lookup helper.
- No JSON schema, save data, unlock policy, or UI changes were made.

## Validation Summary

- `git status --short`: run before implementation; unrelated `_Docs/AIWorkflow/ActiveTask.md` and `_Docs/AIWorkflow/Backlog.md` were already modified.
- `git diff --check`: passed.
- `git diff --stat`: reviewed.
- `tools\aiworkflow\json_smoke_check.bat`: passed, 11 JSON files checked, 0 failed.
- Debug x64 build: passed with 4 existing C4244 warnings in `StageManager.cpp`.

## Remaining Risks

- Runtime manual playthrough was not performed.
- If `PlayableCharacter.json` removes or renumbers Dusty ID 1, the default lookup will fail explicitly instead of falling back by table order.

## Next Tasks

- Manually run OutGame and start InGame once to confirm Dusty spawns in both paths.
- Do not commit until the user reviews the diff and accepts unrelated pre-existing document changes separately.

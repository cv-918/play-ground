# 2026-05-19 CharacterStation Editor Expansion

## Summary

Expanded CharacterStation from a read-only preview scene into an editable debug station for character data, animation clip preview, projectile muzzle offset tuning, and JSON save/load. Also moved StagePlayer rendering from a static first-frame path toward the shared sprite animation component path.

## Background

The previous CharacterStation slice created the scene entry and preview shell. The next requested step was to proceed with the remaining task list: actual editor controls, animation editing, save/load, and runtime use of `animation_clips_` instead of the legacy `image_path_` where possible.

## Scope

- Add DebugAssistant checkbox binding support.
- Add editable CharacterStation controls for shared unit data, navigation bounds, playable-only stats, animation clip metadata, and enemy projectile settings.
- Add save support for playable character and enemy data managers.
- Add projectile muzzle offset fields to enemy data and apply them during projectile spawn.
- Add StagePlayer animation renderer setup using `SpriteRendererComponent` and `SpriteAnimatorComponent`.
- Add white-flash support to `SpriteRendererComponent` so animated StagePlayer hit feedback is preserved.
- Keep existing unrelated working-tree changes untouched.

## Files Changed

- `PlayGround/Data/Enemy.json`
- `PlayGround/Project/EngineSystems/Debug/DWE_CheckBox.cpp`
- `PlayGround/Project/EngineSystems/Debug/DWE_CheckBox.h`
- `PlayGround/Project/EngineSystems/Debug/DebugAssistantHeader.h`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.cpp`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.h`
- `PlayGround/Project/EngineSystems/Json/JsonDataManager.h`
- `PlayGround/Project/Gameplay/Actors/Stage/ProjectileAttackAbility.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/StagePlayer.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/StagePlayer.h`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/Components/SpriteRendererComponent.cpp`
- `PlayGround/Project/Gameplay/Components/SpriteRendererComponent.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/EnemyDataManager.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/EnemyDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/PlayableCharacterDataManager.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/PlayableCharacterDataManager.h`
- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.h`

## Architecture Notes

- CharacterStation remains a debug-only editor surface. It owns preview/editor state, while data managers remain responsible for JSON persistence.
- Runtime projectile spawn now reads explicit enemy muzzle offset data instead of relying on hard-coded spawn position.
- StagePlayer uses the same component direction as TownPlayer: animator chooses clips, renderer draws, gameplay state remains separate.
- `image_path_` remains a legacy fallback only. Playable preview and StagePlayer now prefer `animation_clips_`.
- Enemy projectile offset schema is backward-compatible through default JSON loading.

## Implementation Notes

- `DweCheckBoxData` mirrors the getter/setter binding style already used by sliders, combo boxes, text inputs, color fields, and vector fields.
- CharacterStation supports `F5` reload, `F9` save current mode, save all, reset animation preview, selected clip preview playback, and direct field editing through DebugAssistant.
- Enemy projectile muzzle offset is stored as local forward/side offset:
  - `projectile_spawn_offset_x_`: forward distance along the shot direction.
  - `projectile_spawn_offset_y_`: side distance perpendicular to the shot direction.
- StagePlayer animated rendering falls back to the previous static sprite/shape path if the animation set cannot be built.
- `JsonDataManager` and the new save managers explicitly consume caught exceptions to avoid release-build unused-variable warnings when debug message macros compile away.

## Review Summary

- Reviewed the scoped diff for DebugAssistant checkbox binding, CharacterStation edit/save flow, StagePlayer animation setup, SpriteRenderer white flash, and projectile spawn offset use.
- No Critical or Major issues found in the implemented scope.
- Remaining warning noise is pre-existing conversion or release-only debug macro noise outside this feature, except for `ParticleEventSetDataManager` and `UserDataManager` catch-variable warnings that were not part of this requested scope.

## Validation Summary

- `node -e "JSON.parse(...)"` for:
  - `PlayGround/Data/Enemy.json`
  - `PlayGround/Data/PlayableCharacter.json`
  - Result: passed.
- `git diff --check` for the scoped changed files
  - Result: passed. Git reported expected LF-to-CRLF working-copy normalization warnings only.
- `MSBuild.exe PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m`
  - Result: passed, 9 warnings, 0 errors.
- `MSBuild.exe PlayGround/PlayGround.sln /p:Configuration=Shipping /p:Platform=x64 /m`
  - Result: passed, 17 warnings, 0 errors.

Manual in-game validation of CharacterStation controls, animated preview, StagePlayer runtime animation, and projectile muzzle visual feel was not performed in this pass.

## Remaining Risks

- CharacterStation UI should still be manually checked in-game because DebugAssistant layout and interactions are visual/runtime behavior.
- StagePlayer now uses animation components, but actual clip switching and hit flash feel should be checked in a live stage.
- Enemy projectile muzzle offset is implemented as forward/side local offset relative to shot direction; designer tuning is still needed per enemy.
- Existing build warnings remain outside this scope.

## AIWorkflow User Guide Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed. This task changes game debug tooling and runtime character behavior, not AIWorkflow commands, approvals, runner routing, completion steps, or user intervention points.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were created or modified by this work.

## Next Tasks

- Manually run CharacterStation and test edit, preview, reload, save current, and save all flows.
- Tune projectile muzzle offsets per projectile enemy using the new guide.
- Decide whether to add enemy animation clip metadata so enemy preview can also move away from legacy `image_path_`.
- Optionally clean existing build warnings in a separate warning-focused pass.

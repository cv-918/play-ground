# 2026-05-19 CharacterStation Entry Preview

## Summary

Added the first reduced-scope CharacterStation slice: a non-SHIPPING IntroScene entry button, scene routing, and a read-only debug scene that can select playable or enemy character data and draw a center-screen preview.

## Background

The requested final feature is a broader character editor for colliders, projectile muzzle offsets, animation resource assignment, JSON persistence, and runtime application. This slice intentionally avoids schema and runtime behavior changes so the station shell can be reviewed before data editing is introduced.

## Scope

- Add `SceneType::CharacterStation`.
- Add a non-SHIPPING `CharacterStation` button below `ParticleStation` in `IntroScene`.
- Add `CharacterStationScene` as a debug-only scene route.
- Display playable/enemy character lists through DebugAssistant.
- Preview the selected playable character resource from `animation_clips_`.
- Keep enemy preview on the current legacy `image_path_` path until enemy animation clip data exists.
- Draw current runtime body-collider guide values in the preview.

## Files Changed

- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.h`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.cpp`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayFunctions.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/SceneManager.cpp`
- `PlayGround/Data/PlayableCharacter.json`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`

## Architecture Notes

- The scene owns editor state and preview decisions only.
- No JSON schema fields were added in this slice.
- No runtime character behavior was changed in this slice.
- Shipping builds retain a guarded route that logs and refuses `CharacterStation`, matching the `ParticleStation` policy.

## Implementation Notes

- `CharacterStationScene` restores the previous debug mode on exit.
- `Esc` returns to `IntroScene`.
- `F5` reloads game data using the existing `GameDataLoader::ReloadAll` path.
- Playable preview no longer treats `image_path_` as the primary resource source.
- Current preview fallback is intentionally conservative: invalid data/resource paths result in a visible placeholder instead of modifying data.
- `StagePlayer` now uses the first playable `animation_clips_` frame as its static sprite source before considering the legacy `image_path_` fallback.
- `PlayableCharacter.json` now leaves the legacy `image_path_` blank and points the idle/move clip prefixes at the current Dusty resource filenames.

## Review Summary

- Reviewed scene routing and project-file registration after implementation.
- Verified that the new scene source produced no Debug x64 warnings after cleanup.
- Existing unrelated working-tree changes were preserved.

## Validation Summary

- `MSBuild.exe PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m`
  - Result: passed, 0 warnings, 0 errors on the final incremental run after data copy.
- `MSBuild.exe PlayGround/PlayGround.sln /p:Configuration=Shipping /p:Platform=x64 /m`
  - Result: passed, 0 warnings, 0 errors on the final incremental run after data copy.
- Full source rebuilds before the final data-only rerun passed with existing warning noise: Debug 17 warnings / 0 errors, Shipping 53 warnings / 0 errors.
- `PowerShell ConvertFrom-Json -Encoding UTF8` and `node JSON.parse` for `PlayableCharacter.json`
  - Result: passed.
- `PowerShell Test-Path` for the first idle/move animation frames referenced by `PlayableCharacter.json`
  - Result: passed for `Dust_Idle_001.png` and `Dust_move_001.png`.

Manual in-game UI validation was not performed in this pass.

## Remaining Risks

- Enemy preview still depends on legacy `image_path_` because enemy animation clip data is not part of the current schema.
- Playable preview and `StagePlayer` sprite fallback depend on the existing `animation_clips_` directory/prefix data matching actual files.
- Collider editing, muzzle offsets, animation assignment UI, JSON save, and runtime application are intentionally deferred.

## AIWorkflow User Guide Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed. This task does not change AIWorkflow commands, approvals, PC Runner routing, finalization, or human intervention points.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were created or modified by this slice.

## Next Tasks

- Approve and define the character JSON schema extension for editable collider and muzzle data.
- Add save support to the relevant character data managers.
- Apply saved collider and muzzle data in `StagePlayer`, `Enemy`, and projectile spawn paths.
- Expand station preview to animate selected clips and edit per-action clip bindings.

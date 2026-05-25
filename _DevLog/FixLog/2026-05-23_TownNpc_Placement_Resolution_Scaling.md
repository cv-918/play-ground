# Town NPC Placement Resolution Scaling

## Summary
- Town NPC placement positions now scale from the design resolution to the current OutGame town viewport.
- This fixes Shipping fullscreen behavior where NPCs remained placed as if the town were still `1280x720`.

## Background
- `TownNpcPlacement.json` stores hand-authored NPC positions in the design-resolution coordinate space.
- `OutGameScene` already resizes the town background/nav mesh to the current window resolution, but NPC spawn positions were using the raw JSON coordinates.

## Scope
- Updated town NPC placement spawning and viewport-change repositioning.
- Did not change `TownNpcPlacement.json` schema or authored data.
- Did not change NPC visuals, collision, dialogue flow, or save data.

## Files Changed
- `PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.cpp`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`

## Implementation Notes
- `TownNpcPlacementSpawner::Spawn` now receives the current target area/nav mesh.
- Authored placement coordinates are converted from `ScreenSystem::DesignResolution()` to the target area.
- `OutGameScene::_HandleViewportChanged` reapplies NPC positions after the town background/nav mesh is resized.

## Validation Summary
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:ClCompile` passed with existing conversion warnings and 0 errors.
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:Build` passed with 0 warnings and 0 errors.
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Shipping /p:Platform=x64 /t:Build` passed with existing warnings and 0 errors.
- Runtime Shipping fullscreen validation was not performed by the assistant.

## Remaining Risks
- If future placement data is authored in normalized coordinates or world coordinates instead of design pixels, the conversion policy should be revisited.

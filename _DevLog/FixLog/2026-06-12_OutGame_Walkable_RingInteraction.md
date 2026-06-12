# 2026-06-12 OutGame Walkable Area and NPC Ground Interaction

## Summary
- Expanded the OutGame town-player movement area to the orange rectangle from the latest gameplay screenshot.
- Ground-attached interaction areas are now applied consistently to elder, engineer, and ring NPCs.
- NPC visual positions remain unchanged; only interaction collider offsets are adjusted.
- No JSON schema changes were made.

## Files Changed
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/Actors/Town/TownNpc.h`
- `PlayGround/Project/Gameplay/Actors/Town/TownNpc.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.cpp`

## Behavior
- The background still uses its full render/nav area for visual placement and camera bounds.
- The town player uses `BuildOutGamePlayerWalkableArea()` for movement clamping.
- The walkable area currently matches the requested orange rectangle:
  - left `14`
  - top `459`
  - right `1272`
  - bottom `629`
- All story NPC interaction colliders are explicitly offset toward the ground using `_ApplyGroundInteractionArea()`.

## Validation
- Source-anchor smoke passed for orange walkable bounds and uniform NPC ground interaction areas.
- Debug x64 MSBuild passed.
- `git diff --check` passed.

## Runtime Notes
- Manual gameplay check should confirm the expanded walkable rectangle feels correct for the isometric/quarter-view background.
- Manual check should confirm elder, engineer, and ring interaction prompts trigger naturally from ground positions.

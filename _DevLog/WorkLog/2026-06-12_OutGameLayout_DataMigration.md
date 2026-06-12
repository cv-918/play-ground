# 2026-06-12 OutGameLayout Data Migration

## Summary
- Added `Data/OutGameLayout.json` as the data source for OutGame background, player walkable rect, NPC visual placement, and NPC interaction areas.
- Added `OutGameLayoutDataManager` with Load/Save support.
- Updated `GameDataLoader` to load OutGameLayout as required data.
- Migrated `OutGameScene` from hard-coded player walkable rect / `TownNpcPlacementDataManager` consumption to `_OutGameLayoutDataMgr`.
- Updated `TownNpcPlacementSpawner` to consume `OutGameLayoutNpcEntry` and apply interaction areas from data instead of per-NPC hard-coded constants.

## Files Changed
- `PlayGround/Data/OutGameLayout.json`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/OutGameLayoutDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/OutGameLayoutDataManager.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.cpp`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`

## Behavior
- Runtime OutGame now reads the player walkable area from `OutGameLayout.json`.
- Runtime NPC visual positions and interaction collider settings now come from `OutGameLayout.json`.
- Current JSON values preserve the most recent hand-tuned layout values before the migration.
- `TownNpcPlacement.json` remains in the project for now but OutGameScene no longer consumes it.

## Validation
- Source-anchor smoke passed: no hard-coded OutGame walkable constants remain in `OutGameScene.cpp`, and spawner no longer has elder/engineer/ring hard-coded interaction offsets.
- Debug x64 MSBuild passed.
- `git diff --check` passed.

## Known Risks / Next Steps
- Manual runtime check still needed to confirm OutGame loads with the same visual behavior.
- Next phase should create `OutGameLayoutStationScene` to preview/edit this JSON data.
- Since `OutGameLayout.json` is now required by `GameDataLoader`, missing file will block startup by design.

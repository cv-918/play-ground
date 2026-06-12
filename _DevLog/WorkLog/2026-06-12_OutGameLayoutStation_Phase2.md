# 2026-06-12 OutGameLayoutStation Phase 2

## Summary
- Added `OutGameLayoutStationScene` as a non-shipping tool scene.
- Registered `SceneType::OutGameLayoutStation` in scene naming and SceneManager construction.
- Added an Intro debug button for `OutGameLayoutStation`.
- Station currently previews the real OutGame background, player walkable rectangle, NPC visual anchors, and NPC interaction ellipses.
- Station supports basic editing and persistence:
  - `1`: select player walkable rect
  - `2` / `Tab`: select/cycle NPC interaction areas
  - mouse drag: move selected rect/ellipse center
  - arrow keys: nudge selected item by 1 px
  - Shift + arrow keys: nudge selected item by 10 px
  - `[` / `]`: adjust selected NPC interaction radius
  - `-` / `=`: adjust selected NPC y_ratio
  - `F5`: reload `OutGameLayout.json`
  - `F9` / Ctrl+S: save `OutGameLayout.json`
  - `Esc`: return to Intro

## Files Changed
- `PlayGround/Project/Gameplay/Scenes/OutGameLayoutStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/OutGameLayoutStationScene.cpp`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayFunctions.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/SceneManager.cpp`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.h`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.cpp`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/OutGameLayoutDataManager.h` (added loaded path accessor)

## Validation
- Source-anchor smoke passed for station scene registration.
- Debug x64 MSBuild passed.
- `git diff --check` passed.

## Known Risks / Manual Check Needed
- User runtime check passed at implementation-pass level.
- The Station yellow rectangle currently shows the raw `player_walkable_rect` from `OutGameLayout.json`.
- The runtime cyan rectangle seen in Movement debug is the effective movable sample rectangle after subtracting player footprint / visual margins from the raw nav mesh. Therefore it appears smaller than the Station raw rectangle.
- Next polish should preview both raw layout bounds and effective runtime movable bounds so the tool exactly explains what the player sees in debug mode.
- Current station focuses on player walkable rect and NPC interaction ellipses; NPC visual position editing is intentionally not included yet.
- Rectangle resizing handles are not implemented yet; current rect edit moves the whole rect. Size tuning can be added next.

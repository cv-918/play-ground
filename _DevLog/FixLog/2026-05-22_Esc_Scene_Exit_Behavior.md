# 2026-05-22 ESC Scene Exit Behavior

## Summary
- Adjusted ESC behavior by build type for Town and Intro scenes.
- Non-shipping Town ESC now returns to Intro instead of opening the game-exit popup.
- Non-shipping Intro ESC now opens the game-exit popup.

## Background
- Town ESC previously opened the exit popup in all builds.
- For development builds, returning from Town to Intro is more useful, while Intro remains the place to confirm quitting.

## Scope
- Changed `OutGameScene` ESC behavior in `Main` view.
- Added a non-shipping exit popup path to `IntroScene`.
- Reused `OutGameExitView` for the Intro exit confirmation popup.
- Did not change Shipping Town exit popup behavior.

## Files Changed
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.h`

## Implementation Notes
- `SHIPPING` builds keep Town ESC mapped to `OutGameViewState::Exit`.
- Non-shipping builds map Town ESC to `SceneType::Intro`.
- Non-shipping Intro ESC creates `OutGameExitView`; while it is active, Intro Space/Enter scene progression is blocked.
- `OutGameMainView` also routes ESC through the same scene-level exit request so UI update order cannot bypass the build-type policy.

## Review Summary
- Existing unrelated dirty files were left untouched.
- AIWorkflow user guide update is not needed; this is game runtime behavior, not workflow behavior.

## Validation Summary
- `PlayGround.sln` `Debug|x64` build succeeded.
- `PlayGround.sln` `Shipping|x64` build succeeded.
- Runtime manual verification was not performed in this session.

## Remaining Risks
- Intro popup positioning uses the existing `OutGameExitView` layout and assets.
- Existing compiler warnings remain in the project and were not addressed.

## AI Assistance
- Codex implemented the scoped scene input changes and ran build validation.

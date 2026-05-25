# OutGame Attribute Currency Display

## Summary
- Added an always-visible dust currency display to the Attribute view.
- The display reads the current value from `UserProfile::GetCoinCount()`.

## Background
- The Attribute view previously exposed owned dust only through the debug overlay.
- The upgrade flow needs the owned currency to be visible during normal Attribute view usage.

## Scope
- Attribute view UI only.
- No JSON schema, save/load, skill view, or currency model changes.

## Files Changed
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.h`

## Implementation Notes
- Added a top-left anchored currency panel rendered by `OutGameAttributeView`.
- The panel uses the current `GAME_VIEW_RECT` and applied UI scale when calculating its screen rect.
- The panel rect is added to `AttributeNodeTree` input exclusions so dragging over the currency display does not pan the node tree.
- The display value is read at render time so node purchases can be reflected without recreating the view.

## Validation Summary
- `PlayGround/PlayGround.sln` `Debug|x64` build passed with 0 warnings and 0 errors.
- Runtime UI behavior was not manually verified in-game in this session.

## Remaining Risks
- Final visual placement should still be checked in fullscreen and non-1.0 UI scale modes.
- Debug overlay text may occupy nearby top-left space when debug mode is enabled.

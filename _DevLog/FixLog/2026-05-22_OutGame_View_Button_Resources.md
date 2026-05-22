# OutGame View Button And Page Resources

## Summary
- Applied the `SKILLS` and `ATTRIBUTES` button texture resources to the matching OutGame view navigation buttons.
- Applied `Skill,Node-page_blank.png` as the background page image for the OutGame Skill and Attribute views.

## Scope
- Updated only OutGame UI resource bindings.
- Did not change layout, interaction behavior, gameplay data, or JSON schemas.

## Files Changed
- `PlayGround/Project/Gameplay/UI/Views/OutGameSkillView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameSkillView.h`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.h`

## Implementation Notes
- `OutGameSkillView` now uses `UI/Buttons/ATTRIBUTES/*` for the Attributes navigation button.
- `OutGameAttributeView` now uses `UI/Buttons/SKILLS/*` for the Skills navigation button.
- Each button uses Default, MO, Push, and Disabled state images.
- Both views create a background `Image` first so the page texture renders behind buttons, grids, slots, and attribute nodes.
- The background is stretched to `GAME_VIEW_RECT` and refreshed on viewport/layout updates.

## Validation Summary
- Confirmed all referenced image files exist.
- Confirmed `Skill,Node-page_blank.png` exists.
- `PlayGround.vcxproj /t:ClCompile Debug|x64` completed with 16 existing conversion warnings and 0 errors after the button resource change.
- `PlayGround.vcxproj /t:ClCompile Debug|x64` completed with 0 warnings and 0 errors for `OutGameScene.cpp`, `OutGameAttributeView.cpp`, and `OutGameSkillView.cpp` after the page background change.
- Runtime visual validation was not performed in this session.

## Remaining Risks
- Manual runtime check is still needed to confirm the image dimensions fit the existing `COMMON_BUTTON_SIZE` in OutGame Skill and Attribute views.
- Manual runtime check is still needed to confirm the page background does not visually conflict with the skill grid, equipped slots, and attribute tree.

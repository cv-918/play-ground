# OutGame Navigation Button Position

## Summary
- Adjusted Skill and Attribute view navigation button placement.
- The view switch button and `RETURN` button now share the same right-bottom menu anchor across both views.

## Scope
- Changed only OutGame Skill/Attribute view button layout constants.
- Did not change button behavior, UI resources, gameplay data, or input rules.

## Files Changed
- `PlayGround/Project/Gameplay/UI/Views/OutGameSkillView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.cpp`

## Implementation Notes
- Replaced the previous `60px` right/bottom edge placement with a slightly more inset anchor.
- New layout constants:
  - Right padding: `92px`
  - Bottom padding: `88px`
  - Vertical button gap: `22px`
- Both views use the same constants so switching views keeps the navigation group stable.

## Validation Summary
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:ClCompile` passed.
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:Build` passed.
- Runtime visual confirmation was based on the user-provided screenshot only; final in-game check is still recommended.

## Remaining Risks
- If future page art changes the safe visual area, the anchor constants may need another small tuning pass.

# OutGame Tooltip Popup Background

## Summary
- Applied `Data/Resources/Textures/UI/PopUps/Default.png` as the background for outgame skill and attribute hover popups.

## Scope
- Updated only the hover tooltip widgets used by the skill and attribute views.
- Did not change tooltip text content, hover detection, layout ownership, or gameplay data.

## Files Changed
- `PlayGround/Project/Gameplay/UI/Widgets/OutGameSkillToolTip.cpp`
- `PlayGround/Project/Gameplay/UI/Widgets/OutGameSkillToolTip.h`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.cpp`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.h`

## Implementation Notes
- Each tooltip now caches `Path::PopUps + L"Default.png"` as a `TextureResource`.
- The popup texture is drawn before text when available.
- Tooltip rectangles now derive their height from the `Default.png` aspect ratio to avoid stretching the popup art.
- If the texture fails to load, the previous white rectangle and dark border fallback still renders.

## Validation Summary
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:ClCompile` passed.
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:Build` passed.
- Runtime visual confirmation was not performed in this log.

## Remaining Risks
- Runtime visual confirmation was not performed, so final text fit and hover placement should still be checked in-game.

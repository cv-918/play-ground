# 2026-06-12 StageProgress Key Prompt Fix

## Summary
- Changed keyboard-based `StageProgress` default bindings from `F` to `Space`.
- Changed the next-stage blinking prompt to read the current `StageProgress` primary binding instead of using hardcoded `스페이스바` text.

## Files Changed
- `PlayGround/Project/EngineSystems/Input/InputManager.cpp`
- `PlayGround/Project/Gameplay/UI/Views/InGamePlayView.cpp`

## Behavior
- `KeyboardA`, `KeyboardB`, and `KeyboardMouse` presets now default `StageProgress` to `VK_SPACE`.
- `MouseOnly` keeps its existing mouse-button `StageProgress` binding.
- The next-stage prompt now displays `<current StageProgress binding>를 누르세요`.

## Validation
- Source-anchor smoke passed for StageProgress default bindings and dynamic prompt path.
- Debug x64 MSBuild passed.
- `git diff --check` passed.

## Runtime Notes
- Manual runtime check should confirm the next-stage prompt text after any preset/remap changes.

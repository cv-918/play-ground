# GameObject Debug Render Label Quieting

## Summary

Quieted default `GameObjectBase` debug text rendering so object names and descriptions are not drawn over the gameplay view by default.

## Background

The working tree contained a small debug-render cleanup in `GameObjectBase.cpp`. This log records it as a separate commit boundary so it does not get mixed into gameplay or workflow changes.

## Scope

- `PlayGround/Project/Gameplay/Actors/GameObjectBase.cpp`

## Implementation Notes

- Commented out the default object name draw call in `DebugRender`.
- Commented out the optional object description draw block.
- Kept the debug forward-direction line rendering under `_GameState.debug_mode_`.
- Included minor formatting cleanup already present in the working tree.

## Validation Summary

No new build or runtime validation was run during the workbench cleanup commit pass.

## Remaining Risks

- Runtime debug overlay behavior should be checked manually if object name/description labels are needed again.

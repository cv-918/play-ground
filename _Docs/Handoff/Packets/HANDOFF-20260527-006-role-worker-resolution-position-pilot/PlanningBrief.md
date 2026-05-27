# Planning Brief: Resolution Character Field Position

## Summary

When the game resolution or window size changes, the character should remain at the same field/world position.

The observed concern is that the character may appear to move to a different field-relative position after a resolution change.

## Korean Summary

해상도나 창 크기를 변경했을 때 캐릭터가 필드/world 기준 같은 위치에 남아 있어야 한다.

현재 우려는 해상도 변경 후 캐릭터가 필드 기준으로 다른 위치에 있는 것처럼 보이는 현상이다.

## User-Facing Intent

Changing resolution should affect the view, viewport, camera, or projection, not the character's actual field position.

## Pilot Boundary

This Packet is used only as a Role Worker automation Bundle 2 document-only pilot.

It does not approve implementation.

## Non-Goals

- Do not edit game source in this pilot.
- Do not inspect or edit gameplay JSON.
- Do not change runtime behavior.
- Do not run build or tests.
- Do not change camera, viewport, actor, scene, or lifecycle code.
- Do not commit or push from automation.

## Future Implementation Note

A real fix likely requires investigation around screen size changes, camera/view transforms, spawn or reset position logic, and character world position preservation.

That work should be handled as a separate approved Developer execution scope.

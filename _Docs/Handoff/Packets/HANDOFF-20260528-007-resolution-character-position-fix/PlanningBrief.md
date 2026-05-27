# Planning Brief: Resolution Change Character Field Position Fix

## Summary

When the outgame resolution changes, the character should remain at the same field-relative position. The viewport, background, nav mesh, and camera may resize, but the character should not appear to shift to a different place on the field.

## Korean Summary

아웃게임에서 해상도를 바꿨을 때 캐릭터가 필드 기준으로 같은 위치에 남아 있어야 한다.

화면 크기, 배경, 네비메시, 카메라가 새 해상도에 맞게 갱신되더라도, 캐릭터만 기존 절대 좌표에 남아서 필드 안의 다른 위치로 밀려 보이면 안 된다.

## User-Facing Intent

Resolution changes should affect how the field is viewed and sized, not where the character is located within that field.

## Scope

This is a Developer implementation task handled by this Codex chat. There is no separate Developer role automation yet.

The implementation scope is limited to preserving the outgame player character's field-relative position during the existing viewport-change handling flow.

## Non-Goals

- Do not create Developer role automation.
- Do not change JSON schema.
- Do not change save/load behavior.
- Do not change assets.
- Do not change build settings.
- Do not rewrite camera, background, movement, or scene architecture.

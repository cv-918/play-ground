# QA Request: Resolution Change Character Field Position Fix

## Status

Ready for user/manual QA.

## What Changed

The outgame viewport-change flow now preserves the town player character's normalized field position when the background/nav mesh is rebuilt after a resolution change.

## Korean Summary

아웃게임에서 해상도를 바꿨을 때, 배경과 네비메시가 새 크기로 갱신되더라도 타운 플레이어가 필드 기준 같은 위치에 남는지 확인한다.

## QA Steps

1. Enter the outgame/town scene.
2. Move the character to a recognizable field position.
3. Open the option view and change resolution.
4. Return to the town view.
5. Confirm the character remains at the same field-relative position.
6. Move the character after the resolution change and confirm normal movement still works.

## Expected Result

- The character should not jump to a different field-relative location.
- NPC placement should remain normal.
- Camera follow should remain normal.
- Town movement should remain normal.

## Notes

This QA request does not require checking source code, JSON, assets, build settings, or automation behavior.

# Implementation Request: Resolution Character Field Position

## Purpose

This request describes a future implementation candidate, but this Packet is only a Role Worker document-only pilot.

## Desired Behavior

When resolution changes:

- the view or camera may resize
- UI may relayout
- the character should remain at the same field/world position

The character should not shift to a different field-relative position just because the resolution changed.

## Korean Summary

해상도 변경 시 화면이나 카메라, UI는 재계산될 수 있지만 캐릭터의 필드/world 기준 위치는 유지되어야 한다.

이번 Packet은 실제 구현 요청이 아니라 Role Worker 자동화 Bundle 2의 문서-only 파일럿이다.

## Implementation Status

Not approved for implementation in this Packet.

## Required Future Scope

A future Developer execution scope should define:

- which character or player object is affected
- whether the issue is world-position, camera-position, viewport, spawn/reset, or UI-coordinate related
- expected behavior before and after resolution changes
- allowed source files or systems
- validation method

## Forbidden In This Pilot

- Source edits
- Runtime behavior changes
- Camera or viewport changes
- Actor or scene lifecycle changes
- JSON/schema/save-load changes
- Asset changes
- Build/test execution
- Commit or push

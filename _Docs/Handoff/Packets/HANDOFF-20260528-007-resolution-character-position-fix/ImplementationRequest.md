# Implementation Request: Preserve Outgame Character Position On Resolution Change

## Target Role

Developer

## Current Reality

There is no automated Developer worker yet. This implementation is performed by the current Codex chat acting as the Developer role.

## Required Change

When `OutGameScene` detects a video settings revision change and rebuilds the viewport-dependent background/nav mesh state, preserve the town player character's relative position inside the field.

## Expected Behavior

- Before the viewport/nav mesh is resized, read the player's current position relative to the old nav mesh.
- After the background/nav mesh is resized, place the player at the same normalized field position in the new nav mesh.
- Keep the player's `z` value.
- Keep existing NPC placement behavior.
- Keep existing camera follow behavior.

## Korean Summary

`OutGameScene`에서 해상도 변경을 감지해 배경과 네비메시를 새 크기로 갱신할 때, 타운 플레이어의 필드 안 상대 위치를 보존한다.

기존 필드에서 몇 퍼센트 지점에 있었는지를 계산한 뒤, 새 필드에서도 같은 비율 위치로 옮긴다.

## Allowed Files

- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.h`
- `_Docs/Handoff/Packets/HANDOFF-20260528-007-resolution-character-position-fix/`
- `_DevLog/FixLog/`

## Non-Goals

- No JSON changes.
- No save/load changes.
- No asset changes.
- No build setting changes.
- No role-worker automation changes.
- No Developer automation creation.

## Validation Plan

- Build the PlayGround project if the local toolchain is available.
- Manual QA should change resolution in the outgame option view and confirm the character remains at the same field-relative location.
- Manual QA should confirm town movement still works after the resolution change.

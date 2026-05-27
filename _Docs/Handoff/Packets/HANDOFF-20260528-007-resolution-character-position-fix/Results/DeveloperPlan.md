# Developer Plan: Resolution Change Character Field Position Fix

## Approval Status

Approved by the user in chat on 2026-05-28.

## Execution Model

This is not being handed to a separate automated Developer worker. No such worker exists yet.

The current Codex chat is acting as the Developer role and will leave Handoff records for traceability.

## Proposed Implementation

Update `OutGameScene::_HandleViewportChanged()` so it preserves the town player character's normalized position inside the old nav mesh before resizing the background/nav mesh, then restores that normalized field position in the new nav mesh.

## Files Expected To Change

- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.h`
- `_Docs/Handoff/Packets/HANDOFF-20260528-007-resolution-character-position-fix/`
- `_DevLog/FixLog/`

## Explicit Non-Goals

- Do not edit JSON.
- Do not edit assets.
- Do not change save/load.
- Do not change build settings.
- Do not create Developer automation.
- Do not rewrite the camera or movement system.

## Validation

- Build if possible.
- User/manual QA should verify outgame resolution switching and movement after switching.

# Resolution Character Field Position Fix

## Summary

Fixed the outgame viewport-change path so the town player character keeps the same field-relative position after resolution changes.

## Background

The Handoff Role Worker Bundle 2 pilot identified a real Developer task: when resolution changes, the character should remain at the same place in the field instead of drifting to another field-relative position.

## Scope

Approved scope:

- Preserve character field-relative position during outgame resolution changes.
- Keep changes limited to outgame viewport handling and Handoff/FixLog documentation.

Out of scope:

- JSON schema changes.
- Save/load changes.
- Asset changes.
- Build setting changes.
- Developer automation creation.
- Camera, movement, or scene architecture rewrites.

## Files Changed

- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `_Docs/Handoff/Packets/HANDOFF-20260528-007-resolution-character-position-fix/`
- `_DevLog/FixLog/2026-05-28_Resolution_Character_Field_Position_Fix.md`

## Implementation Notes

`OutGameScene::_HandleViewportChanged()` now captures the town player's normalized position within the old background nav mesh before calling `Background::UpdateViewport()`.

After the background rebuilds its nav mesh for the new resolution, the scene restores the player to the same normalized field position and then reapplies the updated nav mesh to the player movement component.

This keeps the existing viewport-change flow intact and avoids changing JSON, save/load, assets, build settings, camera architecture, or movement architecture.

## Review Summary

Self-review checked that the implementation:

- Stays inside `OutGameScene.cpp`.
- Does not modify schema, save/load, assets, or build settings.
- Preserves existing NPC placement refresh behavior.
- Preserves existing camera follow refresh behavior.
- Does not introduce Developer automation.

## Validation Summary

Command:

```text
MSBuild.exe PlayGround/PlayGround.sln /t:Build /p:Configuration=Debug /p:Platform=x64 /m
```

Result:

```text
Passed. 0 warnings, 0 errors.
```

Manual runtime QA was completed by the user on 2026-05-28.

Result:

```text
Passed. The character stayed at the same field-relative position after changing resolution, and town movement still worked.
```

Additional Handoff check:

```text
powershell -ExecutionPolicy Bypass -File tools/aiworkflow/handoff_supervisor.ps1 -Command scan -RepoRoot C:\Users\kalux\workStation\play-ground
```

Result:

```text
0 consistency issues, 0 scope drift issues.
```

## Remaining Risks

- None recorded after human QA pass.

## AI Assistance

Implemented by Codex acting as the Developer role. No separate Developer role automation exists yet.

# Developer Result: Resolution Change Character Field Position Fix

## Summary

Implemented the approved Developer fix in `OutGameScene::_HandleViewportChanged()`.

Before resizing the viewport-dependent background/nav mesh, the scene now captures the town player's normalized position inside the old field. After the new nav mesh is created, the scene restores the player to the same normalized field position and reapplies the updated nav mesh.

## Korean Summary

`OutGameScene::_HandleViewportChanged()`에서 해상도 변경 전 플레이어의 필드 안 상대 위치를 저장하고, 새 네비메시가 만들어진 뒤 같은 상대 위치로 복원하도록 수정했다.

## Files Changed

- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `_Docs/Handoff/Packets/HANDOFF-20260528-007-resolution-character-position-fix/`
- `_DevLog/FixLog/2026-05-28_Resolution_Character_Field_Position_Fix.md`

## Validation

- `MSBuild.exe PlayGround/PlayGround.sln /t:Build /p:Configuration=Debug /p:Platform=x64 /m`
- Result: Passed with 0 warnings and 0 errors.
- `tools/aiworkflow/handoff_supervisor.ps1 -Command scan`
- Result: 0 consistency issues and 0 scope drift issues.

## Manual QA Needed

Completed by the user on 2026-05-28:

- Outgame resolution changes preserve the character's field-relative position.
- Town movement still works after changing resolution.

## Remaining Risks

- None recorded after human QA pass.

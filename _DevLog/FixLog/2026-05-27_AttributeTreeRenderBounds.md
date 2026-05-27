# Attribute Tree Render Bounds

## Summary

Limited the out-game attribute tree rendering area so tree nodes and connection lines stay inside an approximate dark gray board panel.

## Korean Summary

아웃게임 어트리뷰트 화면에서 트리 노드와 연결선이 짙은 회색 보드 영역 밖으로 보이지 않도록 렌더 영역 제한을 추가했다.

## Background

The user provided screenshots showing attribute tree nodes and lines spilling outside the intended board art, especially above the top edge and below the bottom edge.

The user approved Phase 21 pilot execution with this scope:

- Attribute tree and related classes only.
- No schema changes.
- No save/load changes.
- No lifecycle changes.
- No build setting changes.
- No commit or push.

## Files Changed

- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.h`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.h`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.cpp`
- `_Docs/Handoff/Packets/HANDOFF-20260527-005-attribute-tree-render-bounds/`

## Implementation Notes

`AttributeNodeTree` now stores a render region and clips only its tree content rendering with `IntersectClipRect`.

`OutGameAttributeView` calculates an approximate tree panel rectangle from the current game view size and passes it to `AttributeNodeTree`.

The clipping applies to:

- Attribute node buttons
- Attribute node labels
- Attribute connection lines

It does not change:

- Attribute data
- Attribute schema
- Save/load behavior
- Background resources
- Build settings

## Review Summary

Reviewed the diff for approved-scope compliance.

The change is limited to the attribute tree widget and the out-game attribute view that owns it.

## Validation Summary

Build command:

```bat
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m
```

Result:

- Build succeeded.
- Warnings: 0
- Errors: 0

Handoff Supervisor:

- Scope drift issues: 0
- Consistency issues: 0

Manual visual QA / acceptance:

- The user confirmed the implemented result in chat on 2026-05-27.
- The user approved committing the work.

## Remaining Risks

- The board rectangle is approximate because the background resource does not provide exact inner board coordinates.
- The board rectangle remains approximate because the background art does not expose exact inner board coordinates.

## Next Tasks

- Commit the completed Phase 21 pilot work.

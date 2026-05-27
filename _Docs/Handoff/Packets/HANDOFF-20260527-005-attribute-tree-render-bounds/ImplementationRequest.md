# Implementation Request: Attribute Tree Render Bounds

## Goal

Limit attribute tree rendering so nodes and connection lines do not visibly draw outside the dark gray board area on the out-game attribute screen.

## Korean Summary

어트리뷰트 트리의 렌더링을 보드 영역 안으로 제한한다. 배경 리소스의 정확한 좌표를 알 수 없으므로, 현재 화면 크기 기준의 근사 영역을 사용해도 된다.

## Approved Files

- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.h`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.cpp`
- `PlayGround/Project/Gameplay/UI/Views/OutGameAttributeView.h`
- `_Docs/Handoff/Packets/HANDOFF-20260527-005-attribute-tree-render-bounds/`
- `_DevLog/FixLog/`

## Implementation Direction

- Add an explicit render-bound rectangle for `AttributeNodeTree`.
- Let `OutGameAttributeView` provide an approximate board rectangle derived from the current game view size.
- Clip the tree's connection-line and node rendering to that rectangle.
- Keep tooltips and unrelated UI outside the clipping scope unless the implementation naturally requires otherwise.

## Do Not Change

- `PlayGround/Data/AttributeNode.json`
- JSON schemas
- Save/load behavior
- Actor or scene lifecycle
- Build settings
- Background resources or other assets
- Git commit or push state

## Validation

- Inspect the source diff for approved-scope compliance.
- Run the existing build if available.
- Ask QA to visually confirm that the tree no longer renders outside the dark gray board area.

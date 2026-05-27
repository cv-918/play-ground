# Planning Brief: Attribute Tree Render Bounds

## Summary

The attribute tree should not visually spill outside the dark gray board area on the out-game attribute screen.

Current visible issue:

- Attribute nodes and connection lines can appear above or below the dark gray board area.
- The screenshots show upper nodes such as `105` / `505` and lower nodes such as `304` / `305` outside the intended board area.

Desired behavior:

- Attribute tree nodes and connection lines should render only inside the dark gray board area.
- Exact pixel matching to the background art is not required.
- The implementation should approximate the panel bounds from the current view size and keep the tree content inside those bounds.

## Korean Summary

어트리뷰트 트리의 노드와 연결선이 배경 리소스의 짙은 회색 보드 영역 밖으로 보이지 않도록 제한한다.

보드 영역의 정확한 좌표는 리소스에서 따로 제공되지 않으므로 완전한 픽셀 일치는 목표가 아니다. 핵심은 트리 내용이 화면 위/아래로 리소스 바깥까지 삐져나오는 현상을 막는 것이다.

## Approved Execution Scope

The user approved Phase 21 pilot execution with this boundary:

- Scope is limited to the attribute tree and related classes.
- Schema changes are excluded.
- Save/load changes are excluded.
- Lifecycle changes are excluded.
- Build setting changes are excluded.
- Commit and push are excluded.

## User-Facing Intent

The attribute growth tree should feel like it belongs inside the board UI instead of floating beyond the intended art frame.

## Non-Goals

- Do not redesign the full attribute tree layout.
- Do not change `AttributeNode.json`.
- Do not change schema or save/load behavior.
- Do not edit background art or other assets.
- Do not change build settings.
- Do not commit or push as part of this Phase 21 pilot.

## Validation Target

- Build the project if available without changing build settings.
- Manually inspect the out-game attribute view.
- Confirm nodes and connection lines do not visibly render outside the dark gray board area.

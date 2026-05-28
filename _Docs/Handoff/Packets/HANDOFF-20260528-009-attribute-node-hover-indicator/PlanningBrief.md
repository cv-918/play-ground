# Planning Brief: Attribute Node Hover Indicator UI Pilot

## Summary

Improve the Attribute Node Tree so the currently hovered node is easier to identify.

This is the first Phase 31A implementation-mode pilot for the Developer Worker automation.

## Korean Summary

어트리뷰트 트리에서 마우스를 올린 노드를 더 쉽게 알아볼 수 있도록 작은 UI 표시를 추가한다.

이 작업은 Developer Worker implementation-mode 자동화가 승인 범위 안에서 실제 소스 수정을 수행할 수 있는지 확인하는 첫 Phase 31A 파일럿이다.

## User-Facing Change

When the user moves the mouse over an Attribute Tree node, that node should have a clearer visual hover/focus indicator.

The change should make the node easier to identify without changing node behavior or data.

## Scope

Allowed implementation area:

```text
PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp
```

## Non-Goals

- Do not change AttributeNode JSON or schema.
- Do not change node progression, state, level-up, or level-down behavior.
- Do not change shared Button behavior.
- Do not add new assets.
- Do not change save/load, lifecycle, build settings, commit, or push.

## Acceptance Criteria

- Hovered node is visually clearer than before.
- Existing node tooltip behavior still works.
- Existing node left-click and right-click behavior still works.
- Existing panning behavior still works.
- The implementation stays inside the approved file.

## Validation

Automated:

- `git status --short`
- `git diff --name-only`
- `git diff --check`

Manual QA:

- Open the Attribute Tree UI.
- Hover several visible nodes.
- Confirm the hovered node has a clear visual indicator.
- Confirm click/level-up and right-click/level-down still work.
- Confirm panning does not accidentally select nodes.

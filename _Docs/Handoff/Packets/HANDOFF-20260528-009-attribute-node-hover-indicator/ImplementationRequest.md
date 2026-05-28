# Implementation Request: Attribute Node Hover Indicator UI Pilot

## Target Role

Developer

## Task

Add a small, readable hover/focus indicator for the currently hovered Attribute Tree node.

This should be a UI-only improvement inside `AttributeNodeTree.cpp`.

## Korean Summary

현재 마우스가 올라간 어트리뷰트 노드를 더 잘 보이게 하는 작은 UI 표시를 추가한다.

작업은 `AttributeNodeTree.cpp` 안에서만 진행한다.

## Approved Source Scope

Allowed file:

```text
PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp
```

Do not edit any other source file unless a scope change is requested and approved.

## Suggested Implementation Direction

The current tree already tracks `mouse_overed_node_`.

A narrow implementation may:

- draw a subtle outline or highlight around `mouse_overed_node_`
- keep the highlight inside existing render clipping behavior
- render the highlight after nodes so it is visible
- avoid modifying the shared `Button` class

The implementation does not need a new selected-node system.

## Protected Areas

Do not change:

- AttributeNode JSON or schema
- AttributeNode data loading
- UserProfile node progression
- level-up or level-down behavior
- shared Button behavior
- assets
- scene, actor, component, or tree lifecycle
- build settings

## Validation

Allowed automated checks:

```text
git status --short
git diff --name-only
git diff --check
```

Manual QA needed after implementation:

- Open the Attribute Tree UI.
- Hover nodes and confirm the hovered node has a clearer visual indicator.
- Confirm tooltip still appears on hover.
- Confirm left-click and right-click node interactions still work.
- Confirm panning still suppresses node interaction while dragging.

## Expected Outputs

The Developer Worker should write:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/<timestamp>_DeveloperWorkerImplementation.md
_Docs/Handoff/Packets/HANDOFF-20260528-009-attribute-node-hover-indicator/Results/DeveloperResult.md
_DevLog/FixLog/<date>_Attribute_Node_Hover_Indicator.md
```

If the worker cannot stay inside the approved scope, it should write:

```text
_Docs/Handoff/Packets/HANDOFF-20260528-009-attribute-node-hover-indicator/Results/DeveloperScopeChangeRequest.md
```

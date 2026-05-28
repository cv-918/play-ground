# Planning Brief: Attribute Node Tooltip Bounds

## Summary

Keep the Attribute Node tooltip visible when hovering nodes near the edge of the Attribute Tree screen or board area.

## User-Facing Change

When the player hovers an Attribute Tree node near an edge, the tooltip should reposition or clamp so it does not visibly spill outside the usable view.

## Scope

In scope:

- Attribute Node tooltip positioning.
- A small clamp region or positioning helper for `AttributeNodeToolTip`.
- Minimal `AttributeNodeTree.cpp` wiring if the tooltip needs the tree render region.

Out of scope:

- Attribute Node data or JSON.
- Tooltip text/content redesign.
- Shared UI/Button behavior.
- Save/load behavior.
- Scene, actor, component, or tree lifecycle changes.
- Assets or background resources.
- Build setting changes.
- Commit or push.

## Approved Files

- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.cpp`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.h`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp`

## Validation

- Run `git status --short`.
- Run `git diff --name-only`.
- Run `git diff --check` for changed files.
- Run Release x64 MSBuild:
  `C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe PlayGround\PlayGround.sln /t:Build /p:Configuration=Release /p:Platform=x64 /m`
- If the approved build fails because of an in-scope cause, fix it inside the approved files and rerun.
- Human QA should hover nodes near screen or board edges and confirm the tooltip remains visible.

## Approval

The user approved this pilot task in chat on 2026-05-28.

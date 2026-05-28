# Implementation Request: Attribute Node Tooltip Bounds

## Handoff

Handoff ID: HANDOFF-20260528-010-attribute-tooltip-bounds
Title: Attribute Node Tooltip Bounds

## Goal

Adjust the Attribute Node tooltip positioning so the tooltip remains inside the usable screen or Attribute Tree board area as much as practical when hovering nodes near an edge.

## Required Behavior

- Tooltip should still follow the hovered node or mouse with a small offset.
- If the tooltip would exceed the visible/clamp area, reposition it back inside that area.
- The solution should be small and local to Attribute Node tooltip behavior.

## Approved Scope

Allowed source files:

- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.cpp`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.h`
- `PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeTree.cpp`

## Non-Goals

- Do not change Attribute Node JSON or schema.
- Do not change progression, level-up, or stat behavior.
- Do not redesign tooltip content.
- Do not modify shared UI/Button systems.
- Do not add or replace assets.
- Do not change save/load behavior.
- Do not change scene, actor, component, or tree lifecycle.
- Do not change build settings.
- Do not commit or push.

## Validation Required

- Run `git status --short` before editing.
- Run `git diff --name-only` after editing.
- Run `git diff --check` for changed files.
- Run Release x64 MSBuild:
  `C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe PlayGround\PlayGround.sln /t:Build /p:Configuration=Release /p:Platform=x64 /m`
- If an approved build failure is caused by an in-scope edit, diagnose it, fix it inside approved files, and rerun the same command.

## Expected Output

- `Results/DeveloperResult.md`
- One DevLog under `_DevLog/FixLog/` or `_DevLog/WorkLog/`
- One timestamped Developer Worker implementation run report under `_Docs/Handoff/Role_Workers/Automation/Runs/`

## Human QA

After implementation, the human developer should hover Attribute Tree nodes near screen or board edges and confirm:

- tooltip stays visible
- hover still works
- left-click still works
- right-click still works
- panning still works

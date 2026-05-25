# Attribute Node Tree Redesign Handoff

## Summary

Prepared a programmer handoff package for a new Dustland attribute node tree named `먼지자리 성도`.

## Background

The requested work was to analyze the current genre direction and attribute system, ignore the existing attribute tree, and design a new tree suitable for programmer handoff.

## Scope

- Reviewed the current game design overview.
- Reviewed current attribute node JSON fields and runtime enum support.
- Designed a new replacement tree without changing the JSON schema.
- Created a handoff document and a JSON draft under `_Docs/GameDesign/`.

## Files Changed

- `_Docs/GameDesign/AttributeNodeTree_Redesign_Handoff_KR.md`
- `_Docs/GameDesign/AttributeNode_Redesign_Draft.json`
- `_DevLog/WorkLog/2026-05-23_AttributeNodeTree_Redesign_Handoff.md`

## Architecture Notes

The draft preserves the current `AttributeNodeJsonInfo` schema and uses only currently available enum categories.

The tree uses five branches:

- Attack and attack range
- HP
- Move speed and attack range
- Collection range and runtime
- Runtime and HP

## Implementation Notes

No game source file was changed.

No live data file under `PlayGround/Data/` was changed.

The JSON draft is intended as a replacement candidate for `PlayGround/Data/AttributeNode.json` after programmer review.

## Review Summary

Current investigation indicates that `MoveSpeed` exists in the attribute enum and stat accumulator, but may not be applied to player movement initialization yet.

The handoff document includes a specific note for `PlayerMovement` / `StagePlayer` review.

## Validation Summary

JSON syntax validation should be run after file creation.

No build or runtime validation was performed in this planning step.

## Remaining Risks

- Balance values are first-pass design numbers and require playtesting.
- Attribute tree UI layout may need adjustment if branch directions overlap visually.
- `MoveSpeed` nodes will not have player-facing effect until the runtime application path is confirmed or implemented.

## Next Tasks

- Validate the JSON draft parses correctly.
- Programmer reviews `MoveSpeed` application path.
- If approved, replace `PlayGround/Data/AttributeNode.json` with the draft and run UI/runtime validation.

## AI Assistance

Codex assisted with repository inspection, design synthesis, handoff document creation, and JSON draft preparation.

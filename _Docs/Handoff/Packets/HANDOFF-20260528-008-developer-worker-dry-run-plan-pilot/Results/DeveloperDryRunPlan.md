# Developer Dry-Run Plan

## Handoff

Handoff ID: HANDOFF-20260528-008-developer-worker-dry-run-plan-pilot
Title: Developer Worker Dry-Run Plan Creation Pilot

## Scope Status

Approved execution scope: Approved. Dry-run planning only for follow-up review of outgame resolution-change character position preservation.
Allowed paths:
- PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp
- PlayGround/Project/Gameplay/World/Background.cpp
- PlayGround/Project/Gameplay/World/Background.h
Forbidden paths:
- PlayGround/Data/
- PlayGround/Project/**/*.json
- PlayGround/Project/**/*.vcxproj
- PlayGround/Project/**/*.vcxproj.filters
- _Local/
- _Temp/
- .env
- node_modules/
Non-goals:
- No source edits in this dry run.
- No JSON or schema edits.
- No save/load behavior changes.
- No asset edits.
- No build or test execution.
- No Packet status, manifest, approval evidence, commit, or push changes.

## Understanding

- `OutGameScene::_HandleViewportChanged()` captures the player position relative to the current nav mesh, resizes the background/nav mesh through `Background::UpdateViewport()`, reapplies the normalized player position, reapplies nav-mesh-backed NPC placement, and reinitializes camera bounds and tracked UI viewport updates.
- `Background::UpdateViewport()` currently updates nav mesh size, center, render destination rect, and the cached nav mesh rectangle without touching asset data or unrelated runtime systems.
- The inspected code already appears to implement the main resolution-change preservation behavior requested by the prior fix. Any future implementation should therefore be treated as optional hardening or cleanup, not as a missing core fix.

## Proposed Implementation

- Re-verify whether `OutGameScene::_HandleViewportChanged()` needs additional guards for partially initialized scene state, especially if viewport changes can occur before `background_`, `test_town_player_`, or spawned NPC state is fully ready.
- If hardening is approved later, keep the change centered in `OutGameScene.cpp` by making the viewport-change sequence more explicit and easier to reason about, while preserving the existing separation between background resize, gameplay actor repositioning, NPC placement, camera refresh, and UI viewport notifications.
- Touch `Background.cpp` or `Background.h` only if implementation approval reveals a concrete need to clarify the viewport-update contract. Based on this dry run, no such change is clearly required yet.
- Prefer no-op conclusion if manual validation shows the current implementation is already stable across resolution changes.

## Expected Files To Change

- PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp
- Possibly no other file.
- `PlayGround/Project/Gameplay/World/Background.cpp` only if later-approved hardening requires a clearer resize contract.
- `PlayGround/Project/Gameplay/World/Background.h` only if a signature or contract comment change becomes necessary.

## Expected Validation

- Manual resolution-change test in OutGameScene with the player positioned away from the center before the change.
- Confirm player field-relative position remains stable after viewport resize.
- Confirm NPC placements remain aligned to the resized nav mesh.
- Confirm camera bounds and follow behavior still clamp correctly after the resize.
- Confirm visible UI views still receive `OnViewportChanged()` behavior without regression.

## Stop Conditions For Implementation Mode

- Required changes extend outside the approved allowed paths.
- The work needs JSON/schema, save/load, lifecycle, asset, build-setting, commit, or push changes not already approved.
- Existing local changes make any approved target file unsafe to edit.
- Manual review shows the current implementation is already sufficient and no narrow hardening change can be justified.
- Validation would require commands or evidence outside the later-approved implementation scope.

## Not Performed In Dry Run

- No source edits.
- No JSON edits.
- No asset edits.
- No build/test execution.
- No status changes.
- No commit or push.

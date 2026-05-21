# 2026-05-20 CharacterStation Resource Seq UI

## Summary

Improved the CharacterStation resource sequence picker so animation resource candidates remain accessible when many clips exist under the character texture folder.

## Background

`Dust_hit_001.png` matched the Resource Seq filename rules, but the old UI exposed only the first few combo-box options and had no search or paging. After rebuilding, the resource was copied into the runtime `Data` folder correctly, so the remaining issue was UI access to large candidate sets.

## Scope

- Replace the Resource Seq combo flow with a searchable selectable list.
- Add `Res Filter` text input.
- Add `Current Only` filtering for the selected character.
- Add resource page controls with `Prev Res` and `Next Res`.
- Keep explicit `Apply Res` behavior so selecting a list item does not immediately modify the current clip.
- Add richer labels with path tail, prefix, frame range, single-frame marker, missing count, and current-clip marker.
- Update the CharacterStation user guide to describe the new resource selection flow.

## Files Changed

- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.h`
- `_Docs/Systems/Guide/CharacterStation_User_Guide_KR.html`
- `_DevLog/WorkLog/2026-05-20_CharacterStation_ResourceSeq_UI.md`

## Review Summary

- Reviewed the Resource Seq selection flow for accidental auto-apply behavior.
- The picker now supports all scanned candidates through filter and page navigation instead of relying on the first visible combo options.
- No AIWorkflow user guide update is needed. This task changes game debug tooling and its user guide, not AIWorkflow commands, approvals, runner routing, completion steps, or user intervention points.

## Validation Summary

- `MSBuild.exe PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m`
  - Result: passed, 0 warnings, 0 errors.
- `MSBuild.exe PlayGround/PlayGround.sln /p:Configuration=Shipping /p:Platform=x64 /m`
  - Result: passed, 0 warnings, 0 errors.
- `git diff --check` for the scoped tracked source files
  - Result: passed. Git reported expected LF-to-CRLF working-copy normalization warnings only.
- Confirmed `Dust_hit_001.png` exists in `PlayGround/_Bin/Debug/x64/Data/...` after the build post-build copy.
- Confirmed the runtime Debug Data folder Resource Seq-style scan finds `Dust_hit_ [1-1, count=1]`.

Manual in-game UI validation was not performed in this pass.

## Remaining Risks

- The DebugAssistant selectable list still does not have native scrolling; Resource Seq accessibility is handled through filter and page buttons in CharacterStation.
- The list is visually denser than the old combo box and should be checked in the live scene once.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were created or modified by this work.

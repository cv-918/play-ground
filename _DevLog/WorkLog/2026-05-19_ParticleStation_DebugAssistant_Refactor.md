# 2026-05-19 ParticleStation DebugAssistant Refactor

## Summary

Refactored `ParticleStationScene` from a keyboard/manual draw editor into a DebugAssistant-based particle event-set editor.

## Background

After the initial `ParticleEventSet` station existed, the desired direction was to reuse `EngineSystems/Debug` DebugAssistant windows for the event list and selected event variable controls. The implementation also added reusable DebugWindowElements needed for this and future debug tooling.

## Scope

- Add DebugAssistant UI elements for list, combo, sliders, text input, color editing, vector editing, section headers, dynamic text, and button rows.
- Add public DebugAssistant registration APIs for those elements.
- Refactor `ParticleStationScene` to use DebugAssistant windows instead of hand-rendered event/field lists.
- Keep particle data/model responsibilities unchanged.
- Update project files and particle-system documentation.

## Files Changed

- `.gitignore`
- `PlayGround/Project/EngineSystems/Debug/DebugAssistantHeader.h`
- `PlayGround/Project/EngineSystems/Debug/DWE_Controls.h`
- `PlayGround/Project/EngineSystems/Debug/DWE_Controls.cpp`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.h`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.cpp`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.cpp`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`
- `_Docs/Systems/ParticleSystem_Overview.md`
- `_Docs/Systems/ParticleSystem_Overview_KR.md`

## Architecture Notes

- Debug UI elements are state-binding controls. They hold getter/setter callbacks instead of direct long-lived pointers to particle fields.
- `ParticleStationScene` keeps station decision/state ownership and delegates UI rendering/input to DebugAssistant elements.
- `ParticleEventSet`, `ParticleEventSpec`, particle playback, and JSON schema were not changed in this refactor.
- `.gitignore` now explicitly unignores `PlayGround/Project/EngineSystems/Debug/*.cpp` and `*.h` because the existing build-output ignore rule also matched the source folder for new files.

## Implementation Notes

- `ParticleStation / EventSet` window provides set create/load/reload/save, set rename, event selection, add/remove, and preview buttons.
- `ParticleStation / Event` window provides selected event controls for name, playback type, particle source, texture, shape, easing, colors, delay, offset, burst count, lifetime, speed, scale, physics, and emitter playback.
- Scene-level keyboard shortcuts are reduced to `F5` reload, `F8` mouse preview, `Space` center preview, `F9` save, and `Esc` intro.
- Event preview enable/disable is scene-only state and is not persisted to `ParticleEventSet.json`.
- Debug windows are registered on scene enter and removed on scene exit to avoid stale callbacks.

## Review Summary

- Checked callback lifetime boundaries: scene removes its DebugAssistant windows in `OnExit`.
- Checked source folder ignore behavior and added a narrow `.gitignore` exception for new debug source files.
- Checked that the station refactor does not modify particle JSON schema.
- No critical or major review findings remain.

## Validation Summary

Commands run:

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m
git diff --check
Get-Content -Raw "PlayGround/Data/ParticleEventSet.json" | ConvertFrom-Json
Get-Content -Raw "PlayGround/Data/Particle.json" | ConvertFrom-Json
Get-Content -Raw "PlayGround/Data/ParticleEmitter.json" | ConvertFrom-Json
```

Results:

- MSBuild succeeded; the final incremental build reported 0 warnings and 0 errors.
- `git diff --check` passed with only line-ending normalization warnings.
- Particle JSON files parsed successfully with `ConvertFrom-Json`.
- Runtime manual validation was not performed because launching the game can touch `UserData.json`, which already has unrelated local changes.

## Remaining Risks

- Runtime UI interaction still needs manual in-game confirmation in the actual window.
- Combo boxes currently show a bounded option list; very large texture/source lists may need scrollable combo behavior later.
- `Esc` still exits the station scene, so text-field cancel via Escape is effectively superseded by scene exit.
- `EmitterShape::Box`, `shapeRadius` outside Circle emission, and `gravityScale` are currently not fully applied by the particle runtime.

## AIWorkflow User Guide Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` was needed. This task changed game debug tooling, not AIWorkflow commands, cards, approval behavior, runner profiles, finalization, commit/push, or workflow user intervention points.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were intentionally created or modified. MSBuild may have refreshed ignored build output under `PlayGround/_Bin` and `PlayGround/_Intermediate`.

## Next Tasks

- Manually validate the ParticleStation windows in-game.
- Add scrollable popup behavior to combo/list elements if texture or event counts become large.
- Consider a dedicated focus/shortcut ownership API in DebugAssistant before adding more text-heavy editor tools.

## AI Assistance

Implemented by Codex with repository analysis, bounded source edits, project file updates, documentation updates, local build validation, JSON parse validation, and diff hygiene checks.

# 2026-05-19 ParticleEventSet / ParticleStation

## Summary

Implemented the first complete `ParticleEventSet` workflow and replaced the debug-only `WorkStationScene` with `ParticleStationScene`.

## Background

The goal was to group multiple particle events into a reusable set, edit that set in a dedicated station scene, preview the current values, and save/load the set data as JSON.

## Scope

- Add `ParticleEventSet` data model and JSON file.
- Add JSON load/save support for event sets.
- Add runtime playback for ordered particle events.
- Replace `WorkStation` scene naming and entry point with `ParticleStation`.
- Provide reduced-scope keyboard-based editing in the station scene.

## Files Changed

- `PlayGround/Project/EngineSystems/Render/ParticleEventSetData.h`
- `PlayGround/Project/EngineSystems/Render/ParticleEventSetPlayer.h`
- `PlayGround/Project/EngineSystems/Render/ParticleEventSetPlayer.cpp`
- `PlayGround/Project/EngineSystems/Render/ParticleService.h`
- `PlayGround/Project/EngineSystems/Render/ParticleService.cpp`
- `PlayGround/Project/EngineSystems/Json/JsonDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleEventSetDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleEventSetDataManager.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayFunctions.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/SceneManager.cpp`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.h`
- `PlayGround/Project/Gameplay/Scenes/IntroScene.cpp`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.cpp`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`
- `PlayGround/Data/ParticleEventSet.json`
- `_Docs/Systems/ParticleSystem_Overview.md`
- `_Docs/Systems/ParticleSystem_Overview_KR.md`
- `_Docs/Systems/PlayGround_Runtime_Systems_Overview_KR.md`

Removed:

- `PlayGround/Project/Gameplay/Scenes/WorkStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/WorkStationScene.cpp`

## Architecture Notes

- Data: `ParticleEventSetData.h` defines `ParticleEventSet` and `ParticleEventSpec`.
- Loading/saving: `ParticleEventSetDataManager` owns JSON table persistence.
- Execution: `ParticleEventSetPlayer` schedules event delays and delegates burst/emitter playback to `ParticleService`.
- Scene/editor: `ParticleStationScene` owns editor input and visual status only.
- `ParticleService` now copies resolved emitter particle settings into active emitters, which supports inline event-set settings and avoids raw setting pointer lifetime coupling.

## Implementation Notes

- `ParticleEventSet.json` contains a default set id `3001` with two burst events.
- `ParticleStationScene` supports event add/remove, event selection, field selection, variable adjustment, particle source copy from `Particle.json`, burst/emitter toggle, preview, save, reload, and set cycling.
- `GameDataLoader` now loads `Data/ParticleEventSet.json`.
- `IntroScene` debug button now enters `ParticleStation`.

## Review Summary

- Checked that old `WorkStation` source/project references were removed.
- Checked scene enum/name routing for `ParticleStation`.
- Checked project file entries for new headers and sources.
- No critical or major issues found in local review.

## Validation Summary

Command run:

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m
```

Result:

- Build succeeded.
- 17 existing conversion warnings were reported in pre-existing files.
- No compile errors were reported.

Runtime manual validation was not performed because launching the game can trigger `UserData.json` save-on-exit behavior, and that file already had unrelated user changes before this task.

## Remaining Risks

- The station UI is keyboard-driven and intentionally reduced-scope; text editing for set/event names is not implemented yet.
- Event-set edits save inline particle settings and do not write back to `Particle.json`.
- `EmitterShape::Box` and `gravityScale` remain existing particle-system limitations.
- Runtime preview interaction still needs manual in-game confirmation.

## AIWorkflow User Guide Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` was needed. This task changed game particle tooling, not AIWorkflow commands, cards, approval behavior, runner profiles, finalization, commit/push, or workflow user intervention points.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were intentionally created or modified. MSBuild may have refreshed ignored build output under `PlayGround/_Bin` and `PlayGround/_Intermediate`.

## Next Tasks

- Add mouse/UI widgets for editing instead of keyboard-only controls.
- Add set creation/rename/delete controls.
- Add field controls for colors, texture path, easing, and gravity once desired.
- Run manual ParticleStation preview validation in the game window before committing.

## AI Assistance

Implemented by Codex with repository analysis, bounded source edits, project file updates, documentation update, and local build validation.

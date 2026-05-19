# 2026-05-19 Particle Runtime Variable Application

## Summary

Applied previously missing or limited particle runtime behavior and resolved the ParticleStation text-input shortcut conflict.

## Background

ParticleStation exposed all particle variables, but review found several runtime gaps: `gravityScale` was not applied, `EmitterShape::Box` had no runtime branch, `shapeRadius` had no Box behavior, and attached emitter `arcAngle` was not centered on owner direction. Space-based center preview could also trigger while editing text.

## Scope

- Prevent scene-level ParticleStation shortcuts while DebugAssistant text input owns keyboard focus.
- Apply `gravityScale` during particle update.
- Implement `EmitterShape::Box` without changing JSON schema.
- Reuse `shapeRadius` as Box half extent.
- Center attached emitter emission on owner `Forward2D`.
- Update documentation and review notes.

## Files Changed

- `PlayGround/Project/EngineSystems/Debug/DWE_Controls.h`
- `PlayGround/Project/EngineSystems/Debug/DWE_Controls.cpp`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.h`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.cpp`
- `PlayGround/Project/EngineSystems/Render/ParticleData.h`
- `PlayGround/Project/EngineSystems/Render/ParticleService.h`
- `PlayGround/Project/EngineSystems/Render/ParticleService.cpp`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.cpp`
- `_Docs/Systems/ParticleSystem_Overview.md`
- `_Docs/Systems/ParticleSystem_Overview_KR.md`

## Architecture Notes

- DebugAssistant now tracks a keyboard capture owner by pointer. Text input captures keyboard focus while editing and releases it on commit, cancel, focus loss, or destruction.
- Particle runtime behavior stayed inside `ParticleService`; scene/editor code only controls preview state.
- No `Particle.json` or `ParticleEventSet.json` schema fields were added.
- Box emission uses the existing `shapeRadius` field as a reduced-scope final-form behavior. Rectangular Box dimensions can be added later as an explicit schema change if needed.

## Implementation Notes

- `gravityScale` applies vertical acceleration with a pixel-space acceleration constant.
- `EmitterShape::Box` randomizes spawn position in `[-shapeRadius, +shapeRadius]` on both X and Y.
- Fixed-position burst/emitter playback still uses world +X as its direction basis because it has no owner direction.
- Attached emitters compute the direction basis from owner `Transform::Forward2D()`.
- ParticleStation ignores `Esc`, `F5`, `F8`, `F9`, and `Space` while DebugAssistant text input has keyboard capture.

## Review Summary

- Checked that new behavior does not require JSON migration.
- Checked that immediate burst calls remain source-compatible through a default direction argument.
- Checked that text-input keyboard capture releases on destruction to avoid stale focus state.
- No critical or major review findings remain.

## Validation Summary

Command run:

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m
```

Result:

- Build succeeded.
- 17 existing conversion warnings were reported in pre-existing files.
- No compile errors were reported.

Runtime manual validation was not performed because launching the game can touch `UserData.json`, which already has unrelated local changes.

## Remaining Risks

- Fixed-position effects still need an explicit direction parameter if gameplay wants non-world +X emission without an owner.
- Box shape is square-only until a future schema change adds separate width/height.
- Pool exhaustion still silently drops new particles.

## AIWorkflow User Guide Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` was needed. This task changed game runtime/debug tooling, not AIWorkflow commands, cards, approval behavior, runner profiles, finalization, commit/push, or workflow user intervention points.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were intentionally created or modified. MSBuild may have refreshed ignored build output under `PlayGround/_Bin` and `PlayGround/_Intermediate`.

## Next Tasks

- Manually validate gravity, Box spread, attached emitter direction, and text-input shortcut capture in-game.
- Decide whether fixed-position ParticleEventSet playback needs an explicit direction field or station-only direction control.
- Decide whether Box should eventually become rectangular with separate width/height fields.

## AI Assistance

Implemented by Codex with repository analysis, bounded source edits, documentation updates, and local build validation.

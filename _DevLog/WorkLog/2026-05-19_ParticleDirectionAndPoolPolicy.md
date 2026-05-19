# 2026-05-19 Particle Direction and Pool Policy

## Summary

Implemented explicit ParticleEventSet direction playback and observable fixed-pool exhaustion behavior.

## Background

The previous runtime direction behavior could imply owner-facing emission for attached emitters. That was not a good default for ParticleEventSet-style authoring because owner direction was not part of the original data model and would make playback depend on hidden context. Pool exhaustion also needed a clear policy instead of silently dropping particles.

## Scope

- Add explicit direction fields to `ParticleEventSpec`.
- Add `ParticleEventSetPlayContext` for caller-provided preview/playback direction.
- Make event playback combine base direction with optional context direction influence.
- Keep attached emitters attached for position only; emission direction stays explicit.
- Keep the particle pool fixed-size and drop new particles when exhausted.
- Record pool active/peak/drop counters and emit throttled debug warnings.
- Expose direction and pool stats in ParticleStation DebugAssistant UI.
- Update particle documentation and sample ParticleEventSet JSON.

## Files Changed

- `PlayGround/Project/EngineSystems/Render/ParticleEventSetData.h`
- `PlayGround/Project/EngineSystems/Render/ParticleEventSetPlayer.h`
- `PlayGround/Project/EngineSystems/Render/ParticleEventSetPlayer.cpp`
- `PlayGround/Project/EngineSystems/Render/ParticleService.h`
- `PlayGround/Project/EngineSystems/Render/ParticleService.cpp`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.cpp`
- `PlayGround/Data/ParticleEventSet.json`
- `_Docs/Systems/ParticleSystem_Overview.md`
- `_Docs/Systems/ParticleSystem_Overview_KR.md`

## Architecture Notes

- Direction is authored explicitly per event through `base_direction_deg_`.
- `direction_mode_ == PlayContext` allows caller direction to influence an event, but only by the stored `direction_influence_` multiplier.
- Owner-attached emitters still use owner transform for world position, but no longer infer emission direction from owner `Forward2D`.
- Pool exhaustion policy is fixed-pool drop-new. The runtime does not allocate, resize, or preempt older particles.

## Implementation Notes

- `ParticleService::Emit` and emitter creation paths accept an explicit direction radians argument with a source-compatible default of `0`.
- `ParticleEventSetPlayer` resolves final event direction before calling `ParticleService`.
- ParticleStation has a station-only `Preview Dir` slider and selected-event controls for direction mode, base direction, and influence.
- ParticleStation draws a center-screen direction guide: yellow for station preview direction, light blue for the selected event's resolved direction.
- ParticleStation reports the selected event's resolved direction in DebugAssistant, so influence changes are visible numerically even when the particle effect itself is visually noisy.
- ParticleStation displays pool stats as active/pool, peak, dropped-this-frame, and dropped-total.
- ParticleStation has a station-only `Stress Pool` action that emits more particles than the current pool size and reports the drop count.
- `ParticleEventSet.json` includes the new direction fields with backward-compatible default values.

## Review Summary

- Checked that existing direct `PlayEmitterAt` callers remain source-compatible through default direction arguments.
- Checked that `ParticleEventSet` JSON loading has defaults for old files missing direction fields.
- Checked that preview enable/disable remains station-only and is not serialized.
- No workflow guide update is needed because the change does not affect AIWorkflow commands, cards, approval behavior, runner profiles, finalization, commit/push, or workflow user intervention points.

## Validation Summary

Commands run:

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m
git diff --check
Get-Content -Raw -Path PlayGround\Data\ParticleEventSet.json | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path PlayGround\Data\Particle.json | ConvertFrom-Json | Out-Null
Get-Content -Raw -Path PlayGround\Data\ParticleEmitter.json | ConvertFrom-Json | Out-Null
```

Results:

- Debug x64 build succeeded.
- Build reported 17 existing conversion warnings and 0 errors.
- After the ParticleStation observability update, an incremental Debug x64 build succeeded with 0 warnings and 0 errors.
- JSON parse checks passed for `ParticleEventSet.json`, `Particle.json`, and `ParticleEmitter.json`.
- `git diff --check` exited successfully. It only reported line-ending normalization warnings for existing changed files.
- Runtime manual validation was not performed because launching the game can touch `UserData.json`, which already has unrelated local changes.
- The previous manual-only checks were converted into in-scene observability: direction guide, resolved-direction text, and pool stress drop count.

## Remaining Risks

- Pool exhaustion policy is intentionally conservative. If later effects need guaranteed visibility, add an explicit priority/reservation policy instead of hidden dynamic allocation.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were intentionally created or modified.

## Next Tasks

- Manually review the visual placement of the direction guide in-game when local runtime side effects are acceptable.

## AI Assistance

Implemented by Codex with repository analysis, bounded source edits, documentation updates, and local validation planning.

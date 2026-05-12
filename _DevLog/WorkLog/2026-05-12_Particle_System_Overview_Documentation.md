# Particle System Overview Documentation

## Summary

Created a system overview document for the current particle system implementation.

## Background

The repository has a dedicated `_Docs/Systems/` folder for concrete game system documentation. The particle system spans runtime service code, JSON data definitions, scene lifecycle integration, and debug/sample usage, so it fits that folder.

## Scope

- Analyzed particle-related source files and JSON data.
- Documented the current system and class responsibilities.
- Documented lifecycle, update/render order, data loading, usage points, validation behavior, and known limitations.

## Files Changed

- `_Docs/Systems/ParticleSystem_Overview.md`
- `_DevLog/WorkLog/2026-05-12_Particle_System_Overview_Documentation.md`

## Architecture Notes

The current system separates responsibilities as follows:

- Gameplay code decides when visual effects should play.
- JSON data defines reusable particle and emitter behavior.
- `ParticleService` owns runtime playback, pooling, emitter updates, and rendering.
- `SceneManager` handles scene-transition cleanup.

## Implementation Notes

No source code, JSON data, or runtime behavior was changed.

The overview records current limitations without changing behavior:

- `EmitterShape::Box` is declared but not implemented.
- `gravityScale` is declared but not applied.
- Pool exhaustion silently drops new particles.
- Emitter specs keep resolved `ParticleSetting` pointers, making runtime clearing before JSON reload important.

## Review Summary

Reviewed the documentation against the particle-related files found in `PlayGround/Project` and `PlayGround/Data`.

## Validation Summary

No build or runtime validation was run because this was documentation-only work.

## Remaining Risks

The document reflects the current implementation at the time of writing. It should be updated if particle schema, emitter lifecycle, rendering order, or scene cleanup behavior changes.

## Next Tasks

- Optionally add a formal JSON schema/field reference for `Particle.json` and `ParticleEmitter.json`.
- Optionally document expected debug validation steps for particle samples in `WorkStationScene`.

## AI Assistance

Codex analyzed the particle-related files and generated this documentation.

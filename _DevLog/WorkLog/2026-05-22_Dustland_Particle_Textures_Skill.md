# Dustland Particle Textures Skill

## Summary

Created a local Codex skill for PlayGround / Dustland particle texture creation and repeatable toon particle texture generation.

## Background

Earlier toon particle resource work exposed fragile behavior when complex image-generation math was written directly in Windows PowerShell scriptblocks. The new skill records art-direction rules and bundles a stable generator script that uses .NET Framework-compatible C# through PowerShell.

## Scope

- Added a local Codex skill under `C:/Users/kalux/.codex/skills/dustland-particle-textures/`.
- Added a bundled toon particle generator script inside the skill.
- Did not modify game source code.
- Did not modify game JSON data or schemas.
- Did not modify existing texture resources.

## Files Added Outside Repository

- `C:/Users/kalux/.codex/skills/dustland-particle-textures/SKILL.md`
- `C:/Users/kalux/.codex/skills/dustland-particle-textures/agents/openai.yaml`
- `C:/Users/kalux/.codex/skills/dustland-particle-textures/scripts/generate_toon_particles.ps1`

## Files Changed In Repository

- `_DevLog/WorkLog/2026-05-22_Dustland_Particle_Textures_Skill.md`

## Implementation Notes

The skill defines:

- Dustland particle texture operating stance.
- Default project resource paths.
- Particle texture rules for tintable toon assets.
- Visual asset creation and validation workflow.
- Naming guidance for game-ready resources.
- A bundled `generate_toon_particles.ps1` script for repeatable 24-texture toon particle set generation.

The bundled script:

- Refuses to overwrite existing files unless `-Overwrite` is passed.
- Uses legacy-compatible C# syntax for Windows PowerShell 5.1 / .NET Framework.
- Avoids fragile PowerShell pixel math scriptblocks.
- Validates dimensions, pixel format, nonzero alpha, RGB band count, and edge alpha after generation.

## Validation Summary

Validation performed:

- Confirmed the skill folder contains `SKILL.md`, `agents/openai.yaml`, and `scripts/generate_toon_particles.ps1`.
- Ran the bundled generator against a temporary output folder.
- Confirmed the generator produced 24 `Toon_*_White.png` files.
- Confirmed generated files passed the script's metadata and edge-alpha validation.

`quick_validate.py` from the system `skill-creator` skill was attempted with the bundled Python runtime, but it could not run because `yaml` / PyYAML is not installed in that runtime. This is a validation-tool dependency issue, not a detected problem in the new skill files.

Build and runtime validation were not run because this task only added a local Codex skill and a Dev Log.

## Remaining Risks

- The newly created skill may require a future Codex skill-list refresh before it appears in automatically displayed available-skill metadata.
- The bundled particle generator currently covers the 24-texture toon exploration set only; broader sprite generation remains guided by the skill workflow and may compose with the existing `imagegen` skill.

## AIWorkflow Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed. This task does not change AIWorkflow commands, approvals, runner behavior, completion gates, or user intervention points.

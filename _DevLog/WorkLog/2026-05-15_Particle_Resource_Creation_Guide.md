# Particle Resource Creation Guide

## Summary

Created a Korean HTML guide that formalizes how to request particle resource creation for the PlayGround project.

## Background

Recent particle texture experiments showed that resource usefulness depends on the particle's gameplay purpose, rendering strategy, and readability requirements. The guide records the agreed request structure so future particle resource work can start from intent instead of shape-only requests.

## Scope

- Added a user-facing HTML guide under `_Docs/Systems/Guide/`.
- Did not modify game source code.
- Did not modify JSON data or schemas.
- Did not modify particle texture files.
- Did not modify AIWorkflow behavior.

## Files Changed

- `_Docs/Systems/Guide/ParticleResource_Creation_Guide_KR.html`
- `_DevLog/WorkLog/2026-05-15_Particle_Resource_Creation_Guide.md`

## Notes

The guide defines:

- Purpose-first particle request flow.
- Three particle resource strategies: glow, toon, and flipbook.
- Recommended strategy by particle family.
- Project defaults for 64x64 tintable particle PNG resources.
- A reusable request template and validation checklist.

## Validation Summary

Validation performed:

- Confirmed the guide file exists.
- Confirmed the document is HTML and encoded as UTF-8 by repository patch creation.
- Checked Git status after the change.

Build and runtime validation were not run because this is documentation-only work.

## Remaining Risks

- The guide may need examples with actual rendered screenshots after the particle style is finalized in-game.
- Resource folder ignore behavior remains unchanged.

## AIWorkflow Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed. This task does not change AIWorkflow commands, approvals, runner behavior, finalization, or user intervention points.

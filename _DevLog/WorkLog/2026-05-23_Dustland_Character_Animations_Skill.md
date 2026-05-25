# Dustland Character Animations Skill

## Summary

Created a local Codex skill for PlayGround / Dustland character animation resource analysis, JSON clip validation, and contact sheet review.

## Background

Dustland character animation resources are JSON-driven PNG frame sequences. The runtime builds clips from `animation_clips_` using directory, prefix, frame index range, fps, and loop fields. This makes resource naming, frame count, image metadata, and bottom-center anchor stability important enough to capture in a reusable local skill.

## Scope

- Added a local Codex skill under `C:/Users/kalux/.codex/skills/dustland-character-animations/`.
- Added scripts for resource folder analysis, JSON clip validation, and temporary contact sheet generation.
- Did not modify game source code.
- Did not modify game JSON data or schemas.
- Did not modify existing animation resources.
- Did not modify particle or skill-icon Codex skills.

## Files Added Outside Repository

- `C:/Users/kalux/.codex/skills/dustland-character-animations/SKILL.md`
- `C:/Users/kalux/.codex/skills/dustland-character-animations/agents/openai.yaml`
- `C:/Users/kalux/.codex/skills/dustland-character-animations/scripts/analyze_character_animation_resources.ps1`
- `C:/Users/kalux/.codex/skills/dustland-character-animations/scripts/validate_character_animation_clips.ps1`
- `C:/Users/kalux/.codex/skills/dustland-character-animations/scripts/make_character_animation_contact_sheet.ps1`

## Files Changed In Repository

- `_DevLog/WorkLog/2026-05-23_Dustland_Character_Animations_Skill.md`

## Implementation Notes

The skill defines:

- The distinction between JSON-driven animation clip validation and resource-only folder analysis.
- The current frame naming contract: `{prefix_}{index:000}.png`.
- Default character animation expectations: `256x256`, `Format32bppArgb`, transparent PNG sequence frames.
- Bottom-center anchor awareness: bottom-edge alpha can be intentional, while top/left/right edge alpha is treated as a stronger clipping warning.
- Guidance to keep character body animation and skill/attack effect sprites separate.

The bundled scripts provide:

- Folder-level PNG sequence summaries, with `-IncludeEffects` for optional effect-sprite reference analysis.
- JSON-driven `animation_clips_` validation with strict JSON parsing and explicit data-integrity errors.
- Temporary contact sheet generation from an animation root, a single clip folder, or JSON clip references.

## Validation Summary

Validation performed:

- Confirmed `SKILL.md`, `agents/openai.yaml`, and all three scripts exist.
- Confirmed `SKILL.md` frontmatter includes `name: dustland-character-animations`.
- Confirmed `agents/openai.yaml` includes the expected display name and `$dustland-character-animations` default prompt.
- Ran `analyze_character_animation_resources.ps1` on Dusty's animation root without `-IncludeEffects`; it analyzed 36 PNG files in 6 body-animation folders.
- Ran `analyze_character_animation_resources.ps1` on Dusty's character root with `-IncludeEffects`; it analyzed 118 PNG files in 14 folders including effect-sprite reference folders.
- Ran `validate_character_animation_clips.ps1` against `PlayGround/Data/PlayableCharacter.json`; the file parsed successfully and 6 clips passed validation.
- Ran the validator against a temporary malformed JSON file under the user temp directory; it reported a data-integrity parse error as expected.
- Ran `make_character_animation_contact_sheet.ps1` against Dusty's animation root; it created a temporary contact sheet under the user temp directory.
- Visually inspected the generated contact sheet.

Build and runtime validation were not run because this task only added a local Codex skill and a Dev Log.

## Remaining Risks

- The newly created skill may require a future Codex skill-list refresh before it appears in automatically displayed available-skill metadata.
- v1 does not generate or normalize animation frames. If animation generation is requested later, this skill should compose with `imagegen` or `game-studio:sprite-pipeline` and then run these validation scripts.

## AIWorkflow Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed. This task does not change AIWorkflow commands, approvals, runner behavior, completion gates, or user intervention points.

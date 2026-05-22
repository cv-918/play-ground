# 2026-05-22 Unit Visual Width

## Summary
- Exposed unit sprite size as final world-space `visual_width_` instead of resource-dependent `visual_scale_`.
- Player and enemy sprite draw width is now directly controlled by data, while gameplay collision/range data remains based on existing fields.

## Background
- Enemy sprites were already separated into gameplay body size and visual render tuning.
- Player sprites still used `Transform::Scale().x` as render width, which kept player visual size coupled to `body_size_`.
- `visual_scale_` was hard to tune from scripting/data because identical scale values produced different final sizes depending on each resource's visible bounds.

## Scope
- Added playable `visual_width_` data.
- Replaced enemy/player `visual_scale_` data with `visual_width_`.
- Updated Town, Stage player, and enemy rendering to use final visible width.
- Updated CharacterStation editing, preview, and validation for unit visual width.
- Did not change body collider, attack range, collector range, enemy separation, or nav footprint behavior.

## Files Changed
- `PlayGround/Data/PlayableCharacter.json`
- `PlayGround/Data/Enemy.json`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/EnemyDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/PlayableCharacterDataManager.h`
- `PlayGround/Project/Gameplay/Components/SpriteRendererComponent.h`
- `PlayGround/Project/Gameplay/Components/SpriteRendererComponent.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/Enemy.h`
- `PlayGround/Project/Gameplay/Actors/Stage/Enemy.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/StagePlayer.cpp`
- `PlayGround/Project/Gameplay/Actors/Town/TownPlayer.cpp`
- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.cpp`

## Architecture Notes
- `body_size_` remains gameplay data.
- `visual_width_` is the final world-space visible sprite width exposed to data/scripting.
- `SpriteRendererComponent` keeps the old transform-scale behavior by default and only uses natural visible size when explicitly enabled.

## Implementation Notes
- Dusty now starts with `visual_width_ = 62.0`.
- Enemy widths were migrated from current visible bounds and scale values: Lv1 `48.5`, Lv2 `46.0`, Lv3 `82.4`, Lv4 `68.4`, Lv5 `76.38`, Lv6 `243.0`.
- TownPlayer and StagePlayer enable natural visible-size rendering on their sprite renderer.
- StagePlayer static sprite fallback uses the same natural visible-size calculation.
- CharacterStation exposes `Visual Width` for both Playable and Enemy modes and draws previews using natural sprite proportions.
- CharacterStation visual-bound guides now match `Movement` runtime clamping: `nav_footprint_radius_ + nav_visual_margin_*`, centered on the footprint sample point and shown only for `ContainVisualBounds`.
- CharacterStation enemy collider guides now use the same reference clip priority as runtime enemy colliders: `move`, then `idle`, then the first loadable clip.
- CharacterStation `Visual Width` range was expanded to `1..640`, nav visual margin labels were renamed to `Nav Margin X/Y`, and no-preview fallback uses visual width.

## Review Summary
- Diff was reviewed for scope: gameplay collider/range values were not changed.
- Existing unrelated working-tree changes were left untouched.
- AIWorkflow user guide update is not needed; this is game runtime/data work, not workflow behavior.

## Validation Summary
- `PlayableCharacter.json` and `Enemy.json` were parsed with PowerShell `ConvertFrom-Json` using UTF-8 encoding.
- `PlayGround.sln` `Debug|x64` build succeeded after the final `visual_width_` conversion.
- Runtime visual checks in Town, Stage, and CharacterStation were not performed in this session.

## Remaining Risks
- Dusty one-shot hit/die frames have wider visible bounds than idle/move, so a fixed width will make them keep the same target width but appear proportionally taller.
- Final visual feel still needs runtime inspection by the developer.

## Next Tasks
- Check Dusty in Town idle/move.
- Check Dusty in Stage idle/move/hit/die.
- Tune `visual_width_` in CharacterStation if needed.

## AI Assistance
- Codex implemented the scoped data/render/editor changes and ran build validation.

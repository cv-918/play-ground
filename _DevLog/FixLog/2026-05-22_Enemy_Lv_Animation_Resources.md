# Enemy Lv Animation Resources

## Summary
- Applied enemy animation resources from `Data/Resources/Textures/Characters/Enemies`.
- Mapped enemy `id_` 1-6 to matching `Lv.{id}` resource folders in `Enemy.json`.
- Added single-frame clip fallback for `Lv*_hit.png` resources.
- Connected dash/projectile ability phases to attack-specific animation requests.
- Added enemy facing flip so movement toward negative X keeps the left-facing source art and movement toward positive X flips it right.
- Fixed enemy sprite aspect handling so enemy visuals preserve each frame's visible pixel ratio instead of forcing every enemy into the old 0.6 height ratio.
- Resized enemy body/contact attack colliders from the old `body_size_` radius to a visual-width-based radius of `body_size_ * 0.5`, with Y ratio derived from each enemy sprite's visible bounds.

## Background
- Enemy runtime already had a lightweight state-based frame renderer.
- Enemy data already had an `animation_clips_` field.
- The requested scope was resource application and state/ability timing connection without changing the JSON schema.

## Scope
- Enemy animation data mapping.
- Enemy runtime animation frame selection.
- Ability-level animation override request.
- Enemy movement-direction facing flip.
- Enemy runtime and CharacterStation enemy preview aspect correction.
- Enemy body/contact attack collider sizing correction.
- CharacterStation preview/validation support for single-frame hit clips.

## Files Changed
- `PlayGround/Data/Enemy.json`
- `PlayGround/Project/Gameplay/Actors/Stage/EnemyTypes.h`
- `PlayGround/Project/Gameplay/Actors/Stage/IEnemyAbility.h`
- `PlayGround/Project/Gameplay/Actors/Stage/EnemyAbilitySet.h`
- `PlayGround/Project/Gameplay/Actors/Stage/EnemyAbilitySet.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/DashAbility.h`
- `PlayGround/Project/Gameplay/Actors/Stage/DashAbility.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/ProjectileAttackAbility.h`
- `PlayGround/Project/Gameplay/Actors/Stage/ProjectileAttackAbility.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/Enemy.h`
- `PlayGround/Project/Gameplay/Actors/Stage/Enemy.cpp`
- `PlayGround/Project/Gameplay/Scenes/CharacterStationScene.cpp`

## Architecture Notes
- Enemy gameplay state remains separate from animation selection.
- Ability modules can request a temporary animation clip, but they do not own rendering.
- `Enemy` remains responsible for choosing the final clip and resolving frame paths.
- No new animation FSM file or JSON schema field was introduced.

## Implementation Notes
- `EnemyAnimationRequest` was added as a small ability-to-enemy animation request model.
- `DashAbility` requests `attack` only while the dash phase is actively `Dashing`.
- `ProjectileAttackAbility` requests `search` before the projectile fire point and `attack` after firing.
- Enemy `Attack` state no longer falls back to `attack` by itself; `attack` is shown only when an ability explicitly requests it.
- Non-loop clips with a logic duration are resolved by normalized elapsed time instead of raw fps length.
- Single-frame clips first try the normal sequence path, then fall back to `directory + prefix + ".png"` when the frame range is exactly one frame.
- `Enemy.json` now uses empty `image_path_` values so the old deleted `Enemy-Lv1.png` path is not required.
- Enemy draw calls now use a cached X flip value. The convention is source art faces left: negative X keeps `flip_sprite_x_ = false`, positive X sets `flip_sprite_x_ = true`.
- Facing is updated from movement velocity first, then from the transform forward vector when horizontal movement is near zero.
- `SpriteRenderUtils::BuildWorldSpriteDestRect` keeps its default 0.6 height ratio for existing callers, while enemy rendering passes `visible_height / visible_width` explicitly to preserve sprite proportions.
- CharacterStation enemy preview uses the same natural visible ratio as runtime enemy rendering. Playable preview still uses the existing 0.6 body guide ratio.
- Enemy `Body` and `Attack` colliders now treat `body_size_` as visible width, not radius. This reduces old contact hit distance by roughly half on the X axis.
- CharacterStation's enemy body guide now mirrors the runtime collider sizing.

## Review Summary
- Checked the implementation against the plan after build.
- Fixed a review finding where Lv.4 could have shown `attack` during dash charge/recovery through generic `Attack` state fallback.
- Existing unrelated worktree changes were left untouched.

## Validation Summary
- Ran whitespace check:
  - `git diff --check -- <enemy animation files>`
  - Result: passed. Git reported LF-to-CRLF normalization warnings only.
- Ran JSON/resource path validation:
  - Parsed `PlayGround/Data/Enemy.json`.
  - Checked every clip frame against the `PlayGround/Data` resources, including single-frame fallback.
  - Result: all enemy animation clip frames resolved.
- Ran build:
  - `MSBuild.exe PlayGround/PlayGround.sln /t:Build /p:Configuration=Debug /p:Platform=x64 /m`
  - Result after enemy collider follow-up: build succeeded with 0 errors and 16 warnings.
  - Remaining warnings are existing conversion warnings in dialogue, enemy, app entry, game object, stage manager, UI, and player files.
- Ran aspect-ratio check on the first move frame for each enemy Lv:
  - Lv1 natural visible H/W: 0.608.
  - Lv2 natural visible H/W: 0.548.
  - Lv3 natural visible H/W: 0.971.
  - Lv4 natural visible H/W: 0.515.
  - Lv5 natural visible H/W: 1.080.
  - Lv6 natural visible H/W: 0.822.
- Ran collider sizing check on the first move frame for each enemy Lv:
  - Lv1: old Rx 60.0 -> new Rx 30.0, new Ry 18.2.
  - Lv2: old Rx 60.0 -> new Rx 30.0, new Ry 16.4.
  - Lv3: old Rx 60.0 -> new Rx 30.0, new Ry 29.1.
  - Lv4: old Rx 60.0 -> new Rx 30.0, new Ry 15.4.
  - Lv5: old Rx 32.0 -> new Rx 16.0, new Ry 17.3.
  - Lv6: old Rx 120.0 -> new Rx 60.0, new Ry 49.3.
- Runtime visual validation was not performed in this session.

## Remaining Risks
- Runtime feel still needs manual playtesting, especially Lv.4 dash attack timing and Lv.5 search/attack transition.
- Enemy facing assumes all enemy source art is left-facing. Any right-facing source asset would need either asset correction or per-asset flip policy.
- Enemy visual height now varies by sprite proportions while collider/body guide still follows gameplay data. Any enemy that relied on the old forced 0.6 visual shape may need `body_size_` tuning.
- Contact damage now triggers closer to the visible enemy body. This should reduce unfair-feeling hits, but each enemy still needs runtime tuning for desired gameplay feel.
- Enemy frame-path resolution checks the filesystem before single-frame fallback; if enemy counts become very large, this may need caching.
- The working tree already contains unrelated modified and untracked files; commit scope must be selected carefully.

## Next Tasks
- Spawn or progress through enemies Lv.1-Lv.6 and verify visual resources in-game.
- Confirm Lv.4 `attack` appears only during the actual dash movement.
- Confirm Lv.5 `search` appears before firing and `attack` appears after the projectile is fired.
- Confirm hit/death animation timing under real combat.
- Confirm enemies face left when moving toward negative X and right when moving toward positive X.
- Confirm tall enemies such as Lv3 no longer look vertically squashed, while flatter enemies such as Lv1 still keep their intended flat silhouette.
- Confirm contact damage no longer triggers at visibly excessive distance from the player.

## AIWorkflow User Guide Update Decision
- No update needed.
- This task changes game runtime/data behavior, not AIWorkflow commands, approval behavior, PC Runner routing, task finalization, or user intervention points.

## Local Artifact Policy
- `_Temp`, `_Local`, `node_modules`, `.env`, and local config files were not created or modified for this task.
- Build output directories under `PlayGround/_Bin` and `PlayGround/_Intermediate` were used by MSBuild and are not part of the intended source diff.

## AI Assistance
- Implemented with Codex based on the approved Enemy Lv animation resource plan.

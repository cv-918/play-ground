# Town Background And NPC Resource Application

## Summary
- Renamed the field background source asset from `Field-2560x1600.png` to `Field_BG.png`.
- Routed stage gameplay to `Field_BG.png` and town gameplay to `Town_BG.png`.
- Applied town NPC sprites from `Textures/Characters/Npcs` by using `TownNpcPlacement.json` `npc_id` values.
- Added town NPC visual sizing through `visual_width_`, matching the player/enemy final visible-width policy.
- Anchored the NPC interaction prompt above each sprite's rendered visible height.

## Background
- Town and in-game scenes were both using the old field background filename.
- Town NPCs were still rendered as fallback debug shapes even though NPC image resources exist.

## Scope
- Background resource path updates for `OutGameScene` and `StageManager`.
- Static sprite rendering support for `TownNpc`.
- Spawn-time NPC id to resource mapping in `TownNpcPlacementSpawner`.
- Interaction prompt placement for `TownNpcInteractionIndicator`.

## Files Changed
- `PlayGround/Data/Resources/Textures/World/Field-2560x1600.png` -> `PlayGround/Data/Resources/Textures/World/Field_BG.png`
- `PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/StageManager.cpp`
- `PlayGround/Project/Gameplay/Actors/Town/TownNpc.h`
- `PlayGround/Project/Gameplay/Actors/Town/TownNpc.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.cpp`
- `PlayGround/Data/TownNpcPlacement.json`
- `PlayGround/Project/Gameplay/UI/Widgets/TownNpcInteractionIndicator.cpp`

## Architecture Notes
- No JSON schema change was introduced.
- NPC resource selection stays tied to the existing placement data's `npc_id`.
- `TownNpc` keeps its existing interaction collider behavior. The new sprite renderer only affects visual output.
- `visual_width_` is the final intended visible width in world units. It does not change NPC collision or interaction range.
- The prompt anchor uses the NPC rendered visible height plus a fixed margin. It does not use the interaction collider.
- If an NPC sprite cannot be loaded, `TownNpc` falls back to the existing debug shape.

## Implementation Notes
- `StageManager` now loads `Path::World + L"Field_BG.png"`.
- `OutGameScene` now loads `Path::World + L"Town_BG.png"`.
- NPC resource mapping:
  - `elder` -> `Npcs/Oldman.png`
  - `engineer` -> `Npcs/Engineer.png`
  - `ring` -> `Npcs/Ring.png`
- NPC sprites use bottom-center pivot and natural visible bounds through `SpriteRendererComponent`.
- `TownNpcPlacement.json` entries can tune NPC visual size with `visual_width_`. Missing or invalid values fall back to `80.f`.
- Prompt Y position is now `npc_position.y - rendered_visible_height - 12px`.

## Review Summary
- The implementation avoids changing placement JSON or interaction logic.
- The background rename and NPC resource application require force-adding ignored resource files when committing because `Resources/` is ignored by `.gitignore`.

## Validation Summary
- `msbuild PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m` succeeded.
- The latest Debug build completed with 0 warnings and 0 errors.
- `git diff --check` passed for changed source files, with line-ending warnings only.
- Runtime visual validation was not performed by the assistant.

## Remaining Risks
- Town NPC visual width currently defaults to `80.f`; it may need art-direction tuning after runtime review.
- Because `Field_BG.png`, `Town_BG.png`, and the NPC PNG files are ignored resource files, they must be included intentionally if this change is committed for another checkout.

## Next Tasks
- Runtime check town background, stage background, and the three town NPC sprites.
- Tune NPC `visual_width_` values after runtime review if the first pass feels too large or too small.

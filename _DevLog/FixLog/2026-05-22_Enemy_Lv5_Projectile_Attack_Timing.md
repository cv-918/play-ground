# Enemy Lv5 Projectile Attack Timing

## Summary
- Moved Lv5 projectile spawn timing from the midpoint of the attack motion to the end of the attack motion.
- Retuned Lv5 projectile muzzle offset against the final `attack` frame.

## Background
- Lv5 uses `search` before firing and `attack` for the visible projectile release motion.
- The old projectile spawned as soon as `attack` started, so the runtime projectile appeared before the attack animation finished.

## Scope
- `ProjectileAttackAbility` timing and muzzle interpretation.
- Lv5 `Enemy.json` projectile spawn offset values.
- No new JSON fields were added.

## Files Changed
- `PlayGround/Project/Gameplay/Actors/Stage/ProjectileAttackAbility.cpp`
- `PlayGround/Data/Enemy.json`

## Implementation Notes
- The animation request still splits `attack_motion_duration_` into `search` first and `attack` second.
- Projectile spawn now occurs when `attack_motion_elapsed_ >= attack_motion_duration_`.
- After spawning, the enemy remains in `Attack` for one render frame so the final attack frame can be visible with the projectile spawn.
- `projectile_spawn_offset_y_` is now interpreted as a fixed world/screen Y offset instead of a perpendicular side offset. This matches CharacterStation's muzzle guide behavior and the top-down sprite anchor.
- Lv5 muzzle offset was changed from `(20, 0)` to `(21, -46)` based on `Lv5_attack_009.png`.

## Validation Summary
- `msbuild PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m` succeeded with 0 warnings and 0 errors.
- Runtime visual validation was not performed by the assistant.

## Remaining Risks
- The muzzle was tuned from the final frame image and should still be checked in runtime because camera/resolution scaling can affect perceived alignment.

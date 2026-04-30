# Contact Attack Cooldown Timer Fix

## Summary
- Fixed enemy contact attack cooldown being cleared when collision temporarily separated.
- Preserved cooldown timers for normal collision exit/re-enter cases.
- Moved contact attack re-hit gating into `ContactAttackAbility` so enemy attack policy no longer depends only on collider timer lifetime.
- Kept timer cleanup for collider destruction and forced collision-state cleanup.

## Background
- Enemy contact attacks throttle repeated hits through `Collider::collision_timers_`.
- After the collision safety refactor, general collision dereference erased the timer.
- Knockback could briefly separate the player and enemy attack collider, clearing the cooldown and allowing a too-fast re-hit.
- Follow-up runtime feedback showed that collider-owned timers were still too fragile because enemy collision state can be cleared/rebuilt during gameplay.

## Scope
- Changed only collision reference cleanup behavior.
- Did not change `Movement`, enemy attack formulas, JSON data, or attack speed values.

## Files Changed
- `PlayGround/Project/Gameplay/Components/Collider.h`
- `PlayGround/Project/Gameplay/Components/Collider.cpp`
- `PlayGround/Project/EngineSystems/Physics/CollisionManager.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/ContactAttackAbility.h`
- `PlayGround/Project/Gameplay/Actors/Stage/ContactAttackAbility.cpp`

## Implementation Notes
- Added a `_clear_timer` flag to `Collider::_ForgetCollisionReference`.
- Normal collision exit keeps existing timers.
- Lifecycle cleanup paths pass `_clear_timer = true` to avoid stale collider timer references.
- Added per-target cooldown tracking to `ContactAttackAbility`.
- Contact attacks now check the ability-owned cooldown before applying damage.
- The cooldown duration still uses `DEFAULT_ATTACK_SPEED - info->attack_speed_`.

## Review Summary
- Verified that `CollisionManager::_DeregisterCollisionPair` uses the default timer-preserving path.
- Verified that `NotifyColliderDestroying` and `Collider::ClearCollisionState` explicitly clear related timers.
- Existing `Collider::LateUpdate` timer-expiration cleanup remains unchanged.
- Verified that contact attack re-hit gating is no longer dependent on `Collider::SetTimerForTarget`.

## Validation Summary
- `Debug|x64` MSBuild succeeded with 0 errors.
- Latest `Debug|x64` MSBuild succeeded with 0 errors and 3 existing conversion warnings in `Enemy.cpp`.
- Runtime/manual contact-attack timing validation was not performed in this session.

## Remaining Risks
- Manual runtime verification is still required to confirm perceived re-hit timing in gameplay.
- The existing collider timer design still couples attack cooldowns to collider instances.

## Next Tasks
- Run a gameplay test where the player is hit, knocked back, and re-enters the same enemy attack collider before the cooldown expires.
- Confirm `Combat::GetDamage applied` log intervals are not shorter than `DEFAULT_ATTACK_SPEED - attack_speed_`.

## AI Assistance
- Implemented with AI assistance in Codex.

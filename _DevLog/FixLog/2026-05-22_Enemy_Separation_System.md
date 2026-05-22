# Enemy Separation System

## Summary
- Added an optimized enemy-to-enemy separation pass so enemies do not collapse into one fully overlapping stack while chasing the player.
- Kept this as positional crowd separation, not combat collision.

## Background
- Enemy combat collision already uses `EnemyBody` and `EnemyAttack` colliders.
- Enabling `EnemyBody` against itself in the global collision matrix would only add collision events; it would not resolve positions.
- Enemy-heavy gameplay needs broad-phase filtering so pair checks do not become a full `O(n^2)` scan every frame.

## Scope
- Runtime enemy separation after enemy movement and before collider late update.
- Optimized grid-based broad-phase using reusable vectors and sorted cell keys.
- Movement API for external displacement that reuses nav mesh clamping.
- No JSON schema changes and no collision matrix changes.

## Files Changed
- `PlayGround/Project/Gameplay/GamePlaySystems/EnemySeparationSystem.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/EnemySeparationSystem.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/ObjectManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/ObjectManager.cpp`
- `PlayGround/Project/Gameplay/Components/Movement.h`
- `PlayGround/Project/Gameplay/Components/Movement.cpp`
- `PlayGround/PlayGround.vcxproj`
- `PlayGround/PlayGround.vcxproj.filters`

## Architecture Notes
- `CollisionManager` remains responsible for collision detection and event dispatch.
- `EnemySeparationSystem` is responsible only for crowd-position correction.
- `ObjectManager` owns the separation pass because it already owns the active object list and update ordering.
- `Movement` exposes a small external displacement API so separation can move enemies while preserving nav mesh clamping.

## Implementation Notes
- The separation pass collects active enemies into lightweight proxy records.
- Each proxy stores only the data needed for separation: enemy, transform, movement, collider-derived center/radius, move weight, and accumulated displacement.
- Enemies in `Spawn` or `Death`, dead enemies, inactive enemies, pending-destruction enemies, and enemies without an enabled body collider are excluded.
- Dashing enemies use a lower move weight (`0.25`) so they are still part of separation but get displaced less than normal enemies.
- Grid broad-phase uses a fixed cell size and sorted cell keys instead of registering `EnemyBody` against itself.
- Pair processing checks only potentially nearby cells and only handles each pair once.
- Solver iterations are capped at `2`, and per-iteration displacement is capped to avoid large teleport-like corrections.

## Review Summary
- Checked that combat collision layers were not changed.
- Checked that the separation pass runs after object movement and before collider late update.
- Existing unrelated working tree changes were left untouched.

## Validation Summary
- Ran `git diff --check` for the tracked source/project files touched by this task.
  - Result: passed. Git reported LF-to-CRLF normalization warnings only.
- Ran a trailing-whitespace check for new untracked source and DevLog files.
  - Result: passed.
- Ran build:
  - `MSBuild.exe PlayGround/PlayGround.sln /t:Build /p:Configuration=Debug /p:Platform=x64 /m`
  - Result: build succeeded with 0 errors and 10 warnings.
  - Warnings are existing conversion warnings in `Enemy.cpp`, `StageManager.cpp`, and `StagePlayer.cpp`; no new warning was reported from `EnemySeparationSystem`.
- Runtime visual validation has not been performed yet.

## Remaining Risks
- Tuning values such as cell size, strength, iteration count, and max displacement may need runtime feel adjustment.
- Very dense enemy swarms can still overlap temporarily because the solver is intentionally capped for performance.
- Runtime profiling is still needed if enemy counts become very high.

## Next Tasks
- Spawn a dense enemy group and verify enemies no longer fully stack while chasing.
- Confirm Lv4 dash still reads well and does not get fully blocked by crowd separation.
- Confirm enemies remain inside the nav mesh when separation pushes them.

## AIWorkflow User Guide Update Decision
- No update needed.
- This task changes game runtime behavior, not AIWorkflow commands, approval behavior, PC Runner routing, task finalization, or user intervention points.

## Local Artifact Policy
- `_Temp`, `_Local`, `node_modules`, `.env`, and local config files were not created or modified for this task.

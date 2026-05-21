# Dusty Player Animation Runtime

## Summary
- Applied Dusty playable animation clips to player runtime behavior.
- Town player now uses only `idle` and `move` clips from existing `PlayableCharacter.json` animation data.
- Stage player now connects `idle`, `move`, `hit`, and `die` to runtime state.
- Added a short `PlayerDying` stage state so fatal damage shows a slowed death animation before the result screen.

## Background
- Dusty animation resources are already described through the existing `animation_clips_` data.
- No JSON schema change was requested or needed.
- One-shot animations must fit gameplay logic duration instead of forcing gameplay timing to animation frame length.

## Scope
- Animation playback control API for runtime-duration one-shots.
- Player animation state connection for Town and Stage players.
- Player death presentation state in stage flow.
- In-game world update delta scaling during the death presentation.

## Files Changed
- `PlayGround/Project/Gameplay/Components/SpriteAnimatorComponent.h`
- `PlayGround/Project/Gameplay/Components/SpriteAnimatorComponent.cpp`
- `PlayGround/Project/Gameplay/Actors/ActorUtil.h`
- `PlayGround/Project/Gameplay/Actors/Stage/UnitBase.h`
- `PlayGround/Project/Gameplay/Actors/Stage/UnitBase.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/StagePlayer.h`
- `PlayGround/Project/Gameplay/Actors/Stage/StagePlayer.cpp`
- `PlayGround/Project/Gameplay/Actors/Town/TownPlayer.h`
- `PlayGround/Project/Gameplay/Actors/Town/TownPlayer.cpp`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/Common/CommonGamePlayFunctions.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/StageManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/StageManager.cpp`
- `PlayGround/Project/Gameplay/Scenes/InGameScene.cpp`

## Architecture Notes
- Gameplay state remains separate from animation playback.
- `StageManager` owns stage flow decisions, including the new `PlayerDying` transition.
- `SpriteAnimatorComponent` only exposes playback controls and clip queries; it does not become a gameplay FSM.
- `StagePlayer` chooses animation based on player runtime state and reaction timing.

## Implementation Notes
- Added `HasClip`, `GetClipDuration`, `PlayForDuration`, `IsCurrentClipFinished`, `GetCurrentClipName`, and `IsCurrentClip` to `SpriteAnimatorComponent`.
- Mapped `PlayerState::Death` to `die` and `PlayerState::Spell` to `cast`.
- Changed `UnitBase::ApplyHitReaction` to return `ResolvedHitReaction` so `StagePlayer` can match `hit` duration to knockback timing.
- Added `StageState::PlayerDying` with default duration `1.0s` and world time scale `0.35`.
- `InGameScene` now updates world systems in `Play` and `PlayerDying`, using scaled delta time during `PlayerDying`.
- `StagePlayer` locks movement and disables colliders on death, then plays `die` for the death presentation window.
- `TownPlayer` filters the playable animation set to `idle` and `move` only.

## Review Summary
- Checked the diff for scope and responsibility boundaries.
- Fixed a death-state movement issue found during review: the movement component is updated before `StagePlayer` death guards, so death now explicitly disables normal movement and roots the movement component.
- Existing unrelated worktree changes were left untouched.

## Validation Summary
- Ran whitespace check:
  - `git diff --check -- <Dusty animation files>`
  - Result: passed. Git reported LF-to-CRLF normalization warnings only.
- Ran build:
  - `MSBuild.exe PlayGround/PlayGround.sln /t:Build /p:Configuration=Debug /p:Platform=x64 /m`
  - Result: build succeeded with 0 errors and 2 warnings.
  - Remaining warnings are existing `C4244` conversion warnings in `StagePlayer.cpp`.
- Runtime visual validation was not performed in this session.

## Remaining Risks
- Hit/death animation feel still needs in-game visual tuning.
- Fatal scenario should be manually checked to confirm that the result screen appears after the death presentation and that restart/lobby flows remain intact.
- The working tree already contains unrelated modified and untracked files; commit scope must be selected carefully.

## Next Tasks
- Runtime check in Town: idle/move and horizontal flip.
- Runtime check in Stage: idle/move switching, hit reaction timing, death slow-motion/result transition.
- Tune `PLAYER_DEATH_SEQUENCE_DURATION` and `PLAYER_DEATH_WORLD_TIME_SCALE` if the first pass feels too long or too slow.

## AIWorkflow User Guide Update Decision
- No update needed.
- This task changes game runtime behavior, not AIWorkflow commands, approval behavior, PC Runner routing, task finalization, or user intervention points.

## Local Artifact Policy
- `_Temp`, `_Local`, `node_modules`, `.env`, and local config files were not created or modified for this task.
- Build output directories under `PlayGround/_Bin` and `PlayGround/_Intermediate` were used by MSBuild and are not part of the intended source diff.

## AI Assistance
- Implemented with Codex based on the approved Dusty player animation plan.

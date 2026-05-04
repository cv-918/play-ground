# GAME-002 - Run Clear Semantics Consolidation

## Summary

Consolidated runtime run-result semantics so run end reason, kill-goal completion, stage progression eligibility, and reward/save application are represented separately.

## Background

`RunState::CreateResult()` previously treated `!is_player_died_` as `is_cleared_`, which made timer expiration, death, return/exit, and kill-goal progression ambiguous. Kill-goal handling also directly called `StageManager` from `RunState`.

## Scope

- Runtime C++ semantics only.
- No JSON schema changes.
- No save file format changes.
- No large UI redesign.

## Files Changed

- `PlayGround/Project/Gameplay/Common/CommonGamePlayType.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/RunState.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/RunState.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/StageManager.h`
- `PlayGround/Project/Gameplay/GamePlaySystems/StageManager.cpp`
- `PlayGround/Project/Gameplay/GamePlaySystems/UserProfile.cpp`
- `PlayGround/Project/Gameplay/UI/Views/InGameResultView.cpp`

## Architecture Notes

- `RunState` now records runtime facts and produces a `RunSessionResult` snapshot.
- `StageManager` now owns result finalization with elapsed time and applies progression/profile/save decisions.
- `UserProfile` only applies an explicit `RunSessionResult` request from `StageManager`.
- Result UI consumes the snapshot through `StageManager`.

## Implemented Semantics

- `RunEndReason::TimeExpired`: timer survived to result screen; full coin reward and experience are applied.
- `RunEndReason::PlayerDied`: failed run end; half coin reward and experience are applied, preserving prior death reward behavior.
- `RunEndReason::StageProgressed`: kill goal was reached and the player progressed to the next stage; stage progress and reward/save are applied through `StageManager::ProgressRunSessionResult(true)`.
- `RunEndReason::Abandoned`: pause exit before result; reward/save application is skipped.
- `kill_goal_reached_`: target kill count reached.
- `stage_clear_eligible_`: stage progression is enabled by the kill goal.
- `is_cleared_`: retained for compatibility and now reflects `stage_clear_eligible_`.

## Implementation Notes

- Kill target formula is now `BASE_KILL_COUNT + ((stage_progress - 1) * KILL_GROWTH_PER_STAGE)`.
- `RunState` no longer calls `StageManager::MarkCanProgressNextStage()` directly.
- `StageManager` marks next-stage eligibility after enemy reward processing when `RunState` reports stage clear eligibility.
- `StageManager` has a minimal `run_session_result_applied_` guard to avoid duplicate application on restart/return paths.

## Review Summary

Self-reviewed the diff for scope, result application duplication, direct `RunState` to `StageManager` side effects, and save/reward behavior.

## Runtime Validation

Runtime validation was performed and passed.

- Timer expiration path was validated.
- Player death path was validated.
- Kill goal reached path was validated.
- Explicit stage progress action path was validated.
- Result restart path was validated.
- Pause return / abandon path was validated.
- Duplicate save/progress application was not observed.

## Confirmed Semantics

- Timer expired shows result.
- Timer expired reward/save is applied only when the player confirms via RESTART or EXIT.
- Timer expired does not increase stage_progress.
- Player died shows result.
- Player died applies half reward policy only when the player confirms via RESTART or EXIT.
- Player died does not increase stage_progress.
- Kill goal reached alone does not increase stage_progress.
- After kill goal reached, stage_progress increases only when the player explicitly performs the stage progress action.
- Stage progress is an input action available while run time remains after kill goal is reached.
- `StageProgressed` means explicit stage progress action was performed after kill goal reached.
- Reward application includes dust, exp, and stage_progress where applicable.
- Reward/save is not applied at the moment the result view is shown; it is applied on confirming actions such as RESTART, EXIT, or explicit stage progress flow.
- Result restart works and duplicate save/progress was not observed.
- Pause return / abandon works and does not apply reward/save or stage_progress.

## Validation Summary

- `git diff --check`: passed; only Git line-ending warnings were reported.
- Debug x64 build: passed with 16 pre-existing-style conversion warnings and 0 errors.
- `tools\aiworkflow\json_smoke_check.bat`: passed, 11 files OK, 0 failed.
- Runtime validation: passed, based on the confirmed manual runtime semantics recorded above.

## Remaining Risks

- The kill-count constants are now explicit C++ constants. They preserve the stage 1 target and provide linear growth, but the exact long-term balance may need design review.
- Result-screen visual polish remains outside this validation scope.
- Long-term reward/progression balance remains a design follow-up, not a correctness blocker for GAME-002 semantics.

## Next Tasks

- Commit only after the human developer accepts the diff and runtime validation result.

## AI Assistance

Implemented by Codex under the approved GAME-002 reduced-scope task.

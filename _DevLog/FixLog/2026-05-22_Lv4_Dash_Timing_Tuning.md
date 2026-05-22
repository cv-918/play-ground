# Lv4 Dash Timing Tuning

## Summary
- Tuned Lv4 dash timing so the `attack` animation has more time to read during the actual dash phase.
- Lowered dash speed and increased dash duration in `Enemy.json`.

## Background
- Lv4's attack animation shows the monster emerging from the ground.
- The previous dash duration was short enough that the attack animation was difficult to notice.

## Scope
- Data-only tuning for enemy id `4`.
- No animation schema, ability logic, collision logic, or runtime state changes.

## Files Changed
- `PlayGround/Data/Enemy.json`

## Implementation Notes
- Changed `dash_speed_` from `340.0` to `260.0`.
- Changed `dash_duration_` from `0.30` to `0.50`.
- Left charge, cooldown, recovery, damage, knockback, and animation clip data unchanged.

## Review Summary
- Confirmed the change is limited to Lv4 dash data.
- Existing unrelated working tree changes were left untouched.

## Validation Summary
- Parsed `PlayGround/Data/Enemy.json` with PowerShell `ConvertFrom-Json`.
- Ran `git diff --check` for the touched data and DevLog files.
- Build validation was run after the data change.
- Runtime visual validation was not performed in this session.

## Remaining Risks
- The new timing is a first-pass feel value.
- Runtime playtesting should confirm whether the dash still feels threatening while making the emerging attack animation readable.

## Next Tasks
- Spawn Lv4 and confirm the `attack` animation is visible during the dash.
- If the dash travels too far or too slowly, tune speed/duration together.

## AIWorkflow User Guide Update Decision
- No update needed.
- This task changes game tuning data, not AIWorkflow commands, approval behavior, PC Runner routing, task finalization, or user intervention points.

## Local Artifact Policy
- `_Temp`, `_Local`, `node_modules`, `.env`, and local config files were not created or modified for this task.

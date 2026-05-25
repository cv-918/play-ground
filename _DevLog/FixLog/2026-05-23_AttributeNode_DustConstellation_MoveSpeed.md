# Attribute Node Dust Constellation and MoveSpeed Runtime Link

## Summary
- Replaced the live attribute node data with the new `먼지자리 성도` draft.
- Connected `AttributeType::MoveSpeed` to player movement base max speed.

## Background
- The redesign handoff provided a replacement tree under `_Docs/GameDesign/AttributeNode_Redesign_Draft.json`.
- Existing player movement initialization used only `PlayableCharacterJsonInfo::move_speed_max_`.

## Scope
- Replaced `PlayGround/Data/AttributeNode.json`.
- Updated only the player movement initialization path needed for `MoveSpeed`.
- Did not change JSON schema, enums, `SpecialAbilityId`, skill data, or status effect multiplier logic.

## Files Changed
- `PlayGround/Data/AttributeNode.json`
- `PlayGround/Project/Gameplay/Components/PlayerMovement.cpp`

## Architecture Notes
- Attribute stat accumulation remains owned by `UserProfile`.
- `MoveSpeed` now affects `Movement::move_spd_max_` as a base stat.
- Skill/status-effect `MoveSpeedMultiplier` continues to use `Movement::external_move_speed_multiplier_` through `GameplayEffectController`.

## Implementation Notes
- `PlayerMovement` reads `_UserProfile.GetAttributeStat().GetStat(AttributeType::MoveSpeed)` during construction.
- The stat is applied with `Stat::GetTotalIncrease(_info->move_speed_max_)`.
- Since both `TownPlayer` and `StagePlayer` construct `PlayerMovement`, the base player movement component sees the same attribute-adjusted max speed.

## Review Summary
- The replacement JSON preserves the existing field set.
- No new enum values or special ability IDs were introduced.
- The node graph remains rooted at `id_ = 0`.

## Validation Summary
- Parsed `PlayGround/Data/AttributeNode.json` with Node.js JSON parser: passed, 31 nodes.
- Verified all 31 nodes are reachable from root `id_ = 0`: passed.
- Verified no missing parent IDs, missing child IDs, or duplicate IDs: passed.
- Verified required fields and enum value ranges used by the draft: passed.
- `PlayGround/PlayGround.sln Debug|x64 /t:ClCompile`: passed with 0 warnings and 0 errors.
- Full `Debug|x64 /t:Build` reached link but failed with `LNK1168` because `PlayGround.exe` was open/locked.
- Runtime validation was not performed in this session.

## Remaining Risks
- Live balance values are first-pass design data and need playtesting.
- AttributeNodeTree layout and lock/level-down UX still need runtime inspection.
- Full build should be rerun after closing the running game executable.

## Next Tasks
- Close the running `PlayGround.exe` and rerun full `Debug|x64` build.
- Runtime-check node effects for Attack, Hp, AttackRange, CollectionRange, Runtime, and MoveSpeed.

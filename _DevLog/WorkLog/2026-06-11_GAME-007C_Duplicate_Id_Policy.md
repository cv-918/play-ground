# GAME-007C Duplicate-ID Loader Policy

Date: 2026-06-11
Status: completed

## Summary

Implemented the duplicate-id policy approved for GAME-007C:

```text
Core game data duplicate IDs are fatal load failures.
TownNpcPlacement duplicate placement IDs remain non-fatal skipped entries.
```

This removes ambiguous `last wins` / `first wins` differences across core loader paths without changing JSON schemas or valid data content.

## Files Changed

```text
PlayGround/Project/EngineSystems/Json/JsonDataManager.h
PlayGround/Project/Gameplay/GamePlaySystems/Json/SkillDefinitionDataManager.cpp
PlayGround/Project/Gameplay/GamePlaySystems/Json/StageJsonDataManager.cpp
tools/aiworkflow/game007c_duplicate_policy_anchor_check.ps1
tools/aiworkflow/game007c_duplicate_policy_anchor_check.bat
tools/aiworkflow/README.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ProjectStatus.md
_DevLog/WorkLog/2026-06-11_GAME-007C_Duplicate_Id_Policy.md
```

## Policy

### Fatal duplicate IDs

Core gameplay data now treats duplicate IDs as load failure:

```text
Generic JsonDataManager-backed data:
- PlayableCharacter
- Skill
- Particle
- ParticleEmitter
- ParticleEventSet
- Enemy
- AttributeNode
- Dialogue base data

Custom core loaders:
- SkillDefinition
- Stage
- SpawnPool
```

### Non-fatal duplicate placement IDs

Town NPC placement remains non-fatal:

```text
TownNpcPlacement duplicate placement_id -> invalid entry skipped
```

Reason:

```text
TownNpcPlacement is optional placement data and already supports skipping invalid entries while preserving the rest of the scene placement data.
```

## Implementation

### Generic JsonDataManager

Before:

```text
duplicate id -> debug msgbox, later item overwrites earlier item
```

After:

```text
load into local loaded_data_table
duplicate id -> return false
successful scan -> data_table_ = std::move(loaded_data_table)
```

This also avoids clearing/replacing the persistent table until the new data has passed duplicate validation.

### SkillDefinitionDataManager

Before:

```text
duplicate skill id -> debug msgbox, duplicate skipped
```

After:

```text
load into local loaded_data_table
duplicate skill id -> return false
successful scan -> data_table_ = std::move(loaded_data_table)
```

### StageJsonDataManager

Added duplicate checks to the GAME-007B staging maps:

```text
duplicate Stage id -> return false
duplicate SpawnPool id -> return false
```

## TDD / RED-GREEN Evidence

### RED

Added source-anchor smoke:

```bat
tools\aiworkflow\game007c_duplicate_policy_anchor_check.bat
```

Before implementation it failed for the missing fatal duplicate policy anchors:

```text
FAIL generic duplicate fatal policy anchor :: generic duplicate flow does not fail before assignment
FAIL stage duplicate fatal policy anchor :: stage duplicate id is not fatal
FAIL stage duplicate fatal policy anchor :: spawn pool duplicate id is not fatal
```

### GREEN

After implementation:

```text
PASS generic duplicate fatal policy anchor
PASS skill definition duplicate fatal policy anchor
PASS stage duplicate fatal policy anchor
PASS town placement duplicate non-fatal policy anchor
```

## Validation

Commands run:

```bat
tools\aiworkflow\game007c_duplicate_policy_anchor_check.bat
tools\aiworkflow\game007b_stage_loader_safety_anchor_check.bat
tools\aiworkflow\game007a_loader_policy_anchor_check.bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
```

Results:

```text
game007c_duplicate_policy_anchor_check: PASS 4/4 anchor groups
game007b_stage_loader_safety_anchor_check: PASS 2/2 anchor groups
game007a_loader_policy_anchor_check: PASS 3/3 anchor groups
json_smoke_check: Total 11, Failed 0
game_data_loader_readability_check: Warnings 0, Failed 0
```

Build command:

```bat
MSYS2_ARG_CONV_EXCL='*' "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m
```

Result:

```text
빌드했습니다.
경고 9개
오류 0개
```

Warning note:

```text
The warnings are pre-existing C4244 conversion warnings in StagePlayer.cpp, DialogueJsonConverter.cpp, and StageManager.cpp. The changed loader files produced no new build errors.
```

## Remaining Follow-up

Optional future slice:

```text
GAME-007D: Add missing-file optional/fatal scenario smoke for Data directory copies
```

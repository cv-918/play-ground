# GAME-007B Stage Loader Parse / Two-Phase Safety

Date: 2026-06-11
Status: completed

## Summary

Implemented the second GAME-007 implementation slice:

```text
GAME-007B: Add local try/catch and two-phase commit to StageJsonDataManager
```

The change keeps Stage/SpawnPool JSON schema and gameplay behavior unchanged. It only improves failure handling and reload safety in `StageJsonDataManager`.

## Files Changed

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/StageJsonDataManager.cpp
tools/aiworkflow/game007b_stage_loader_safety_anchor_check.ps1
tools/aiworkflow/game007b_stage_loader_safety_anchor_check.bat
tools/aiworkflow/README.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ProjectStatus.md
_DevLog/WorkLog/2026-06-11_GAME-007B_Stage_Loader_Safety.md
```

## Implementation

### Two-phase table commit

Before:

```text
stage_table_.clear()
pool_table_.clear()
open/parse Stage.json
write directly into stage_table_
open/parse SpawnPool.json
write directly into pool_table_
```

Risk:

```text
If reload failed after clearing or after only one file loaded, persistent tables could be left empty or partially repopulated.
```

After:

```text
load Stage.json into loaded_stage_table
load SpawnPool.json into loaded_pool_table
only after both files succeed:
  stage_table_ = std::move(loaded_stage_table)
  pool_table_ = std::move(loaded_pool_table)
```

### Local parse/open failure handling

Added local `try/catch` handling for:

```text
Stage.json nlohmann::json::exception
SpawnPool.json nlohmann::json::exception
```

Open and parse failures now produce explicit logs/debug messages with paths:

```text
Failed to open stage data file
Stage data json parse failed
Failed to open spawn pool data file
Spawn pool json parse failed
```

## TDD / RED-GREEN Evidence

### RED

Added source-anchor smoke:

```bat
tools\aiworkflow\game007b_stage_loader_safety_anchor_check.bat
```

Before implementation it failed as expected:

```text
FAIL stage two-phase commit anchor :: missing loaded_stage_table local staging map
FAIL stage two-phase commit anchor :: missing loaded_pool_table local staging map
FAIL stage two-phase commit anchor :: missing final two-phase commit after both loads
FAIL stage two-phase commit anchor :: persistent tables are still cleared before successful full load
FAIL stage parse failure handling anchor :: missing nlohmann::json::exception catch
FAIL stage parse failure handling anchor :: missing system error log for failure path
FAIL stage parse failure handling anchor :: missing explicit stage parse failure message
FAIL stage parse failure handling anchor :: missing explicit spawn pool parse failure message
```

### GREEN

After implementation:

```text
PASS stage two-phase commit anchor
PASS stage parse failure handling anchor
```

## Validation

Commands run:

```bat
tools\aiworkflow\game007b_stage_loader_safety_anchor_check.bat
tools\aiworkflow\game007a_loader_policy_anchor_check.bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
```

Results:

```text
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
경고 0개
오류 0개
```

## Remaining Follow-ups

Optional future GAME-007 slices remain separate:

```text
GAME-007C: Normalize duplicate-id policy across data managers
GAME-007D: Add missing-file optional/fatal smoke scenarios for Data directory copies
```

Do not bundle these into GAME-007B.

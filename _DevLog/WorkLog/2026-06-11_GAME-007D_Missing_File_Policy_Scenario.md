# GAME-007D Missing-File Policy Scenario Smoke

Date: 2026-06-11
Status: completed

## Summary

Implemented the final GAME-007 validation slice:

```text
GAME-007D: Add missing-file optional/fatal scenario smoke for Data directory copies
```

This closes the GAME-007 data-loader cleanup chain after GAME-007A/B/C.

## Files Changed

```text
tools/aiworkflow/game007d_missing_file_policy_scenario_check.ps1
tools/aiworkflow/game007d_missing_file_policy_scenario_check.bat
tools/aiworkflow/README.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ProjectStatus.md
_DevLog/WorkLog/2026-06-11_GAME-007D_Missing_File_Policy_Scenario.md
```

No gameplay source or game data files were changed in GAME-007D.

## Scenario Smoke Behavior

The smoke creates temporary copies under:

```text
_Temp/AIWorkflowScenarios/game007d_missing_file_policy_<timestamp>/
```

It does not modify real `PlayGround/Data`.

Scenarios:

```text
1. baseline copied Data
   - all required files present
   - optional TownNpcPlacement present
   - expected: pass

2. required-missing scenario
   - remove Enemy.json from temporary copy
   - expected: fail policy with Enemy.json reported as missing required

3. optional-missing scenario
   - remove TownNpcPlacement.json from temporary copy
   - expected: pass required policy and report TownNpcPlacement as missing optional
```

The script also checks source anchors in `GameDataLoader.cpp` so the scenario manifest matches current required/optional source policy:

```text
LoadRequired for core data files
Stage/SpawnPool required policy
LoadOptional for TownNpcPlacement
```

## Validation

Commands run:

```bat
tools\aiworkflow\game007d_missing_file_policy_scenario_check.bat
tools\aiworkflow\game007c_duplicate_policy_anchor_check.bat
tools\aiworkflow\game007b_stage_loader_safety_anchor_check.bat
tools\aiworkflow\game007a_loader_policy_anchor_check.bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
```

Results:

```text
game007d_missing_file_policy_scenario_check:
  PASS source policy anchor
  PASS baseline copied data policy scenario
  PASS required missing file scenario
  PASS optional missing file scenario

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
경고 0개
오류 0개
```

## GAME-007 Closure

Completed slices:

```text
GAME-007 audit: done
GAME-007A path resolver + explicit required/optional policy: done
GAME-007B Stage/SpawnPool parse handling + two-phase commit: done
GAME-007C duplicate-id policy normalization: done
GAME-007D missing-file policy scenario smoke: done
```

Recommended status:

```text
GAME-007: done
```

Remaining possible future work should be opened as new tasks only if needed, not as part of GAME-007.

# GAME-010 Stage.json Stale Grade Cleanup

Date: 2026-06-11
Status: completed

## Summary

Executed the GAME-009 `remove_later` decision for the stale ignored `Stage.json` `grade_` field.

Changed data:

```text
PlayGround/Data/Stage.json
```

Change:

```text
Removed `grade_` from all Stage records.
Kept `id_` and `spawn_pool_id_` unchanged.
```

No C++ runtime behavior was changed.

## TDD / RED-GREEN Evidence

RED command before script existed:

```bat
tools\aiworkflow\game010_stage_grade_cleanup_check.bat
```

Initial failure:

```text
No such file or directory
```

After adding the check but before data cleanup, expected RED failure:

```text
FAIL Stage.json stale grade removed :: Stage id 1 still has stale grade_ key
FAIL Stage.json stale grade removed :: Stage id 2 still has stale grade_ key
FAIL Stage.json stale grade removed :: Stage id 3 still has stale grade_ key
FAIL Stage.json stale grade removed :: Stage id 4 still has stale grade_ key
FAIL Stage.json stale grade removed :: Stage id 5 still has stale grade_ key
FAIL Stage.json stale grade removed :: Stage.json text still contains grade_ key
PASS StageJsonInfo grade remains absent
PASS GAME-009 removal decision still traceable
```

GREEN result after cleanup:

```text
PASS Stage.json stale grade removed
PASS StageJsonInfo grade remains absent
PASS GAME-009 removal decision still traceable
```

## Tooling Added / Updated

Added:

```text
tools/aiworkflow/game010_stage_grade_cleanup_check.ps1
tools/aiworkflow/game010_stage_grade_cleanup_check.bat
```

Updated:

```text
tools/aiworkflow/game009_schema_field_decision_check.ps1
```

Reason:

```text
GAME-009 originally validated the pre-cleanup stale evidence. After GAME-010, it now accepts the post-cleanup state while preserving GAME-009 decision traceability.
```

## Validation

Commands run:

```bat
tools\aiworkflow\game010_stage_grade_cleanup_check.bat
tools\aiworkflow\game009_schema_field_decision_check.bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
tools\aiworkflow\backlog_archive_consistency_check.bat
git diff --check
```

Build command:

```bash
MSYS2_ARG_CONV_EXCL='*' '/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe' PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m
```

Results:

```text
GAME-010 check: PASS
GAME-009 check: PASS
json_smoke_check: Total 11, Failed 0
game_data_loader_readability_check: Warnings 0, Failed 0
backlog_archive_consistency_check: PASS
MSBuild Debug x64: succeeded, 0 warnings, 0 errors
git diff --check: passed with line-ending warnings only
```

## Non-goals

Not changed:

```text
- StageJsonInfo parser shape
- stage runtime selection
- spawn pool behavior
- skill unlock behavior
- town NPC facing behavior
- AttributeNode grade behavior
```

## Follow-up

The GAME-008/GAME-009 unused-schema cleanup chain is closed for current scope. Remaining reserved fields are intentionally inactive future hooks, not cleanup work:

```text
TownNpcPlacement facing
SpawnPool per-enemy spawn_interval_
Skill unlock_type_
```

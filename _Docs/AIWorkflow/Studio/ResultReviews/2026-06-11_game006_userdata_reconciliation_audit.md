# GAME-006 UserData Reconciliation Audit

Date: 2026-06-11
Status: read-only reconciliation audit
Task: GAME-006 - Normalize `UserData.json` and guard level-0 node data

## Purpose

Reconcile whether the older Backlog task `GAME-006` is still actionable after later UserData fixes and save-location changes.

This audit does not change gameplay source, gameplay data, save data, schema, or runtime behavior.

## Original GAME-006 concern

```text
Normalize UserData.json and guard level-0 node data
Reason: Current save data may contain invalid node level
Validation: Load/save roundtrip, node state
```

## Later work found during reconciliation

### 2026-05-13 UserData default and node load guard

Reference:

```text
_DevLog/FixLog/2026-05-13_GAME-20260513-181243_UserData_Default_And_Node_Load_Guard.md
```

Recorded scope:

```text
- Normalize missing or zero stage_progress_ to 1.
- Reset tracked UserData.json stage_progress_ default to 1.
- Guard loaded acquired node entries so invalid level-0, missing-node, zero-max-level, over-max-level, and duplicate entries do not produce inconsistent node state or duplicated stat application.
```

Recorded validation:

```text
- JSON smoke passed.
- GameDataLoader readability passed.
- Debug x64 build passed.
```

### 2026-05-22 LocalAppData save separation

Reference:

```text
_DevLog/FixLog/2026-05-22_UserData_LocalAppData_Save.md
```

Recorded result:

```text
UserData.json was separated from patchable game Data and moved to:
%LOCALAPPDATA%/PlayGround/UserData.json
```

Important implication:

```text
PlayGround/Data/UserData.json may now be absent, and that is valid for publish Data.
```

### 2026-05-23 runtime migration

Reference:

```text
_DevLog/FixLog/2026-05-23_UserData_Runtime_Migration.md
```

Recorded result:

```text
- save_schema_version_ added.
- Missing version is interpreted as legacy version 1.
- Version 1 saves migrate to version 2.
- Existing normalization remains in place for missing attribute nodes, zero levels, duplicate nodes, and stage progress.
```

## Current source evidence

### Default save creation

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.cpp
```

Current behavior:

```text
CreateDefaultUserData()
- save_schema_version_ = CURRENT_USER_DATA_SCHEMA_VERSION
- dust_count_ = 0
- experience_ = 0
- equipped_skill_ids_ = { -1, -1 }
- stage_progress_ = 1
- main_story_progress_ = Prologue1
```

### Load-time normalization

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.cpp
```

Current behavior:

```text
NormalizeUserData()
- stage_progress_ == 0 -> 1
- missing AttributeNode id -> skipped
- acquired node level 0 -> skipped
- AttributeNode max_lv_ == 0 -> skipped
- node level > max_lv_ -> clamped to max_lv_
- duplicate acquired node -> merged using max normalized level
```

### JSON parser defaults

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.h
```

Current behavior:

```text
from_json()
- save_schema_version_ defaults to 1
- acquired_node_ids_ defaults to empty
- equipped_skill_ids_ defaults to { -1, -1 }
- stage_progress_ defaults to 1
- stage_progress_ <= 0 -> 1
- main_story_progress_ <= Undefined -> Prologue1
```

### Save location

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.cpp
```

Current behavior:

```text
GetUserDataPath()
-> %LOCALAPPDATA%/PlayGround/UserData.json
```

Legacy candidates are only used for one-time migration if LocalAppData save is absent.

## Current data evidence

### Patchable Data folder

Attempted read:

```text
PlayGround/Data/UserData.json
```

Result:

```text
not found
```

This is no longer a failure by itself because UserData is now local save data.

### LocalAppData save

Current local save inspected:

```text
C:/Users/kalux/AppData/Local/PlayGround/UserData.json
```

Current values:

```text
save_schema_version_: 2
stage_progress_: 1
acquired_node_ids_: [[0, 1]]
```

AttributeNode id 0 exists:

```text
id_: 0
max_lv_: 1
```

Local save node validation result:

```text
node_issues: none
```

## Validation commands run

### JSON smoke

Command:

```bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
```

Result:

```text
Total: 11
Failed: 0
```

### Game data loader readability

Command:

```bat
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
```

Relevant UserData result:

```text
[OK] UserData.json is absent. This is valid for publish Data because UserDataManager owns LocalAppData save creation.
```

Overall result:

```text
Failed: 15
```

Reason:

```text
AttributeNode children_nodes_info_ reference checks fail because the script currently interprets tuple direction/metadata values as child IDs for several redesigned AttributeNode entries.
```

This failure is not evidence that GAME-006 UserData normalization remains broken. It matches a pre-existing validation-script concern already noted in `2026-05-23_UserData_Runtime_Migration.md`.

## Reconciliation verdict

```text
GAME-006 original concern is satisfied/superseded by later UserData work.
```

Why:

```text
- `PlayGround/Data/UserData.json` is no longer required as patchable data.
- default LocalAppData save creation sets stage_progress_ to 1.
- parser fallback sets stage_progress_ to 1.
- load normalization repairs stage_progress_ == 0.
- load normalization skips level-0 acquired nodes.
- load normalization skips missing nodes and zero-max nodes.
- load normalization clamps over-max levels.
- load normalization merges duplicates.
- current local save has schema version 2, stage_progress_ 1, and valid node [0, 1].
```

## Remaining risks

These are not GAME-006 blockers:

```text
1. Full interactive first-run client smoke was not performed in this audit.
2. game_data_loader_readability_check.bat still has AttributeNode children_nodes_info_ false positives.
3. UserDataManager destructor saves on exit, so runtime launches can still touch the user's LocalAppData save.
```

## Recommended follow-up

### Close GAME-006 as done/superseded

Backlog wording should indicate that GAME-006 was effectively completed by:

```text
GAME-20260513-181243
2026-05-22 UserData LocalAppData save separation
2026-05-23 UserData runtime migration
```

### Create separate follow-up only if desired

If we want to clean the remaining validation noise, create a new focused task:

```text
VAL-ATTR-001: Fix AttributeNode children_nodes_info_ readability check false positives
```

Scope:

```text
Update validation script interpretation only. Do not change AttributeNode data or gameplay source unless a separate data-policy decision says so.
```

## Final recommendation

Do not implement new GAME-006 source/data changes now.

Recommended action:

```text
Mark GAME-006 done/superseded in Backlog and ProjectStatus, then move next gameplay/data planning to either:
- VAL-001C when home playtest is possible, or
- VAL-ATTR-001 validation-script cleanup if we want clean readability evidence before more data work.
```

# GAME-007 Data Loader Path / Failure Policy Audit

Date: 2026-06-11
Status: read-only audit
Task: GAME-007 - Standardize data loader path and failure policy

## Purpose

Audit the current data loader path resolution and failure policy before deciding whether GAME-007 should become an implementation task.

This audit does not change gameplay source, gameplay data, save data, schema, build settings, or runtime behavior.

## Current validation baseline

Commands executed after VAL-ATTR-001 cleanup:

```bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
```

Results:

```text
JSON smoke: Total 11, Failed 0
Game data loader readability: Expected loader files 10, Parsed loader files 10, Warnings 0, Failed 0
```

Working tree at audit start:

```text
?? _Docs/VisualTests/Dusty_BaseSprite_Review_2026-06-08/
```

The VisualTests folder is pre-existing scope-out untracked content.

## Loader map

### GameDataLoader entrypoint

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp
```

Paths are hardcoded as relative `Data/...` strings:

```text
Data/PlayableCharacter.json
Data/dialogue_all_samples.json
Data/Skill.json
Data/Particle.json
Data/ParticleEmitter.json
Data/ParticleEventSet.json
Data/Enemy.json
Data/AttributeNode.json
Data/Stage.json
Data/SpawnPool.json
Data/TownNpcPlacement.json
```

Load order:

```text
PlayableCharacter
Dialogue
SkillJsonDataManager
SkillDefinitionDataManager
Particle
ParticleEmitter
ParticleEventSet
Enemy
AttributeNode
Stage + SpawnPool
UserData
TownNpcPlacement
```

### Generic JsonDataManager

File:

```text
PlayGround/Project/EngineSystems/Json/JsonDataManager.h
```

Used by most array-based data managers.

Current behavior:

```text
std::ifstream file(_file_path)
if open fails -> _DEBUG_MSGBOX + return false
parse JSON array -> vector<T>
clear table after parse succeeds
duplicate id -> _DEBUG_MSGBOX but still overwrites with latest item
generic catch only catches json::exception
path is not resolved beyond the caller-provided relative path
```

Managers using this path include:

```text
PlayableCharacterDataManager
SkillJsonDataManager
ParticleDataManager
ParticleEmitterDataManager
ParticleEventSetDataManager
EnemyDataManager
AttributeNodeDataManager
DialogueJsonDataManager through base Load
```

### SkillDefinitionDataManager

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/SkillDefinitionDataManager.cpp
```

Custom load for compiled skill definitions from `Skill.json`.

Current behavior:

```text
std::ifstream file(_file_path)
open failure -> _DEBUG_MSGBOX + false
parse JSON -> vector<SkillDefinitionJsonInfo>
clear after parse succeeds
duplicate skill id -> _DEBUG_MSGBOX + skip duplicate
catch json::exception
path is raw caller-provided relative path
```

Difference from generic manager:

```text
generic duplicate policy overwrites; SkillDefinition duplicate policy skips duplicate.
```

### StageJsonDataManager

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/StageJsonDataManager.cpp
```

Custom two-file loader:

```text
Stage.json
SpawnPool.json
```

Current behavior:

```text
stage_table_.clear()
pool_table_.clear()
open Stage.json; open failure -> _DEBUG_MSGBOX + false
parse stage JSON without try/catch
open SpawnPool.json; open failure -> _DEBUG_MSGBOX + false
parse spawn pool JSON without try/catch
path is raw caller-provided relative path
```

Important risk:

```text
Tables are cleared before both files are known-good.
If Stage.json loads but SpawnPool.json fails, stage_table_ may already be partially repopulated while pool_table_ is empty.
If parse throws, no local catch normalizes failure reporting.
```

### TownNpcPlacementDataManager

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.cpp
```

Current behavior:

```text
scene_table_.clear()
open failure -> _SYSTEM_LOG_ERROR + _DEBUG_MSGBOX + false
parse failure -> _SYSTEM_LOG_ERROR + _DEBUG_MSGBOX + false
root shape failures -> _SYSTEM_LOG_ERROR + _DEBUG_MSGBOX + false
invalid placement entries -> warn/assert in debug and skip entry
valid entries are loaded
path is raw caller-provided relative path
```

GameDataLoader treats this manager differently:

```text
if TownNpcPlacement load fails:
  log error
  show debug msgbox only in _DEBUG
  do not return false
```

This makes TownNpcPlacement optional/non-fatal at GameDataLoader level, even though the manager returns false on open/parse/root failures.

### UserDataManager

File:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/UserDataManager.cpp
```

Current behavior differs from patchable game data:

```text
GetUserDataPath() -> %LOCALAPPDATA%/PlayGround/UserData.json
fallback -> executable_dir/Saved/UserData.json
legacy Data/UserData.json only used for one-time migration if LocalAppData save is absent
missing save -> create default LocalAppData save
corrupt save -> backup and recreate default
version migration -> backup and migrate to current schema
```

UserDataManager also owns its own relative-path resolver for legacy explicit `Load(file_path)` / `Save(file_path)` calls:

```text
ResolveProjectRelativePath(file_path)
- absolute path returns as-is
- current-path ancestor with PlayGround.vcxproj
- executable-dir ancestor with PlayGround.vcxproj
- executable-dir relative path if exists
- fallback current_path / requested_path
```

Important difference:

```text
UserData has robust save-path ownership and path resolution.
Patchable data loaders mostly rely on current working directory relative `Data/...` paths.
```

## Failure policy classification

| Loader | Missing file | Parse error | Duplicate / invalid content | Fatal to LoadAll |
|---|---|---|---|---|
| Generic JsonDataManager | false + debug msgbox | false + debug msgbox | duplicate debug msgbox, latest overwrites | yes for required managers |
| DialogueJsonDataManager | base false | base false | empty/duplicate key debug msgbox, invalid key skipped, load still true | yes only if base load fails |
| SkillDefinitionDataManager | false + debug msgbox | false + debug msgbox | duplicate debug msgbox, duplicate skipped | yes |
| StageJsonDataManager | false + debug msgbox | uncaught local parse path | no explicit duplicate policy in loader | yes |
| UserDataManager | create/migrate/recover default | backup/recreate default on corrupt path | normalize stage/node values | yes if recovery/save fails |
| TownNpcPlacementDataManager | false + error/debug | false + error/debug | invalid placement skipped with warning/assert | no at GameDataLoader level |

## Main inconsistencies

### 1. Patchable data path resolution is cwd-dependent

Most patchable data loads use raw relative paths like:

```text
Data/Enemy.json
```

This works when the process working directory is the expected game root/output directory, but the loader itself does not centralize resolution.

UserData already has stronger resolution logic, but that logic is local to UserDataManager and not shared by patchable data managers.

### 2. Fatal vs optional data policy is implicit

Currently:

```text
Most data files are fatal to GameDataLoader::LoadAll.
TownNpcPlacement is effectively optional at GameDataLoader level.
UserData is recoverable/default-created but still fatal if recovery fails.
```

This policy is implemented directly in sequential `if (!Load(...))` blocks rather than in a shared manifest or table.

### 3. Parse exception handling differs

Generic manager and SkillDefinition catch JSON exceptions.

StageJsonDataManager does not wrap JSON parse/deserialization in a local try/catch.

TownNpcPlacement has strong parse/root shape handling.

### 4. Partial reload safety differs

Generic JsonDataManager clears table only after successful parse to vector.

StageJsonDataManager clears both tables before opening/parsing both files.

TownNpcPlacement clears scene table before opening/parsing root.

This matters for `ReloadAll()` or future live reload paths.

### 5. Duplicate handling differs

Generic manager:

```text
duplicate id -> debug msgbox, later item overwrites earlier item
```

SkillDefinition:

```text
duplicate id -> debug msgbox, duplicate skipped
```

TownNpcPlacement:

```text
duplicate placement_id -> invalid entry skipped
```

Stage loader:

```text
no explicit duplicate policy; map assignment overwrites
```

## Recommended implementation slice

Do not immediately rewrite all managers.

Recommended next task:

```text
GAME-007A: Add patchable data path resolver and loader policy table
```

Scope:

```text
- Add a small path resolver for patchable Data files.
- Keep UserData LocalAppData ownership separate.
- Make GameDataLoader use the resolver for patchable data paths.
- Represent required/optional load policy explicitly in GameDataLoader.
- Preserve current fatal/optional behavior:
  - required: PlayableCharacter, Dialogue, Skill, Particle, ParticleEmitter, ParticleEventSet, Enemy, AttributeNode, Stage/SpawnPool, UserData
  - optional/non-fatal: TownNpcPlacement
```

Non-goals:

```text
- Do not change JSON schema.
- Do not move UserData back into patchable Data.
- Do not change save/load migration behavior.
- Do not redesign all data managers.
- Do not change gameplay behavior.
- Do not change asset/resource loading.
```

Validation:

```bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
MSBuild PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64
```

If build is too costly in the current session, at minimum run the two data checks and record build not run.

## Optional later tasks

After GAME-007A, split these separately if still valuable:

```text
GAME-007B: Add local try/catch and two-phase commit to StageJsonDataManager
GAME-007C: Normalize duplicate-id policy across data managers
GAME-007D: Add missing-file optional/fatal smoke scenarios for Data directory copies
```

## Final recommendation

Proceed with GAME-007A before deeper schema cleanup.

Reason:

```text
Data smoke is now green, UserData is reconciled, and VAL-001C is parked for manual playtest. A small path/policy cleanup would reduce future boot/reload fragility without requiring gameplay tuning or asset/runtime visual validation.
```

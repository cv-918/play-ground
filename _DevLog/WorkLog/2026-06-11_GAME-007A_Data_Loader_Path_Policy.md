# GAME-007A Patchable Data Loader Path / Policy Cleanup

Date: 2026-06-11
Status: completed

## Summary

Implemented the first GAME-007 implementation slice:

```text
GAME-007A: Add patchable data path resolver and explicit loader policy table
```

The change keeps gameplay data, save data, JSON schema, UserData migration, and gameplay behavior unchanged.

## Files Changed

```text
PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp
tools/aiworkflow/game007a_loader_policy_anchor_check.ps1
tools/aiworkflow/game007a_loader_policy_anchor_check.bat
tools/aiworkflow/README.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ProjectStatus.md
_DevLog/WorkLog/2026-06-11_GAME-007A_Data_Loader_Path_Policy.md
```

## Implementation

### Patchable data path resolver

Added `ResolvePatchableDataPath()` in `GameDataLoader.cpp` for patchable game data files.

Behavior:

```text
- absolute path -> preserved
- probe current working directory + requested Data path
- probe ancestors of current working directory
- probe executable directory via GetModuleFileNameW
- probe ancestors of executable directory
- also probe ancestor / PlayGround / Data path for repo-root launches
- fallback to raw requested relative path if no candidate exists
```

This is for patchable game data only.

`UserDataManager` remains separate and still owns LocalAppData save loading:

```text
%LOCALAPPDATA%/PlayGround/UserData.json
```

### Explicit loader failure policy

Added:

```text
LoaderFailurePolicy::Required
LoaderFailurePolicy::Optional
LoadRequired(...)
LoadOptional(...)
```

Required patchable/runtime data still fails `GameDataLoader::LoadAll()` on load failure.

Optional data currently remains:

```text
TownNpcPlacement
```

TownNpcPlacement failure is logged/warned and still allows `LoadAll()` to continue, preserving prior behavior.

### Preserved required data policy

Required loaders now route through `LoadRequired(...)`:

```text
PlayableCharacter
Dialogue
Skill
SkillDefinition
Particle
ParticleEmitter
ParticleEventSet
Enemy
AttributeNode
Stage + SpawnPool
UserData remains separate required LoadUserData()
```

## TDD / RED-GREEN Evidence

### RED

Added source-anchor smoke:

```bat
tools\aiworkflow\game007a_loader_policy_anchor_check.bat
```

Before implementation it failed as expected with missing anchors:

```text
FAIL patchable data path resolver anchor :: missing ResolvePatchableDataPath helper
FAIL explicit loader failure policy anchor :: missing explicit LoaderFailurePolicy enum
FAIL loader call-site policy anchor :: required Enemy load is not routed through policy helper
FAIL loader call-site policy anchor :: Stage/SpawnPool paths are not resolved before load
FAIL loader call-site policy anchor :: TownNpcPlacement is not explicitly optional
```

### GREEN

After implementation:

```text
PASS patchable data path resolver anchor
PASS explicit loader failure policy anchor
PASS loader call-site policy anchor
```

## Validation

Commands run:

```bat
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
tools\aiworkflow\game007a_loader_policy_anchor_check.bat
```

Results:

```text
json_smoke_check: Total 11, Failed 0
game_data_loader_readability_check: Warnings 0, Failed 0
game007a_loader_policy_anchor_check: all 3 anchor groups PASS
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

Note:

```text
Git Bash/MSYS requires MSYS2_ARG_CONV_EXCL='*' for MSBuild /p: arguments.
Without it, /p and /m are converted incorrectly.
```

## Remaining Follow-ups

Optional future GAME-007 slices remain separate:

```text
GAME-007B: Add local try/catch and two-phase commit to StageJsonDataManager
GAME-007C: Normalize duplicate-id policy across data managers
GAME-007D: Add missing-file optional/fatal smoke scenarios for Data directory copies
```

Do not bundle these into GAME-007A.

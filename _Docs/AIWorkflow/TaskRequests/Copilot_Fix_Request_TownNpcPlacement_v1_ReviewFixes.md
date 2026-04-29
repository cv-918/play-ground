# Copilot Fix Request — Town NPC Placement Data System v1

Use this prompt in GitHub Copilot Agent Mode.

---

## Recommended Copilot Model

```text
Model: GPT-5.3-Codex
Intelligence: High
Mode: Agent Mode
Permission: Modify only the approved files listed below
```

---

## Goal

Fix review issues found in the first implementation of the JSON-based Town NPC placement system.

Do not add new features.

Do not broaden scope.

Do not refactor unrelated systems.

---

## Current Context

The first implementation added:

- `Data/TownNpcPlacement.json`
- `TownNpcPlacementDataManager`
- `TownNpcPlacementSpawner`
- `OutGameScene::OnEnter` integration
- `GameDataLoader` integration
- `.vcxproj` and `.vcxproj.filters` entries

The implementation direction is broadly accepted, but review found blocking issues that must be fixed before runtime validation.

---

## Approved Files to Modify

Modify only these files:

```text
PlayGround/PlayGround.vcxproj.filters
PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp
PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp
```

You may also make minimal compile-required adjustments in these files if absolutely necessary:

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.h
PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.cpp
PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.h
PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.cpp
```

Do not modify any other file.

---

## Files Not Allowed to Touch

Do not modify:

```text
PlayGround/Project/Gameplay/Scenes/WorkStationScene.cpp
PlayGround/Project/Gameplay/GamePlaySystems/SceneManager.cpp
PlayGround/Project/Gameplay/Actors/Town/TownPlayer.cpp
PlayGround/Project/Gameplay/Components/TownInteraction.cpp
PlayGround/Project/Gameplay/Common/CommonGamePlayType.h
```

Also do not modify:

```text
Enemy*
Skill*
UserProfile*
Renderer*
Input*
Save/Load*
Dialogue*
Quest*
```

---

## Required Fix 1 — Restore `.vcxproj.filters` Encoding

### Problem

`.vcxproj.filters` contains corrupted Korean filter names such as:

```text
Default\리소???일
```

or equivalent mojibake variants.

### Required Fix

Restore all corrupted resource filter strings back to:

```text
Default\리소스 파일
```

This applies to:

- `<Filter Include="...">`
- `<ResourceCompile><Filter>...</Filter>`
- `<Image><Filter>...</Filter>`

### Constraints

- Do not reformat the entire `.vcxproj.filters` file.
- Do not reorder unrelated project entries.
- Only restore the corrupted filter text and keep the approved new file entries.

---

## Required Fix 2 — Remove Dangerous `OutGameScene::OnEnter` Early Return

### Problem

Current implementation returns early from `OutGameScene::OnEnter` when fewer than 3 NPCs are spawned.

This is unsafe because `OnEnter` may leave the scene partially initialized.

### Required Fix

Do not return from `OutGameScene::OnEnter` solely because `npcs_.size() < 3`.

Instead:

1. Introduce a local guard such as:

```cpp
const bool has_required_story_npcs = (npcs_.size() >= 3);
```

2. If not enough NPCs exist:
   - Log an error.
   - Show the existing debug message if appropriate.
   - Continue the rest of scene initialization.

3. Guard only the story-progress logic that accesses `npcs_[0]`, `npcs_[1]`, or `npcs_[2]`.

Recommended structure:

```cpp
const bool has_required_story_npcs = (npcs_.size() >= 3);
if (!has_required_story_npcs)
{
    _SYSTEM_LOG_ERROR(...);
    _DEBUG_MSGBOX(...);
}

if (has_required_story_npcs)
{
    switch (_UserProfile.GetMainStoryProgress())
    {
        ...
    }
}
```

4. Any direct index access to `npcs_[0]`, `npcs_[1]`, or `npcs_[2]` must be inside this guard.

5. Scene camera setup and other non-NPC-index initialization should still run.

### Constraints

- Do not redesign `OutGameScene` lifecycle.
- Do not convert index-based story logic to placement-id lookup in this fix.
- Do not implement quest, dialogue, or advanced interaction logic.
- Do not modify `TownInteraction`.
- Do not modify `TownPlayer`.

---

## Required Fix 3 — Make Placement Data Load Failure Non-Fatal for `GameDataLoader`

### Problem

Current implementation returns `false` from `GameDataLoader::_LoadAllInternal` if `TownNpcPlacementDataManager::Load` fails.

This is stronger than the approved v1 policy.

Approved policy:

```text
Debug:
- Strong detection through assert/log where consistent.

Release:
- Skip invalid placement entries or safely continue with actionable logs where possible.
```

### Required Fix

Change `GameDataLoader` integration so `TownNpcPlacement.json` load failure does not fail all game data loading.

Expected behavior:

```cpp
if (!_TownNpcPlacementDataMgr.Load(kTownNpcPlacementPath))
{
    _SYSTEM_LOG_ERROR(...);
#ifdef _DEBUG
    _DEBUG_MSGBOX(...);
#endif
    // Continue loading.
    // Do not return false solely because town NPC placement failed.
}
```

### Constraints

- Do not change existing data loading behavior for other required data files.
- Do not refactor `GameDataLoader`.
- Do not make unrelated data optional.
- Only town NPC placement data should be non-fatal in this fix.

---

## Review Notes to Preserve

The following current implementation decisions are still approved and should not be changed:

1. `OutGameScene` remains the target scene.
2. No new `TownScene` class.
3. v1 spawns only `TownNpc`.
4. `npc_id` remains a logical ID only.
5. Placement array order is preserved.
6. Existing `npcs_[index]` story logic remains for v1.
7. Quest, dialogue branching, and advanced interaction remain out of scope.
8. `TownNpcPlacementDataManager` owns loading and validation.
9. `TownNpcPlacementSpawner` owns runtime spawning.
10. `TownNpcPlacementSpawner` must not parse JSON.
11. `TownNpcPlacementDataManager` must not spawn GameObjects.

---

## Optional Minor Cleanup

Only if trivial and inside approved files:

- Fix indentation around `kTownNpcPlacementPath` in `GameDataLoader.cpp`.
- Preserve existing project indentation style.
- Do not reformat unrelated lines.

---

## Stop Conditions

Stop and report instead of continuing if:

- Fixing `.vcxproj.filters` requires broad project file rewriting.
- Guarding `npcs_[0..2]` requires modifying files outside `OutGameScene.cpp`.
- `GameDataLoader` ownership pattern makes non-fatal placement loading unsafe.
- Any fix requires touching forbidden files.
- Build errors require unrelated changes.

When stopping, report:

```text
Reason:
Blocked file or system:
Why it matters:
Recommended next step:
```

---

## Expected Output After Fix

After applying the fix, provide:

```md
## Copilot Fix Summary

### Files Modified
- ...

### Fixes Applied
- ...

### Assumptions
- ...

### Remaining Risks
- ...

### Suggested Validation
1. Build the project.
2. Enter OutGameScene with valid placement data.
3. Confirm existing story interactions still work.
4. Test fewer than 3 active placements and confirm no partial-scene crash.
5. Test missing TownNpcPlacement.json and confirm game data loading continues with diagnostics.
6. Confirm `.vcxproj.filters` Korean filter names are restored.

### Notes for Review
- ...
```

Do not claim build or runtime validation passed unless the user ran it and provided results.

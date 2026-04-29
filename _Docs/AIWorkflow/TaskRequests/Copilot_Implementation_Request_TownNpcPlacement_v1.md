# Copilot Implementation Request — Town NPC Placement Data System v1

Use this prompt in GitHub Copilot Agent Mode.

---

## Goal

Implement the first-pass JSON-based Town NPC placement system for the current town scene runtime.

The actual town scene class is `OutGameScene`.

Do not create a new `TownScene` class.

The goal is to load Town NPC placement data from JSON and spawn existing `TownNpc` instances in `OutGameScene` using the approved placement order.

---

## Approved Decisions

The following decisions are approved:

1. `OutGameScene` is the current town scene target.
2. Do not create a new `TownScene` class.
3. v1 spawns only `TownNpc`.
4. `npc_id` is a logical ID only in v1.
5. Preserve placement array order so existing `npcs_[index]` logic remains stable.
6. Do not implement quest logic.
7. Do not implement dialogue branching.
8. Do not implement advanced interaction logic.
9. Use the approved file creation/modification boundaries.
10. Invalid data policy:
    - Debug: strong detection through assert/log where consistent with existing project style.
    - Release: skip invalid placement entries or safely continue with actionable logs where possible.

---

## Approved Scope

Implement only:

1. Add `TownNpcPlacement.json`.
2. Add Town NPC placement data structures.
3. Add `TownNpcPlacementDataManager`.
4. Add `TownNpcPlacementSpawner`.
5. Load placement data through existing game data loading flow.
6. Apply placement data in `OutGameScene::OnEnter`.
7. Spawn `TownNpc` instances using the existing `ObjectManager::CreateActor<TownNpc>` flow.
8. Store spawned NPC pointers into the existing `npcs_` container in the same order as the JSON `placements` array, excluding disabled or invalid entries.
9. Preserve the existing story-progress switch as much as possible.
10. Add new files to `.vcxproj` and `.vcxproj.filters` if required by the project.

---

## Non-Goals

Do not implement:

- Quest logic
- Dialogue branching
- Advanced interaction logic
- Conditional spawn rules
- Unlock conditions
- Save/load integration
- NPC definition table
- Generic NPC factory
- New `TownScene` class
- `OutGameScene` lifecycle redesign
- Renderer changes
- Input changes
- Enemy system changes
- Skill system changes
- Player progression changes
- Broad refactoring
- Editor tooling
- Hot reload
- Runtime placement editing

---

## Files Allowed to Create

Create only these files unless a required project convention forces a different path.

If a different path is required, stop and report before continuing.

```text
PlayGround/Data/TownNpcPlacement.json

PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.h
PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.cpp

PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.h
PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.cpp
```

---

## Files Allowed to Modify

Modify only these files:

```text
PlayGround/Project/Gameplay/Scenes/OutGameScene.h
PlayGround/Project/Gameplay/Scenes/OutGameScene.cpp

PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp

PlayGround/PlayGround.vcxproj
PlayGround/PlayGround.vcxproj.filters
```

Only modify `.vcxproj` and `.filters` if the project requires explicit inclusion of new `.h/.cpp` files.

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

unless the current file already requires a compile-only include adjustment directly caused by the approved change. If so, stop and report first.

---

## Approved JSON Schema

Create this initial file:

```text
PlayGround/Data/TownNpcPlacement.json
```

Use this schema shape:

```json
{
  "scene_id": "out_game",
  "placements": [
    {
      "placement_id": "town_engineer_001",
      "npc_id": "engineer",
      "position": {
        "x": 320.0,
        "y": 180.0,
        "z": 0.0
      },
      "facing": "right",
      "enabled": true
    }
  ]
}
```

### Field Semantics

- `scene_id`
  - Required.
  - Identifies the placement set target scene.
  - v1 target value: `"out_game"`.

- `placements`
  - Required.
  - Stable ordered array.
  - The order must be preserved when filling `OutGameScene::npcs_`.

- `placement_id`
  - Required.
  - Unique placement instance ID.
  - Used for debugging and future lookup.

- `npc_id`
  - Required.
  - Logical NPC ID only in v1.
  - Does not select a different C++ class in v1.
  - All v1 entries spawn `TownNpc`.

- `position`
  - Required.
  - Use the existing project position/vector type.
  - Codex identified `Vector3` and `Transform` as relevant existing types. Follow existing project conventions.

- `facing`
  - Optional.
  - Store if straightforward.
  - Do not add large behavior for this in v1.
  - If no current visual behavior exists, keep it as data only or ignore safely with a note.

- `enabled`
  - Optional.
  - Default: `true`.
  - If `false`, skip spawning the entry.

---

## Data Manager Requirements

Create `TownNpcPlacementDataManager`.

Responsibilities:

- Load `Data/TownNpcPlacement.json`.
- Parse placement data.
- Validate required fields.
- Preserve placement array order.
- Provide access to placement entries for `scene_id == "out_game"`.
- Provide enough diagnostics for invalid entries.
- Do not spawn `TownNpc`.
- Do not know `ObjectManager`.
- Do not know `OutGameScene`.
- Do not implement quest, dialogue, or interaction behavior.

Preferred behavior:

- Follow existing JSON loading style in the project.
- If using `nlohmann::json`, follow existing project macros/conventions where appropriate.
- If existing `JsonDataManager<T>` is not suitable because it uses unordered ID map behavior, use a dedicated manager style similar in spirit to existing custom JSON data managers.

Invalid data policy:

- Missing `placements`: fail clearly.
- Missing `placement_id`: invalid entry.
- Missing or empty `npc_id`: invalid entry.
- Missing `position`: invalid entry.
- Duplicate `placement_id`:
  - Debug: strong detection through assert/log if consistent.
  - Release: keep first valid entry and skip duplicates if practical.
- Missing file:
  - Do not crash release behavior if avoidable.
  - Produce actionable diagnostic.

---

## Spawner Requirements

Create `TownNpcPlacementSpawner`.

Responsibilities:

- Receive placement entries from `TownNpcPlacementDataManager`.
- Spawn `TownNpc` using the existing `ObjectManager::CreateActor<TownNpc>` flow.
- Set transform position using the existing `Transform` / position API.
- Apply name or debug identifier if there is an existing safe API such as `SetName`.
- Return spawned `TownNpc*` values in placement array order.
- Skip disabled entries.
- Skip invalid entries already marked invalid or unavailable.
- Do not parse JSON.
- Do not load files.
- Do not implement quest, dialogue, or advanced interaction.

Important:

- `TownNpcPlacementSpawner` must not own scene lifecycle.
- `TownNpcPlacementSpawner` must not alter existing story-progress logic.
- If applying `facing` requires new behavior, do not implement it in v1. Store or ignore with a clear note.

---

## OutGameScene Integration Requirements

Modify `OutGameScene` minimally.

Required behavior:

1. In `OutGameScene::OnEnter`, after background/nav mesh/player setup and before existing story-progress logic that assumes NPC pointers, apply Town NPC placements.
2. Spawned NPCs must be stored in the existing `npcs_` container in placement array order.
3. Preserve existing `npcs_[0]`, `npcs_[1]`, `npcs_[2]` story-progress usage as much as possible.
4. Do not redesign `OutGameScene` lifecycle.
5. Do not introduce quest or dialogue branching.
6. Do not change `TownInteraction` or `TownPlayer` unless a compile-only issue forces a stop-and-report.

If the existing code currently hardcodes NPC creation, replace only the NPC creation portion with placement-based spawning while preserving behavior around callbacks and story-progress logic.

If callbacks or interaction setup are currently tied to specific indices:

- Keep the existing index-based logic for v1.
- Do not convert to placement-id lookup in this pass unless it is trivial and does not expand scope.
- Note this as a future improvement.

---

## GameDataLoader Integration Requirements

Modify `GameDataLoader.cpp` minimally to load the new placement data.

Requirements:

- Follow existing data load order/style.
- Add `Data/TownNpcPlacement.json` load.
- Do not refactor unrelated data loading.
- Do not change existing data manager behavior.
- If a global accessor or manager registration pattern is required, follow the existing convention.

If the correct global ownership pattern is unclear, stop and report.

---

## Project File Requirements

If the Visual Studio project requires explicit file registration:

- Add new `.h/.cpp` files to `PlayGround.vcxproj`.
- Add matching filter entries to `PlayGround.vcxproj.filters`.

Do not reformat the project files broadly.

Do not reorder unrelated entries.

Only add the minimum required entries.

---

## Required Implementation Order

Follow this order:

1. Inspect existing `OutGameScene`, `GameDataLoader`, JSON manager, and `ObjectManager::CreateActor` usage.
2. Add placement data structures and manager.
3. Add placement JSON sample.
4. Add spawner.
5. Add data loading integration.
6. Add minimal `OutGameScene` integration.
7. Add `.vcxproj` and `.filters` entries if required.
8. Provide implementation summary.
9. Stop before claiming validation.

---

## Forbidden Changes

Do not:

- Create a new `TownScene`.
- Create a generic NPC factory.
- Create an NPC definition table.
- Add quest logic.
- Add dialogue branching.
- Add advanced interaction logic.
- Add save/load integration.
- Modify `TownInteraction`.
- Modify `TownPlayer`.
- Modify `SceneManager`.
- Modify renderer/input/enemy/skill/user profile systems.
- Replace existing story-progress logic.
- Convert existing `npcs_[index]` logic to ID lookup in this pass.
- Add broad refactoring.
- Change folder structure.
- Claim tests passed without user-provided evidence.
- Hide invalid data silently.

---

## Stop Conditions

Stop and report instead of continuing if:

- `OutGameScene` structure differs from the expected analysis.
- Existing NPC creation cannot be performed through `ObjectManager::CreateActor<TownNpc>`.
- `npcs_` cannot safely preserve placement order.
- The existing story-progress logic requires broader refactoring.
- Required changes exceed the allowed file list.
- Data manager ownership/global access pattern is unclear.
- Project file registration requires non-obvious changes.
- Build errors require changes outside the allowed scope.
- You need to modify quest, dialogue, interaction, renderer, input, enemy, skill, save/load, or progression files.
- You cannot implement the requested behavior without changing approved architecture.

When stopping, report:

```text
Reason:
Blocked file or system:
Why it matters:
Recommended next step:
```

---

## Expected Output After Implementation

After implementation, provide:

```md
## Copilot Implementation Summary

### Files Created
- ...

### Files Modified
- ...

### Key Changes
- ...

### Assumptions
- ...

### Deviations From Request
- ...

### Build Risks
- ...

### Runtime Risks
- ...

### Suggested Validation
1. Build the project in Visual Studio.
2. Run the game.
3. Enter OutGameScene.
4. Confirm TownNpcPlacement.json is loaded.
5. Confirm NPCs spawn at configured positions.
6. Confirm enabled=false entries are skipped.
7. Confirm existing story-progress interactions still work.
8. Re-enter OutGameScene and check for duplicate spawn issues.
9. Test invalid placement data according to the approved policy.

### Notes for Review
- ...
```

Do not claim that build or runtime validation passed unless the user actually runs them and provides results.

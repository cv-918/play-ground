# GAME-008 Unused Schema Fields Audit

Status: Read-only analysis
Date: 2026-06-10
Task: GAME-008 — Audit unused schema fields
Scope: Read-only field usage audit for backlog-mentioned fields: `facing`, `spawn_interval_`, `unlock_type_`, `grade_`.

## 1. Verdict

PASS — backlog에서 언급된 4개 필드의 현재 load / runtime usage / ambiguity를 read-only로 정리했다.

No source/data/schema/asset changes were made.

## 2. Summary Table

| Field | Data file | Loaded / parsed? | Confirmed consumer? | Classification | Notes |
|---|---|---:|---:|---|---|
| `facing` | `TownNpcPlacement.json` | yes | no | parsed but unused | Stored in `TownNpcPlacementEntry::facing_`, but `TownNpcPlacementSpawner` does not apply it. |
| `spawn_interval_` | `SpawnPool.json` | yes | no for per-enemy interval | likely unused runtime field | `StageManager::_SelectMonsterFromPool` uses `weight_` and `id_`, not per-entry `spawn_interval_`. |
| `unlock_type_` | `Skill.json` | yes | no | likely future/unused field | Loaded into `SkillJsonInfo`; current searches found no unlock-rule consumer. |
| `grade_` | `AttributeNode.json` | yes | yes | used | Attribute node tooltip displays node grade. |
| `grade_` | `Stage.json` | no effective parse | no | stale/ignored data field | `StageJsonInfo` maps only `id_` and `spawn_pool_id_`; `Stage.json` `grade_` appears ignored. |

## 3. Confirmed Context

Backlog entry:

```text
GAME-008 | P3 | todo | analysis | Audit unused schema fields | `facing`, `spawn_interval_`, `unlock_type_`, `grade_` unclear | ChatGPT -> Codex | Field usage table
```

Read-only files inspected:

```text
PlayGround/Data/TownNpcPlacement.json
PlayGround/Data/SpawnPool.json
PlayGround/Data/Skill.json
PlayGround/Data/AttributeNode.json
PlayGround/Data/Stage.json
PlayGround/Project/Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.*
PlayGround/Project/Gameplay/GamePlaySystems/TownNpcPlacementSpawner.*
PlayGround/Project/Gameplay/GamePlaySystems/Json/StageJsonDataManager.*
PlayGround/Project/Gameplay/GamePlaySystems/StageManager.*
PlayGround/Project/Gameplay/GamePlaySystems/Json/SkillJsonDataManager.h
PlayGround/Project/Gameplay/GamePlaySystems/SkillManager.cpp
PlayGround/Project/Gameplay/GamePlaySystems/Skills/SkillBase.*
PlayGround/Project/Gameplay/UI/Widgets/AttributeNodeToolTip.cpp
PlayGround/Project/Gameplay/UI/Views/OutGameSkillView.cpp
PlayGround/Project/Gameplay/UI/Widgets/*Skill*.cpp
```

Validation performed:

```text
JSON parse / key occurrence scan
C++ direct occurrence scan
Focused read-back of high-signal files
```

## 4. Field Details

### 4.1 `facing`

Data occurrence:

```text
PlayGround/Data/TownNpcPlacement.json
```

Observed values:

```text
right
```

Load evidence:

```cpp
// TownNpcPlacementDataManager.h
struct TownNpcPlacementEntry
{
    std::string placement_id_;
    std::string npc_id_;
    _Vector3 position_ = _Vector3::Zero();
    _float visual_width_ = 80.f;
    std::string facing_;
    _bool enabled_ = true;
};

// TownNpcPlacementDataManager.cpp
if (entry_json.contains("facing") && entry_json["facing"].is_string())
    entry.facing_ = entry_json["facing"].get<std::string>();
```

Consumer check:

```cpp
// TownNpcPlacementSpawner.cpp
create_info.position = _ResolvePosition(placement.position_, _target_area);
create_info.sprite_path = _ResolveTownNpcSpritePath(placement.npc_id_);
create_info.visual_width = placement.visual_width_;
```

`TownNpcPlacementSpawner::Spawn` and `ApplyPositions` use:

```text
placement.enabled_
placement.position_
placement.npc_id_
placement.visual_width_
placement.placement_id_
```

They do not apply:

```text
placement.facing_
```

Classification:

```text
parsed but unused
```

Risk / interpretation:

```text
If NPCs should face a designed direction in town, this field currently does not appear to affect transform direction or sprite flip.
```

Possible later actions, requiring approval:

```text
A. Keep as future field and document as currently unused.
B. Implement facing consumer in TownNpcPlacementSpawner/TownNpc/Town actor orientation.
C. Remove from JSON later if confirmed unnecessary.
```

### 4.2 `spawn_interval_`

Data occurrence:

```text
PlayGround/Data/SpawnPool.json
```

Observed sample values:

```text
0.0
1.0
1.5
4.0
```

Load evidence:

```cpp
// StageJsonDataManager.h
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
    SpawnEnemyJsonInfo,
    id_,
    weight_,
    spawn_interval_
)
```

Spawn selection evidence:

```cpp
// StageManager::_SpawnEnemy
const auto enemy_id = _SelectMonsterFromPool(pool_info->spawn_enemies_info_);

// StageManager::_SelectMonsterFromPool
_uint total_weight = 0;
for (const auto& enemy : _pool)
    total_weight += enemy.weight_;

...

for (const auto& enemy : _pool)
{
    current_sum += enemy.weight_;
    if (random_val < current_sum)
        return enemy.id_;
}
```

Runtime global spawn interval caveat:

```cpp
// StageManager.cpp
spawn_interval_ = 1.0 / (1.0 + (stage_elapsed_time_ / 60.0) * 0.5);
if (spawn_timer_ >= spawn_interval_)
```

This `StageManager::spawn_interval_` is a runtime global spawn timer interval. It is not the per-enemy `SpawnEnemyJsonInfo::spawn_interval_` from `SpawnPool.json`.

Classification:

```text
likely unused runtime field as a per-enemy spawn-pool field
```

Risk / interpretation:

```text
SpawnPool.json appears to author per-enemy spawn interval values, but current spawn logic selects enemies by weight only. If those values were meant to throttle specific enemy types, that behavior is not currently confirmed in the checked path.
```

Possible later actions, requiring approval:

```text
A. Keep as planned future field and document not currently active.
B. Implement per-enemy spawn throttling policy.
C. Remove from data/schema later if not wanted.
```

### 4.3 `unlock_type_`

Data occurrence:

```text
PlayGround/Data/Skill.json
```

Observed values:

```text
0 for all checked Skill.json entries
```

Load evidence:

```cpp
// SkillJsonDataManager.h
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
    SkillJsonInfo,
    id_,
    name_,
    desc_,
    icon_path_,
    type_,
    max_lv_,
    unlock_type_,
    cooldown_,
    duration_,
    dot_interval_,
    area_of_effect_,
    damage_multiplier_,
    flat_damage_,
    proj_count_,
    proj_speed_,
    proj_lifetime_,
    proj_size_
)
```

Definition evidence:

```cpp
// CommonGamePlayType.h
/** 스킬 잠금 해제 방식. 필요에 따라 스킬 잠금 해제 조건을 관리하는 로직에서 활용할 수 있습니다. */
enum class SkillUnlockType
{
    Undefined = 0,
    NodeUnlock,
    StageClear,
    ResourceAmount,
    TimeElapsed,
};

// SkillJsonInfo
SkillUnlockType unlock_type_ = SkillUnlockType::Undefined;
```

Consumer check:

```text
Search found loading/storage and SkillJsonInfo access through SkillManager, SkillBase, skill UI, and skill slots.
No confirmed branch/rule using unlock_type_ was found in this pass.
```

Classification:

```text
likely future/unused field
```

Risk / interpretation:

```text
Skill unlock policy appears not to be driven by SkillJsonInfo::unlock_type_ at present. Current values are all 0, so even if a future consumer is added, current data represents Undefined unless 0 is intentionally treated as default.
```

Possible later actions, requiring approval:

```text
A. Keep as future skill-unlock policy field.
B. Define and implement actual unlock policy usage.
C. Remove/deprecate if skill unlocks are driven by another system.
```

### 4.4 `grade_` in `AttributeNode.json`

Data occurrence:

```text
PlayGround/Data/AttributeNode.json
```

Load evidence:

```cpp
// AttributeNodeDataManager.h
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(... grade_ ...)
```

Consumer evidence:

```cpp
// AttributeNodeToolTip.cpp
const auto grade = target_info->grade_;
const auto name = _UtilFunc::ToWString(target_info->name_);
...
swprintf_s(buffer, L"[%s] %s [%d / %d]", _CommonGamePlayFunc::GetNodeGradeName(grade).c_str(), name.c_str(), curr_lv, max_lv);
```

Classification:

```text
used
```

Risk / interpretation:

```text
AttributeNode.json grade_ should not be removed without replacing tooltip/display behavior.
```

### 4.5 `grade_` in `Stage.json`

Data occurrence:

```text
PlayGround/Data/Stage.json
```

Observed records:

```json
{
  "id_": 1,
  "grade_": 0,
  "spawn_pool_id_": 1
}
```

Parser evidence:

```cpp
// StageJsonDataManager.h
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
    StageJsonInfo,
    id_,
    spawn_pool_id_
)
```

`StageJsonInfo` does not map `grade_`.

Classification:

```text
stale/ignored data field
```

Risk / interpretation:

```text
Stage.json carries grade_ values, but the current StageJsonInfo parser ignores them. If stage grade is intended, the schema/runtime model is incomplete. If not intended, these are stale fields.
```

Possible later actions, requiring approval:

```text
A. Keep but document as inactive/future stage metadata.
B. Add StageJsonInfo::grade_ and define how stage grade is used.
C. Remove from Stage.json after schema/data cleanup approval.
```

## 5. Findings by Confidence

High confidence:

```text
AttributeNode.json grade_ is used.
Stage.json grade_ is ignored by current StageJsonInfo parser.
TownNpcPlacement.json facing is parsed but not applied by TownNpcPlacementSpawner.
SpawnPool.json per-entry spawn_interval_ is not used by checked weighted spawn selection path.
```

Medium confidence:

```text
Skill.json unlock_type_ is currently unused/future. Direct searches found no unlock-rule consumer, but broader design intent may exist outside the checked flow.
```

## 6. Recommended Follow-up Tasks

Recommended next task candidates:

### GAME-008A — Schema field decision table

Create a decision table for each unclear field:

```text
field
current status
keep / implement / deprecate / remove
owner system
required approval
validation plan
```

### GAME-008B — Implement or remove `facing`

Only if town NPC direction matters:

```text
Implement placement.facing_ consumer in TownNpcPlacementSpawner/TownNpc orientation path.
```

### GAME-008C — Decide SpawnPool per-enemy interval policy

Choose one:

```text
Keep weight-only spawning.
Implement per-enemy spawn throttling.
Remove/deprecate per-enemy spawn_interval_.
```

### GAME-008D — Decide Stage grade policy

Choose one:

```text
Treat Stage.json grade_ as stale and remove later.
Treat it as future metadata and document.
Implement StageJsonInfo::grade_ plus runtime/UI use.
```

### GAME-008E — Decide Skill unlock policy

Choose one:

```text
Keep unlock_type_ as future field.
Implement unlock rules.
Remove/deprecate if another unlock system owns this.
```

## 7. Non-goals / Not Performed

Not performed:

```text
source changes
data changes
schema changes
asset changes
build/run validation
field removal
Backlog/ActiveTask update
commit/push
```

## 8. Completion / Gap Analysis

Completion status:

```text
Read-only audit completed for GAME-008 backlog-mentioned fields.
```

Actual work performed:

```text
- Confirmed JSON occurrences.
- Confirmed parser/storage paths.
- Traced focused runtime/UI consumers.
- Classified each field by current usage.
- Saved this audit report.
```

Unexecuted validation:

```text
No build/run/runtime validation; task was read-only analysis.
```

Scope deviation:

```text
no
```

Reapproval needed:

```text
yes for any source/data/schema cleanup or implementation.
```

Commit recommendation:

```text
Commit this report if accepted as GAME-008 read-only audit evidence.
```

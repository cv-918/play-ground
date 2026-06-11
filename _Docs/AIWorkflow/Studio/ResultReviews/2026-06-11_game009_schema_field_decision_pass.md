# GAME-009 Schema Field Decision Pass

Status: Decision completed
Date: 2026-06-11
Task: GAME-009 — Decide follow-up policy for GAME-008 unused/unclear schema fields
Source audit: `_Docs/AIWorkflow/Studio/ResultReviews/2026-06-10_game008_unused_schema_fields_audit.md`

## 1. Verdict

GAME-008 audit is accepted as current evidence. GAME-009 resolves each audited field into one of these buckets:

```text
keep_active
keep_reserved_inactive
remove_later
implement_later
```

No source/data/schema/asset changes are made in this decision pass.

## 2. Decision Table

| Field | Location | Current evidence | Decision | Rationale | Follow-up |
|---|---|---|---|---|---|
| `grade_` | `AttributeNode.json` | Loaded and consumed by `AttributeNodeToolTip` | `keep_active` | This is currently used UI/gameplay display data. | No cleanup. Do not remove. |
| `facing` / `facing_` | `TownNpcPlacement.json` / `TownNpcPlacementEntry` | Parsed, not applied by `TownNpcPlacementSpawner` | `keep_reserved_inactive` | Town NPC orientation is visual/feel-facing and should not be changed before manual playtest/UI direction. Field is harmless and may become useful. | Document as inactive; implementation only if town direction becomes a visible requirement. |
| `spawn_interval_` | per-enemy entries in `SpawnPool.json` | Parsed, but current spawn selection uses `weight_`; runtime has separate global `StageManager::spawn_interval_` | `keep_reserved_inactive` | Values look like future spawn tuning intent. Implementing per-enemy throttling is behavior design, not cleanup. | Open a separate balancing/behavior task only if per-enemy throttling is desired. |
| `unlock_type_` | `Skill.json` / `SkillJsonInfo` | Parsed and enum exists; all current data values are `0`; no unlock-rule consumer found | `keep_reserved_inactive` | Skill unlock policy is likely future progression design. Removing now may erase design intent; implementing now is a larger progression task. | Define skill unlock/progression system later if needed. |
| `grade_` | `Stage.json` | Present in data, ignored by `StageJsonInfo`; current values are all `0` | `remove_later` | Unlike AttributeNode grade, Stage grade is not parsed and all values are neutral. It creates schema ambiguity. | Create a small data cleanup task to remove `grade_` from `Stage.json`, unless stage tier design is revived first. |

## 3. Human-Readable Guidance

### Keep now

```text
AttributeNode.json grade_
```

Reason:

```text
It is used by the attribute node tooltip and should stay part of the active data contract.
```

### Keep as reserved/inactive

```text
TownNpcPlacement facing
SpawnPool per-enemy spawn_interval_
Skill unlock_type_
```

Reason:

```text
These fields are plausible future design hooks. Using them would change visible/gameplay behavior, so implementation should wait for explicit design intent or manual playtest feedback.
```

### Remove later

```text
Stage.json grade_
```

Reason:

```text
It is ignored by the parser, all current values are 0, and it does not have a confirmed design owner. Removing it is likely the cleanest future schema cleanup.
```

## 4. Follow-up Task Candidates

Recommended next small task if continuing game-data cleanup:

```text
GAME-010: Remove stale Stage.json grade_ field
```

Scope:

```text
- Remove `grade_` keys from `PlayGround/Data/Stage.json`
- Add/adjust smoke check proving Stage.json no longer carries ignored grade_
- Run JSON smoke, readability check, GAME-007 checks, and Debug x64 build
```

Optional future tasks, only if design intent appears:

```text
GAME-011: Implement TownNpcPlacement facing consumer
GAME-012: Define SpawnPool per-enemy spawn interval policy
GAME-013: Define Skill unlock_type progression policy
```

## 5. Non-goals

Not part of GAME-009:

```text
- remove Stage.json grade_ now
- implement NPC facing
- implement per-enemy spawn throttling
- implement skill unlock rules
- change JSON schema loaders
- change runtime behavior
```

## 6. Validation Evidence

Validated by source/data search and the dedicated GAME-009 decision smoke:

```text
facing: appears in TownNpcPlacement data and parser only
spawn_interval_: appears in SpawnPool data/parser plus separate StageManager global timer
unlock_type_: appears in Skill data/parser/enum only
AttributeNode grade_: used by AttributeNodeToolTip
Stage grade_: present in Stage.json, absent from StageJsonInfo parser
```

The decision smoke checks that this document contains all five decisions and that the key source/data anchors still match the evidence above.

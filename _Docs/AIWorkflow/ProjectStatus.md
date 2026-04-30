# Project Status

## Metadata Snapshot

```yaml
last_updated: 2026-04-30
analysis_mode: codex_read_only_analysis
workflow_level_actual: Level 2
workflow_level_target_next: Level 3
worktree_status_at_analysis: clean
build_verified_in_this_analysis: false
runtime_verified_in_this_analysis: false
```

This is a planning snapshot based on Codex read-only analysis. It is not a build or runtime validation report.

---

## Workflow State

Current maturity:

```text
Level 2: repeatable semi-automated workflow
```

Evidence:

- AI workflow documents exist.
- Prompt templates exist.
- Task request records exist.
- A real trial completed the path: Orchestrator -> Codex read-only -> Copilot -> diff review -> validation -> DevLog -> commit.
- The missing piece for the next level is a durable state layer:
  - `ProjectStatus.md`
  - `Backlog.md`
  - `ActiveTask.md`

---

## Current Gameplay Status

| Area | Current State | Notes |
|---|---|---|
| Scene Flow | Implemented | `Intro -> OutGame -> InGame -> OutGame` exists. `LoadingScene` appears unconnected. |
| OutGame / Town | Implemented | `OutGameScene` is the current town-like scene. |
| InGame / Combat | Implemented | `Enter -> Ready -> Play -> Result/Exit` structure exists. |
| Run Clear Semantics | Partial / inconsistent | Survival result, kill clear, next-stage availability, and result behavior need unified meaning. |
| Progression / Profile | Implemented but needs validation | Dust, exp, stage progress, story progress, equipped skills, unlocked characters are persisted. |
| Enemy Runtime | Implemented | Enemy combat and abilities exist. |
| Skill Runtime | Implemented | Skill manager, casting/cooldown/status flow exists. |
| Dialogue Runtime | Implemented | Dialogue conversion, runner, typing, choices, skip, and events exist. |
| Dialogue Result Consumption | Partial | `end_reason` and `choice_records` handling remains incomplete. |
| Town NPC Placement | Implemented v1 | Placement JSON loads and spawns `TownNpc`; role logic still order-coupled. |
| Data Loading | Implemented but risky | Critical JSON data may fail parsing. |
| Debug / WorkStation | Implemented | WorkStation scene and JSON reload support exist. |

---

## Current Save/Profile Snapshot

Known save/profile snapshot from analysis:

```yaml
stage_progress: 3
main_story_progress: 6 # Chapter1
dust_count: 1783
experience: 2356
equipped_skill_ids: [1, 2]
unlocked_character_ids: [1]
known_data_anomaly:
  - acquired_node_ids contains a level-0 entry
```

---

## Known Blockers

### Critical JSON Integrity Risk

Codex reported parse failures for:

```text
PlayGround/Data/Skill.json
PlayGround/Data/PlayableCharacter.json
PlayGround/Data/AttributeNode.json
```

These are high-priority blockers because they are loaded by `GameDataLoader`.

Required next action:

```text
Run a focused JSON integrity task before major gameplay work.
```

### Run Clear Semantics Are Split

Current clear/result meaning appears split across:

```text
survival result
kill-count clear condition
next-stage availability
result screen behavior
```

Required next action:

```text
Define intended run clear semantics before modifying StageManager/RunState behavior.
```

### Town NPC Role Coupling

Town story logic still depends on placement order and raw `npcs_[0..2]` access.

Current recommendation:

```text
Defer unless NPC/town story work resumes.
```

---

## Known Risks / Couplings

| Risk | Impact | Recommendation |
|---|---|---|
| Critical JSON files may fail parsing | Startup/data loading risk | Fix before gameplay changes |
| `npcs_[0..2]` story coupling | Town story fragility | Defer if NPC work is low ROI |
| `GetDataByIndex(0)` over unordered data | Non-deterministic selection risk | Fix before character-selection work |
| Dialogue listener mutates profile directly | Event/profile coupling | Review before story expansion |
| Data loader path/failure policy inconsistency | Working directory/reload risk | Standardize later |
| Multiple workflow instruction entry points | Drift risk | Consolidate source-of-truth policy |
| Unused schema fields | Data ambiguity | Audit before schema expansion |

---

## Recommended Next 3 Tasks

1. `GAME-001: Data Integrity and Loader Guard`
2. `GAME-002: Run Clear Semantics Consolidation`
3. `WF-001/WF-002: Durable Workflow State Layer and Status Enum`

---

## Validation Snapshot

```yaml
latest_analysis_was_read_only: true
build_executed_in_latest_analysis: false
runtime_executed_in_latest_analysis: false
manual_validation_executed_in_latest_analysis: false
```

Do not treat this file as validation evidence by itself.

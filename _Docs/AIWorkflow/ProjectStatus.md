# Project Status

Status: Derived/manual status snapshot
Authority: Human-readable status and planning aid. This file is not the task lifecycle source of truth; use `Backlog.md`, `BacklogArchive.md`, `ActiveTask.md`, and `Task_State_Model.md` for task state/history.

## Metadata Snapshot

```yaml
last_updated: 2026-06-11
analysis_mode:
  - workflow_document_cleanup_review
  - superbot_operating_stabilization_review
workflow_level_actual: Discord-first PC Runner execution harness stabilization
workflow_level_target_next: SuperBot and workflow operating stabilization
worktree_status_at_analysis: DOC-001 consolidation completed; only scope-out untracked VisualTests remains
latest_local_script_validation:
  pc_runner_build_profile_plan: passed
  build_test_runner_visual_studio_dry_run: passed
  intake_auto_handoff_policy_smoke: passed
build_verified_in_latest_update: false
runtime_verified_in_latest_update: false
json_syntax_smoke_check:
  total: 11
  failed: 0
```

This is a lightweight workflow status snapshot.

This is not a full gameplay runtime validation report.

---

## Strategic Product Direction

The AI workflow must not overfit to the current Dust Land custom C++ / WinAPI prototype.

Current project context:

```text
Dust Land is currently a custom-engine prototype.
```

Long-term product direction:

```text
Dust Land should eventually be ported to Unity for Steam release.
Future solo-developed games are expected to be Unity-based.
Target platforms include Steam and/or mobile stores such as Google Play.
```

Workflow implication:

```text
The AI Orchestrator workflow should remain engine-agnostic and project-reusable.
Dust Land is a testbed for workflow validation, not the permanent technical baseline.
```

Avoid designing workflow automation that assumes only:

```text
C++
WinAPI
Visual Studio project files
Direct custom engine structure
```

Prefer workflow abstractions that can later support:

```text
Unity projects
C# scripts
Unity scenes/prefabs/assets
Steam release workflows
Google Play / mobile release workflows
multi-project configuration
```

---

## Workflow State

Current maturity:

```text
Discord-first PC Runner execution harness stabilization
```

Completed evidence:

- AI workflow documents exist.
- Prompt templates exist.
- Task request records exist.
- Durable state files were seeded:
  - `ProjectStatus.md`
  - `Backlog.md`
  - `ActiveTask.md`
- PC Runner primitives and Discord runner commands exist.
- PC Runner can create task workspaces, supervise sessions, collect evidence,
  generate VerificationReport/CompletionReport/CompletionCard artifacts, and
  stop at Human Director gates.
- `/ai intake` can use Codex CLI-assisted TaskDraft generation and, for
  allowlisted low-risk work, auto-handoff into PC Runner execution.
- Visual Studio Debug x64 build validation can route through the `build`
  profile and `debug_visual_studio_build`.
- Completion review can use an explicit `mark-done:true` shortcut; commit/push
  remains a separate explicit gate.

Recent validation result:

```text
safe GAME validation policy smoke:
  passed

unsafe GAME mutation policy block:
  passed

build profile plan:
  passed
  command_id: debug_visual_studio_build

Visual Studio build evidence:
  bt-build-20260513-112013-004-16056e99
  MSBuild.exe resolution: visual_studio_auto
  exit_code: 0
```

Current missing pieces for final workflow stabilization:

```text
- align SuperBot Stage 1 operating rules with AIWorkflow and Studio entry points
- consolidate workflow instruction entry points that may drift
- keep ProjectStatus / Backlog / ActiveTask recommendations current
- preserve Unity-ready project-profile direction while using Dust Land as a testbed
- continue pruning or labeling old manual/Discord/runner paths as they become obsolete
```

---

## Discord Orchestrator / PC Runner Status

```yaml
status: active
validated_at: 2026-05-13
permission_level: controlled_write_with_human_gates
workflow_stage: Discord-first PC Runner execution harness stabilization
```

Primary workflow commands:

```text
/ai intake
/ai runner start
/ai completion card
/ai runner accept-completion
/ai task done
/ai git commit
/ai git push
/ai git commit-push
```

Current capability:

```text
Discord can be used as the primary Human Director control surface for intake,
approval, PC Runner execution, completion review, task done, and commit/push
decisions.
```

Safety constraints:

```text
No automatic final approval authority for LLM output.
No automatic unsafe GAME mutation work.
No automatic commit/push/release/deploy.
No arbitrary user-provided shell execution.
Task lifecycle, runtime execution, evidence, verification, and finalization
remain separate.
```

Known limitation:

```text
The harness is ready for small real GAME task stabilization, but broader
autonomous source/data changes should still be introduced incrementally.
```

---

## Current Gameplay Status

| Area | Current State | Notes |
|---|---|---|
| Scene Flow | Implemented | `Intro -> OutGame -> InGame -> OutGame` exists. `LoadingScene` appears unconnected. |
| OutGame / Town | Implemented | `OutGameScene` is the current town-like scene. |
| InGame / Combat | Implemented | `Enter -> Ready -> Play -> Result/Exit` structure exists. |
| Run Clear Semantics | Implemented / validated | GAME-002 consolidated timer expired, player death, kill goal, stage progress, restart, and abandon behavior. |
| Progression / Profile | Implemented with follow-up risk | Dust, exp, stage progress, story progress, equipped skills, and unlocked characters are persisted; GAME-006 was reconciled as satisfied/superseded by later UserData default/load guard, LocalAppData save separation, and runtime migration work. |
| Enemy Runtime | Implemented | Enemy combat and abilities exist. |
| Skill Runtime | Implemented | Skill manager, casting/cooldown/status flow exists. |
| Dialogue Runtime | Implemented | Dialogue conversion, runner, typing, choices, skip, and events exist. |
| Dialogue Result Consumption | Partial | `end_reason` and `choice_records` handling remains incomplete. |
| Town NPC Placement | Implemented v1 | Placement JSON loads and spawns `TownNpc`; role logic still order-coupled. |
| Data Loading | Implemented / runtime validated | GAME-001B validated Debug x64 build, data copy, game boot, Intro to OutGame transition, and no GameDataLoader/OutGame debug errors. |
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
  - acquired_node_ids previously contained a level-0 entry; current UserData load normalization skips level-0 entries, and GAME-006 is reconciled as done/superseded
```

---

## Known Blockers

### JSON / GameDataLoader Status

Previously reported JSON syntax and loader blockers are no longer active:

```text
- JSON syntax smoke passed: 11 total, 0 failed.
- GAME-001B runtime validation passed: Debug x64 build, data copy, game boot,
  Intro to OutGame transition, and no GameDataLoader/OutGame debug errors.
```

Current interpretation:

```text
No active JSON syntax or GameDataLoader boot blocker is recorded here.
Remaining data work should be tracked as focused follow-up tasks such as GAME-007,
GAME-008 follow-ups, or validation-script cleanup rather than reopening broad GAME-001.
```

---

### Run Clear Semantics Status

Previously split run-result behavior was consolidated and validated by GAME-002:

```text
timer expired result
player death result
kill goal reached
stage progress action
result restart
pause abandon
```

Current interpretation:

```text
No active run-clear architecture blocker is recorded here. Future gameplay tuning
should be created as a new focused task if the intended design changes.
```

---

### Workflow Must Stay Unity-Ready

Current automation is C++/WinAPI repository-oriented because Dust Land is currently a custom-engine prototype.

Risk:

```text
If all automation is designed around Visual Studio/C++ only, it will not transfer cleanly to Unity projects.
```

Required next action:

```text
Introduce project-profile abstraction before Discord or multi-project automation.
```

---

## Known Risks / Couplings

| Risk | Impact | Recommendation |
|---|---|---|
| `UserData.json` may contain level-0 node data | Save/profile semantic ambiguity | GAME-006 reconciliation found current load normalization covers this; no new source/data change recommended |
| `npcs_[0..2]` story coupling | Town story fragility | Defer if NPC work is low ROI |
| Dialogue listener mutates profile directly | Event/profile coupling | Review before story expansion |
| Data loader path/failure policy inconsistency | Resolved for current scope | GAME-007A/B/C/D completed: patchable data path resolver, explicit required/optional policy, Stage/SpawnPool parse + two-phase safety, fatal core duplicate IDs, and missing-file policy scenario smoke. |
| C++ custom-engine workflow overfitting | Future Unity reuse risk | Add Unity/project-profile abstraction |
| Multiple workflow / SuperBot instruction entry points | Drift risk | DOC-001 consolidated AIWorkflow entry points; SUPERBOT-001 aligned Stage 1 reading order, artifact flow, stop boundaries, and visual companion |
| Unused schema fields | Data ambiguity | GAME-008 audit evidence exists; defer implementation/removal decisions until game-data work resumes |

---

## Recommended Next 3 Tasks

1. `VAL-001C: Short manual runtime playtest checklist` when home playtest is possible
2. Choose a new explicit gameplay/data task if continuing before home playtest
3. `UNITY-001: Define Unity project workflow profile requirements`

Strategic follow-up:

```text
DOC-001 and SUPERBOT-001 are complete. VAL-001B added automated gameplay
runtime anchor smoke validation for contact/projectile/dust/result/restart
source paths. VAL-001C is parked until home playtest is possible. GAME-006 was
reconciled as done/superseded, VAL-ATTR-001 cleaned the known AttributeNode
readability-script false positives, GAME-007A/GAME-007B/GAME-007C/GAME-007D
completed the data-loader path/policy cleanup chain, and the Backlog was split
into active/parked rows plus `BacklogArchive.md` for completed task history.
```

---

## Validation Snapshot

```yaml
latest_analysis_was_read_only: true
local_scripts_executed: true
status_bat_result: passed
capture_diff_include_untracked_result: passed
json_smoke_check_result: passed
json_smoke_total: 11
json_smoke_failed: 0
game_data_loader_readability_check_result: passed
game_data_loader_readability_failed: 0
game007a_loader_policy_anchor_check_result: passed
game007b_stage_loader_safety_anchor_check_result: passed
game007c_duplicate_policy_anchor_check_result: passed
game007d_missing_file_policy_scenario_check_result: passed
gameplay_runtime_anchor_check_result: passed
run_result_semantics_check_result: passed
build_executed_in_latest_update: true
build_configuration: Debug|x64
build_warnings: 0
build_errors: 0
runtime_executed_in_latest_update: false
manual_gameplay_validation_executed_in_latest_update: false
```

Do not treat this file as full validation evidence.

---

## Reference Areas

Frequently relevant files and systems:

```text
SceneManager
OutGameScene
InGameScene
StageManager
RunState
GameDataLoader
UserProfile
UserDataManager
UserData.json
Skill.json
PlayableCharacter.json
AttributeNode.json
tools/aiworkflow/
_Docs/AIWorkflow/
_DevLog/
AGENTS.md
.github/copilot-instructions.md
```

---

## Operating Note

This document should be updated after:

```text
- major Codex project analysis
- local helper script validation
- meaningful gameplay/system change
- workflow level-up
- blocker resolution
- backlog re-prioritization
- Unity migration/workflow-direction update
```

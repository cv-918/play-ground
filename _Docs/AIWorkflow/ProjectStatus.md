# Project Status

## Metadata Snapshot

```yaml
last_updated: 2026-05-13
analysis_mode:
  - workflow_document_cleanup_review
  - pc_runner_status_review
workflow_level_actual: Discord-first PC Runner execution harness stabilization
workflow_level_target_next: real small GAME task stabilization
worktree_status_at_analysis: documentation cleanup in progress
latest_local_script_validation:
  pc_runner_build_profile_plan: passed
  build_test_runner_visual_studio_dry_run: passed
  intake_auto_handoff_policy_smoke: passed
build_verified_in_latest_update: true
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
- repeat real small GAME source/data tasks through PC Runner
- refine approval policy levels from observed use
- continue reducing completion/commit friction without removing Human Director authority
- keep command/document surface pruned as old manual paths become rare
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
| Run Clear Semantics | Partial / inconsistent | Survival result, kill clear, next-stage availability, and result behavior need unified meaning. |
| Progression / Profile | Implemented but needs validation | Dust, exp, stage progress, story progress, equipped skills, unlocked characters are persisted. |
| Enemy Runtime | Implemented | Enemy combat and abilities exist. |
| Skill Runtime | Implemented | Skill manager, casting/cooldown/status flow exists. |
| Dialogue Runtime | Implemented | Dialogue conversion, runner, typing, choices, skip, and events exist. |
| Dialogue Result Consumption | Partial | `end_reason` and `choice_records` handling remains incomplete. |
| Town NPC Placement | Implemented v1 | Placement JSON loads and spawns `TownNpc`; role logic still order-coupled. |
| Data Loading | Implemented but still needs runtime validation | JSON syntax smoke check passed locally. `GameDataLoader` runtime validation remains separate. |
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

### JSON Integrity Status

Previously reported blocker:

```text
Skill.json
PlayableCharacter.json
AttributeNode.json
```

Current local result:

```text
JSON syntax smoke check passed.
Total: 11
Failed: 0
```

Updated interpretation:

```text
The syntax-level JSON parse blocker is not currently reproduced locally.
```

Remaining required validation:

```text
GameDataLoader runtime validation
boot smoke test
OutGame entry smoke test
data semantic validation
```

Status:

```text
syntax_blocker_cleared
runtime_validation_needed
```

---

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
| `GameDataLoader` runtime behavior not yet revalidated after JSON smoke check | Startup/data loading uncertainty | Run focused boot/data-load validation |
| Run clear semantics split | Gameplay progression ambiguity | Architecture task before implementation |
| `npcs_[0..2]` story coupling | Town story fragility | Defer if NPC work is low ROI |
| `GetDataByIndex(0)` over unordered data | Non-deterministic selection risk | Fix before character-selection work |
| Dialogue listener mutates profile directly | Event/profile coupling | Review before story expansion |
| Data loader path/failure policy inconsistency | Working directory/reload risk | Standardize later |
| C++ custom-engine workflow overfitting | Future Unity reuse risk | Add Unity/project-profile abstraction |
| Multiple workflow instruction entry points | Drift risk | Consolidate source-of-truth policy |
| Unused schema fields | Data ambiguity | Audit before schema expansion |

---

## Recommended Next 3 Tasks

1. `WF-002: Define task status enum and transition rules`
2. `WF-005: Define read-only status summary command for future Discord use`
3. `GAME-001B: Validate GameDataLoader runtime after JSON smoke check`

Strategic follow-up:

```text
UNITY-001: Define Unity project profile requirements for the AI workflow.
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
build_executed_in_latest_update: false
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

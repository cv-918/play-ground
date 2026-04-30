# AI Workflow Backlog

## Purpose

This is the durable TODO list for Dust Land and AI workflow automation.

`Backlog.md` tracks candidate work.

`TaskRequests/` stores execution prompts and task-specific records.

---

## Strategic Direction

The workflow is not Dust Land custom-engine only.

Long-term target:

```text
Unity-based solo game development and release workflow.
```

Target platforms:

```text
Steam
Google Play / mobile stores
```

Dust Land is currently a custom C++/WinAPI prototype and workflow testbed.

Future workflow design must support Unity project profiles and multi-project reuse.

---

## Status Values

```text
todo
analysis
awaiting_approval
ready_for_implementation
in_progress
review
validation
blocked
done
deferred
```

## Kind Values

```text
workflow
architecture
implementation
refactoring
validation
data
documentation
automation
unity
release
```

---

## Backlog Items

| ID | Priority | Status | Kind | Item | Reason | Tool Route | Validation |
|---|---:|---|---|---|---|---|---|
| WF-001 | P0 | done | workflow | Seed `ProjectStatus.md`, `Backlog.md`, `ActiveTask.md` | Durable state layer required for Level 2/Discord future | ChatGPT | Document review |
| WF-002 | P0 | todo | workflow | Define fixed task status enum and lifecycle transitions | Discord bot should not parse free-form workflow state | ChatGPT | Document review |
| WF-003 | P1 | done | automation | Add local full-diff capture script | New-file diff omission was a real issue | ChatGPT -> manual | `capture_diff.bat --include-untracked` passed |
| WF-004 | P1 | done | automation | Add JSON smoke-check routine | Critical JSON parse risk must be detected quickly | ChatGPT -> manual | JSON smoke check passed: total 11, failed 0 |
| WF-005 | P1 | todo | automation | Define read-only status summary command for future Discord use | Discord v1 needs safe status collection | ChatGPT -> manual | status output review |
| WF-006 | P2 | todo | architecture | Design Discord Orchestrator architecture v1 into actionable implementation stages | Long-term goal needs Discord-connected workflow | ChatGPT | Architecture review |
| WF-007 | P2 | todo | automation | Design local Orchestrator Core state machine | Required before Discord writes/routes tasks | ChatGPT | State transition review |
| WF-008 | P3 | deferred | automation | Implement Discord bot adapter | Wait until state files/local scripts stabilize | Future | Integration test |
| WF-009 | P1 | todo | workflow | Define project profile schema for multi-project workflow | Future games are Unity-based; workflow must not overfit to Dust Land C++ prototype | ChatGPT | Schema review |
| UNITY-001 | P1 | todo | unity | Define Unity project workflow profile requirements | Needed for Steam/Play Store Unity projects | ChatGPT | Document review |
| UNITY-002 | P2 | todo | unity | Define Unity validation profile candidates | Unity workflows need build/playmode/editmode/package validation categories | ChatGPT -> Codex later | Validation profile review |
| UNITY-003 | P2 | todo | release | Define release-track workflow fields for Steam and Google Play | Long-term workflow includes publishing, not just coding | ChatGPT | Release checklist review |
| GAME-001 | P0 | partial_done | data | Verify/fix `Skill.json`, `PlayableCharacter.json`, `AttributeNode.json` integrity | Syntax smoke check passed; runtime loader validation remains | Codex -> manual/Copilot | GameDataLoader, boot, OutGame entry |
| GAME-002 | P1 | todo | architecture | Consolidate run clear semantics | Survival/kill clear/next stage are split | ChatGPT -> Codex -> Copilot | Timer, death, kill condition, restart, return, save value |
| GAME-003 | P2 | deferred | refactoring | Replace town `npcs_[index]` dependency with `npc_id` role lookup | Reduces coupling but low ROI now | Codex -> Copilot | Placement reorder, enabled=false, story interaction |
| GAME-004 | P2 | todo | refactoring | Consume dialogue session result explicitly | `end_reason` and `choice_records` TODO remains | Codex -> Copilot | Prologue/chapter flow, skip/end reason |
| GAME-005 | P2 | todo | refactoring | Replace `GetDataByIndex(0)` with deterministic character selection | `unordered_map` index access may be non-deterministic | Codex -> Copilot | Save/order changes, same character spawn |
| GAME-006 | P2 | todo | data | Normalize `UserData.json` and guard level-0 node data | Current save data may contain invalid node level | Codex -> Copilot | Load/save roundtrip, node state |
| GAME-007 | P3 | todo | refactoring | Standardize data loader path and failure policy | Loader policy differs between managers | ChatGPT -> Codex -> manual | cwd boot, reload, optional/fatal separation |
| GAME-008 | P3 | todo | analysis | Audit unused schema fields | `facing`, `spawn_interval_`, `unlock_type_`, `grade_` unclear | ChatGPT -> Codex | Field usage table |
| VAL-001 | P1 | todo | validation | Combat/reward/collection/restart playtest pass | Runtime exists but current evidence is partial | Human validation | Contact, projectile, dust, result values |
| DOC-001 | P1 | todo | documentation | Consolidate workflow instruction entry points | Multiple instruction files may drift | ChatGPT | Document review |

---

## Recommended Next Workflow Task

```text
WF-002: Define fixed task status enum and lifecycle transition rules
```

Reason:

```text
This is the next direct step toward Level 3 and future Discord orchestration.
```

---

## Recommended Next Gameplay Task

```text
GAME-001: Runtime validate GameDataLoader after JSON syntax smoke check
```

Reason:

```text
JSON syntax passed, but runtime loading and game boot are still separate.
```

Recommended path:

```text
Full Path:
ChatGPT orchestrator
-> Codex focused read-only analysis if needed
-> approval
-> runtime validation plan
-> user executes boot/OutGame check
-> update ProjectStatus
```

---

## Automation Track

Recommended workflow automation progression:

```text
WF-001 done
-> WF-003 done
-> WF-004 done
-> WF-002
-> WF-005
-> WF-009
-> WF-006
-> WF-007
-> WF-008
```

Current target:

```text
Level 3 stabilization
```

Discord bot integration should wait until read-only status collection, task state transitions, and project profile abstraction are stable.

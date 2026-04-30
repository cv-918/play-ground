# AI Workflow Backlog

## Purpose

This is the durable TODO list for Dust Land and AI workflow automation.

`Backlog.md` tracks candidate work.

`TaskRequests/` stores execution prompts and task-specific records.

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
```

---

## Backlog Items

| ID | Priority | Status | Kind | Item | Reason | Tool Route | Validation |
|---|---:|---|---|---|---|---|---|
| WF-001 | P0 | done | workflow | Seed `ProjectStatus.md`, `Backlog.md`, `ActiveTask.md` | Durable state layer required for Level 2/Discord future | ChatGPT | Document review |
| WF-002 | P0 | todo | workflow | Define fixed task status enum and lifecycle transitions | Discord bot should not parse free-form workflow state | ChatGPT | Document review |
| WF-003 | P1 | todo | automation | Define local full-diff capture script | New-file diff omission was a real issue | ChatGPT -> manual | Diff capture test |
| WF-004 | P1 | todo | automation | Define JSON smoke-check routine | Critical JSON parse risk must be detected quickly | Codex -> manual | JSON parse report |
| WF-005 | P2 | todo | automation | Define read-only status summary command | Needed for Discord read-only status | ChatGPT -> manual | Status output review |
| WF-006 | P2 | todo | architecture | Design Discord Orchestrator architecture v1 | Long-term goal needs Discord-connected workflow | ChatGPT | Architecture review |
| WF-007 | P2 | todo | automation | Design local Orchestrator Core state machine | Required before Discord writes/routes tasks | ChatGPT | State transition review |
| WF-008 | P3 | deferred | automation | Implement Discord bot adapter | Wait until state files/local scripts stabilize | Future | Integration test |
| GAME-001 | P0 | todo | data | Verify/fix `Skill.json`, `PlayableCharacter.json`, `AttributeNode.json` integrity | Highest blocker from Codex analysis | Codex -> manual/Copilot | JSON parse, GameDataLoader, boot, OutGame entry |
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

## Recommended Next Task

```text
GAME-001: Verify/fix critical JSON integrity
```

Reason:

```text
Other gameplay work may be invalid if core JSON data cannot be parsed.
```

Recommended path:

```text
Full Path:
ChatGPT orchestrator
-> Codex focused read-only analysis
-> approval
-> manual or bounded implementation
-> JSON parse validation
-> boot/OutGame smoke test
-> Dev Log
```

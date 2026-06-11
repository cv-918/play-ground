# AI Workflow Active Backlog

Status: State source
Authority: Active task list and task status source. Derived recommendations should not override task rows or `Task_State_Model.md`.

## Purpose

This is the active TODO list for Dust Land and AI workflow automation.

`Backlog.md` now keeps active and parked work only so day-to-day planning stays readable.
Completed task rows are preserved in `BacklogArchive.md` and remain historical evidence.

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

## Active Backlog Items

| ID | Priority | Status | Kind | Item | Reason | Tool Route | Validation |
|---|---:|---|---|---|---|---|---|
| VAL-001 | P1 | todo | validation | Combat/reward/collection/restart playtest pass | Runtime exists but current evidence is partial | Human validation | Contact, projectile, dust, result values |
| VAL-001C | P1 | in_progress | validation | Short manual runtime playtest checklist | Automated source-anchor and data smoke checks passed; remaining risk is visual/input/UI/scene-flow runtime behavior | Human validation with Hermes checklist support | checklist created at `_Docs/Validation/VAL-001C_Manual_Runtime_Playtest_Checklist.md`; no local executable found yet. |

---

## Parked / Deferred Items

| ID | Priority | Status | Kind | Item | Reason | Tool Route | Validation |
|---|---:|---|---|---|---|---|---|
| WF-007 | P2 | deferred | automation | Design local Orchestrator Core state machine | Required before Discord writes/routes tasks | ChatGPT | deferred: Superseded by the later Studio/PC Runner runtime direction; no separate Human Director action remains in the current Codex App + Studio workflow. |
| WF-008 | P3 | deferred | automation | Implement Discord bot adapter | Wait until state files/local scripts stabilize | Future | Integration test |
| WF-019 | P2 | deferred | automation | Design Discord approval-note workflow | Next Discord stage should record human approvals without executing implementation work | ChatGPT | deferred: Discord-first approval-note work is no longer part of the primary Codex App + Studio workflow. |
| GAME-003 | P2 | deferred | refactoring | Replace town `npcs_[index]` dependency with `npc_id` role lookup | Reduces coupling but low ROI now | Codex -> Copilot | Placement reorder, enabled=false, story interaction |
| VAL-20260513-172031 | P2 | deferred | validation | Validate GameDataLoader data readability and reference integrity | User request is a validation-only task focused on GameDataLoader expected files, JSON shape, ID/reference integrity, and readability, with no requested source, data, schema, runtime, or document changes. | Discord intake -> Codex CLI TaskDraft -> human review | deferred: Superseded by data readability auto-handoff policy fix before runner execution. |

---

## Archive Location

Completed task rows are preserved in:

```text
_Docs/AIWorkflow/BacklogArchive.md
```

Use `tools/aiworkflow/backlog_archive_consistency_check.bat` after changing Backlog or Archive rows.

---

## Recommended Next Gameplay Task

```text
VAL-001C: Short manual runtime playtest checklist when home playtest is possible
```

Reason:

```text
VAL-001C is parked until home playtest is possible. GAME-007 is closed.
If continuing game/data work before home playtest, create a new explicit task such as GAME-009 based on the archived GAME-008 unused-schema audit.
```

---

## Automation Track

```text
Workflow runtime/runner stabilization tasks are completed and archived.
Active workflow work should be created as a new explicit WF task only when needed.
```

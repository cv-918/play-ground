# AIWorkflow State / Tool Schema Map

Status: Draft state-tool contract map
Last updated: 2026-06-11
Authority: Planning and audit document for Batch 5 of `Workflow_Document_Authority_Map.md`
Non-goals: no schema migration, no tool code change, no task lifecycle change, no source/data/runtime change

## 1. Purpose

This document maps the relationship between durable AIWorkflow state documents and tools that parse them.

It exists because several Markdown documents are both human-readable documents and machine-readable tool contracts:

- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/ProjectStatus.md`
- `_Docs/AIWorkflow/Task_State_Model.md`

Future cleanup should not treat these files as ordinary prose. If their field names, sections, table shape, or state names change, tool readers may break or silently produce incomplete status.

## 2. State Source Roles

| Document | Proposed role | Machine-readable parts | Human-readable parts |
|---|---|---|---|
| `Task_State_Model.md` | Canonical state enum and transition model | state names, required field list | explanations, examples, transition rationale |
| `Backlog.md` | Durable task list and task status source | 8-column Markdown task table | recommended sections, notes, rationale |
| `ActiveTask.md` | Current active task source | YAML-like metadata block, known section headings | goals, scope, evidence, notes |
| `ProjectStatus.md` | Human status snapshot / planning aid | metadata snapshot keys read by tools | strategic direction, risk tables, validation summary |

## 3. Current Tool Readers

Known readers include:

| Tool | Reads | Notes |
|---|---|---|
| `tools/aiworkflow/workflow_status.ps1` | `ProjectStatus.md`, `Backlog.md`, `ActiveTask.md`, git status | Main read-only workflow status summary |
| `tools/aiworkflow/role_router_status.ps1` | `ActiveTask.md`, `Backlog.md`, policy docs | Role routing recommendation; has older scalar parsing behavior |
| `tools/aiworkflow/studio_director_console_server.js` | `ActiveTask.md`, `Backlog.md`, `ProjectStatus.md`, runtime artifacts | Studio dashboard/core view |
| `tools/aiworkflow/pc_runner.ps1` | `ActiveTask.md`, `Backlog.md`, runtime artifacts | Runner task context and prompt boundary |
| Runtime/report tools | `Backlog.md` plus runtime artifacts | Verification, completion, finalization, auto-approval, follow-up generation |

## 4. Backlog.md Contract

### Current shape

The active table is expected to use these columns:

```text
| ID | Priority | Status | Kind | Item | Reason | Tool Route | Validation |
```

Tools generally parse this as:

```text
id, priority, status, kind, item, reason, tool_route, validation
```

### Risks

- Multiple tools implement their own Markdown table parser.
- Parsers generally split rows on the `|` character.
- A literal `|` inside a cell may shift columns.
- ID-prefix acceptance differs by tool. Some readers accept only `WF`, `GAME`, `VAL`, `DOC`, `UNITY`; at least one path also considers `DATA`.
- Backlog status documentation does not fully match `Task_State_Model.md`.

### Proposed contract

Until a better storage format exists:

- Keep the 8-column table stable.
- Do not add/remove/reorder columns without a tool migration.
- Avoid literal `|` inside table cells.
- Keep task IDs unique.
- Keep task status values aligned with `Task_State_Model.md`.
- Treat recommendation sections as derived/manual planning notes, not task state source.

## 5. ActiveTask.md Contract

### Current key metadata

Expected metadata fields:

```yaml
task_id:
title:
status:
workflow_path:
priority:
risk_level:
requested_by:
requested_at:
last_updated:
```

### Current key sections

Current document sections include:

```text
Goal
Approved Scope
Non-Goals
Tool Route
Files In Scope
Current Findings
Decision Needed
Human Action Required
Next Action
Validation Plan
Validation Evidence
Handoff Artifacts
Completion Criteria
```

### Known reader drift

| Reader | Expected | Current document | Issue |
|---|---|---|---|
| `workflow_status.ps1` | `## Next Recommended Task` | `## Next Action` | Empty next-recommended field |
| `role_router_status.ps1` | `## Latest Status Note` | `## Current Findings` | Missing latest-status context |
| `studio_director_console_server.js` | scalar `risk` | scalar `risk_level` | Risk can be blank in Studio core |
| `role_router_status.ps1` | older scalar regex using `\s` | blank YAML values | Possible newline-consuming parse bug |

### Proposed contract

- Keep `risk_level` as the canonical field unless a migration chooses `risk`.
- Add aliases or update tool readers rather than changing the document silently.
- Decide whether `Next Action` or `Next Recommended Task` is canonical.
- Decide whether `Current Findings` or `Latest Status Note` is canonical.
- Add a consistency check that validates section presence and active task linkage.

## 6. ProjectStatus.md Contract

### Current key metadata

Current metadata keys include:

```yaml
last_updated:
analysis_mode:
workflow_level_actual:
workflow_level_target_next:
worktree_status_at_analysis:
latest_local_script_validation:
build_verified_in_latest_update:
runtime_verified_in_latest_update:
json_syntax_smoke_check:
```

### Known reader drift

| Reader | Expected | Current document | Issue |
|---|---|---|---|
| `workflow_status.ps1` | `workflow_level_actual`, `workflow_level_target_next` | present | OK |
| `studio_director_console_server.js` | `phase`, `current_goal`, `current_focus` | not present | Studio core project status can be empty |

### Proposed contract

- Treat `ProjectStatus.md` as a human status snapshot, not the task source of truth.
- Keep `workflow_level_actual` and `workflow_level_target_next` if they remain tool-facing.
- Either add compatible metadata aliases for Studio or update Studio to read the current keys.
- Move or mark derived recommendations so they do not compete with `Backlog.md` and `workflow_status.ps1`.

## 7. Required Consistency Checker

A future checker should validate at least:

1. `Backlog.md` table rows have exactly 8 cells.
2. Task IDs are unique.
3. Status values are allowed by `Task_State_Model.md`.
4. `ActiveTask.task_id`, when set, exists in `Backlog.md`.
5. `ActiveTask.status`, when set, is compatible with the Backlog row.
6. Required `ActiveTask.md` metadata fields exist.
7. Required `ActiveTask.md` section headings exist or have accepted aliases.
8. `ProjectStatus.md` includes the keys expected by known readers or approved aliases.
9. Recommended-next text does not point at `done`, `deferred`, `cancelled`, or missing task IDs.
10. `_Docs/AIWorkflow/Studio/` is not described as current Studio product source.

## 8. Recommended Next Implementation Work

Do not immediately rewrite all tools. Use a staged path:

1. Add a read-only consistency checker.
2. Normalize documented contracts.
3. Patch the smallest reader drift first:
   - `studio_director_console_server.js` should understand `risk_level`.
   - `studio_director_console_server.js` should understand current `ProjectStatus.md` keys or the document should add explicit aliases.
   - `role_router_status.ps1` should use the safer scalar parser pattern already present in `workflow_status.ps1`.
4. Only after checks pass, consider moving derived views out of manually edited sections.

## 9. Current Verdict

`PASS_WITH_NOTES` for continuing document authority cleanup.

`BLOCKED` for any schema or parser migration until the Human Director approves the exact migration scope.

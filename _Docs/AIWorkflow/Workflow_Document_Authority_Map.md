# AIWorkflow Document Authority Map

Status: Draft authority map
Last updated: 2026-06-11
Scope: AIWorkflow document-structure audit and normalization planning
Non-goals: no task lifecycle change, no game source/data/runtime change, no automatic commit/push, no approval-policy expansion

## 1. Purpose

This document maps the authority, role, and relationship of the repository's AIWorkflow-related documents before DOC-001 consolidates workflow instruction entry points.

It exists because the current document set contains multiple eras and multiple document roles in the same tree:

- early AI Orchestrator protocol documents;
- Discord / PC Runner workflow documents;
- FinalBlueprint design, implementation, and report documents;
- AIWorkflow-era Studio contracts and records;
- current Studio product-direction documents under `_Docs/Studio/`;
- Universal AI Staff and SuperBot Stage 1 operating documents;
- runtime/status documents that are parsed by tools.

The goal is not to delete or rewrite those documents immediately. The goal is to define which documents are canonical, operational, historical, legacy, generated, or product-direction sources so future cleanup can proceed without creating more drift.

## 2. Authority Labels

Use these labels when classifying AIWorkflow documents.

| Label | Meaning | Edit expectation |
|---|---|---|
| Current canonical | Binding rule or model for current operation | Update deliberately; resolve conflicts in favor of this document |
| Current operational | Practical runbook for current operation | May summarize canonical docs, but should not contradict them |
| Current index / map | Navigation document | Should link to rules instead of duplicating long rules |
| State source | Durable workflow state or task lifecycle source | Must be machine-readable enough for tools; avoid derived summaries |
| Derived / generated | View computed from state sources | Prefer regeneration over manual edits |
| Runtime / evidence record | Durable evidence, result, review, or execution record | Append/store as evidence; do not treat as policy unless promoted |
| Historical record | Completed work record or past analysis | Do not use as current instruction unless explicitly promoted |
| Legacy / manual fallback | Older or fallback workflow path | Keep only when still useful; label clearly |
| Future blueprint | Long-term direction or design candidate | Not current execution law until promoted |
| Product source | Studio product direction source | Applies to Studio product/UX/direction decisions |
| Support / companion | Translation, example, checklist, or prompt support | Helpful for humans/tools, not authoritative over canonical docs |

## 3. Proposed Source-of-Truth Order

When documents conflict, use this order unless the Human Director gives a newer explicit instruction.

1. Latest explicit Human Director instruction.
2. `AGENTS.md` repository-level AI operating rules.
3. Product-direction work for Studio:
   - `_Docs/Studio/README.md`
   - `_Docs/Studio/Foundation/Studio_Director_Workflow_Principles.md`
4. AIWorkflow task state model:
   - `_Docs/AIWorkflow/Task_State_Model.md`
5. Durable task state:
   - `_Docs/AIWorkflow/Backlog.md`
   - `_Docs/AIWorkflow/ActiveTask.md`
6. Current AI staff behavior:
   - `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md`
   - `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md`
7. Current AIWorkflow operating runbook:
   - `_Docs/AIWorkflow/09_Operational_Playbook.md`
8. AIWorkflow index/map documents:
   - `_Docs/AIWorkflow/README.md`
   - this document
9. Current-design FinalBlueprint documents explicitly marked as current.
10. Legacy/manual fallback, historical records, examples, TaskRequests, and companion translations.

Notes:

- `_Docs/AIWorkflow/README.md` should act as an index/map, not as the deepest source of policy truth.
- `_Docs/AIWorkflow/ProjectStatus.md` should be treated as a status snapshot and planning aid, not as the canonical task database.
- `_Docs/AIWorkflow/FinalBlueprint/` needs local status classification before individual files can be safely treated as current rules.

## 4. Folder-Level Authority Map

| Path | Proposed authority | Role | Main risk |
|---|---|---|---|
| `AGENTS.md` | Current canonical | Repository-level AI rules, source-of-truth list, safety boundaries | May need links updated when this map is accepted |
| `_Docs/Studio/` | Product source | Current Studio product direction, UX, and Human Director workflow principles | Can be confused with `_Docs/AIWorkflow/Studio/` |
| `_Docs/AIWorkflow/` root | Mixed | AIWorkflow rules, state docs, runbooks, maps, templates, historical records | Too many root-level docs act like entry points |
| `_Docs/AIWorkflow/FinalBlueprint/` | Mixed: future/current/historical | Workflow blueprints, specs, roadmaps, implementation reports, smoke reports | No local README/status map; too many documents sound canonical |
| `_Docs/AIWorkflow/Studio/` | Runtime / evidence / AIWorkflow-era contracts | AIWorkflow-era Studio records, contracts, templates, ResultReviews, WorkOrders, SuperBot artifact area | Name can be mistaken for current Studio product source |
| `_Docs/AIWorkflow/StudioWiki/` | Support / future knowledge layer | External knowledge-base candidate and promotion workflow | Mostly clear; not primary Studio screen |
| `_Docs/AIWorkflow/KR/` | Support / companion | Required-read Korean companion summaries | Needs clear local README for discoverability |
| `_Docs/AIWorkflow/Guide/` | Support / Human guide | Browser-readable Korean Human Director guide | Guide authority overlaps with FinalBlueprint Human Director guide |
| `_Docs/AIWorkflow/PromptTemplates/` | Support / reusable templates | Prompt templates | Relationship to `06_Task_Templates.md` should be clarified |
| `_Docs/AIWorkflow/TaskRequests/` | Historical/support | Concrete execution request records and reusable prompts | Should not be read as standing policy |
| `tools/aiworkflow/` | Tool implementation | Scripts that parse workflow docs and runtime artifacts | Tool/document field drift exists |

Supporting maps created from this audit:

- `State_Tool_Schema_Map.md` records the state-document/tool-reader contract and known field drift.
- `FinalBlueprint/README.md` classifies FinalBlueprint files so the folder is no longer a flat pile of competing canonical-looking documents.

## 5. Core Document Role Map

| Document | Proposed authority | Intended role | Required cleanup direction |
|---|---|---|---|
| `AGENTS.md` | Current canonical | Top-level repository AI operating rules | Keep concise; link to accepted authority map if promoted |
| `_Docs/AIWorkflow/README.md` | Current index / map | Navigation and reading order | Reduce duplicated policy/runbook text over time |
| `_Docs/AIWorkflow/_FolderPurpose.md` | Current index / map | Folder boundary statement | Add explicit exception/role for durable AIWorkflow-era Studio records if kept |
| `_Docs/AIWorkflow/00_AI_Orchestrator_Overview.md` | Mixed current/historical/future | Overview of AIWorkflow evolution | Label current vs historical vs long-term sections |
| `_Docs/AIWorkflow/01_AI_Orchestrator_Protocol.md` | Legacy/manual fallback unless reaffirmed | Full protocol path | Clarify whether it is regular path, manual fallback, or historical protocol |
| `_Docs/AIWorkflow/02_Workflow_Scope.md` | Current canonical candidate | When to use workflow | Keep as scope canonical; README should summarize only |
| `_Docs/AIWorkflow/03_Agent_Roles.md` | Legacy/current mixed | Early role model | Clarify relationship to SuperBot and Universal AI Staff behavior |
| `_Docs/AIWorkflow/04_Human_Approval_Gates.md` | Current canonical candidate with outdated phrasing | Approval gate rules | Align with scope-based approval: approved scope may proceed; expansion/protected changes require re-approval |
| `_Docs/AIWorkflow/05_Tool_Routing_Rules.md` | Legacy/manual fallback mixed | Tool routing rules | Label old ChatGPT/Copilot/manual path vs current PC Runner/Codex/Hermes path |
| `_Docs/AIWorkflow/06_Task_Templates.md` | Support / template reference | Canonical task template text | Clarify relation to `PromptTemplates/` |
| `_Docs/AIWorkflow/07_Review_Validation_Rules.md` | Current canonical candidate | Review and validation rules | Clarify relation to `Review_Validation_Verdict_Format_v1.md` and runner VerificationReport |
| `_Docs/AIWorkflow/08_DevLog_Rules.md` | Current canonical | DevLog rules | Keep; other docs should summarize/link |
| `_Docs/AIWorkflow/09_Operational_Playbook.md` | Current operational | Day-to-day workflow runbook | Should execute canonical rules, not duplicate all of them |
| `_Docs/AIWorkflow/10_Quick_Checklists.md` | Support | Checklists | Label if any checklist is legacy |
| `_Docs/AIWorkflow/11_Workflow_Examples.md` | Support / examples | Examples | Label examples by current or legacy path |
| `_Docs/AIWorkflow/12_Troubleshooting_and_Recovery_Guide.md` | Support / operational | Recovery guide | Keep linked from README/playbook |
| `_Docs/AIWorkflow/Task_State_Model.md` | Current canonical | Task state enum and transition model | Bring Backlog status description and tool expectations into alignment |
| `_Docs/AIWorkflow/Backlog.md` | State source | Durable task list and task status | Avoid derived recommendations or mark them generated |
| `_Docs/AIWorkflow/ActiveTask.md` | State source | Current active task | Align section names and scalar fields with tools |
| `_Docs/AIWorkflow/ProjectStatus.md` | Derived/manual status snapshot | Human-readable status snapshot | Reduce copied state; clarify not task source of truth |
| `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md` | Current canonical | Common AI staff behavior | Ensure conflict order vs older numbered docs is explicit |
| `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md` | Current canonical for SuperBot Stage 1 | SuperBot operating charter | Clarify why artifacts live under `_Docs/AIWorkflow/Studio/` |

## 6. Known Structural Problems

### 6.1 Too many entry points

These documents all partially define current operation or reading order:

- `AGENTS.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/09_Operational_Playbook.md`
- `_Docs/AIWorkflow/ProjectStatus.md`
- `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md`
- `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md`

Resolution direction:

- `AGENTS.md`: top-level repository rules.
- `README.md`: map/index.
- `09_Operational_Playbook.md`: practical runbook.
- `ProjectStatus.md`: status snapshot only.
- `Universal_AI_Staff_Behavior.md`: staff behavior rule layer.
- `SuperBot_Stage1_Operating_Charter.md`: Stage 1 SuperBot rule layer.

### 6.2 Current vs legacy boundary is unclear

Older ChatGPT/Copilot/manual workflow documents and newer PC Runner/SuperBot/Studio documents coexist. Some older documents still read as current law.

Resolution direction:

- Add document-level status labels.
- Label legacy/manual fallback documents explicitly.
- Keep historical reports as evidence, not current instructions.

### 6.3 Studio path ambiguity

Two Studio roots exist:

- `_Docs/Studio/`: current Studio product direction source of truth.
- `_Docs/AIWorkflow/Studio/`: AIWorkflow-era governed records, contracts, templates, and SuperBot operating artifacts.

Resolution direction:

- Keep `_Docs/Studio/` as product source.
- Keep `_Docs/AIWorkflow/Studio/` only for AIWorkflow-era operational artifacts and durable records unless a future migration is approved.
- Add consistent path notes to relevant maps/READMEs.

### 6.4 FinalBlueprint lacks a local authority index

`_Docs/AIWorkflow/FinalBlueprint/` contains many specs, reports, roadmaps, smoke reports, implementation reports, and Korean companion documents. Several names use strong language such as Final, Official, Roadmap, or Technical Spec.

Resolution direction:

- Add `_Docs/AIWorkflow/FinalBlueprint/README.md`.
- Classify files as current reference, historical spec, implementation report, smoke report, roadmap, KR companion, or superseded/reference only.

### 6.5 Markdown state docs are also tool contracts

`Backlog.md`, `ActiveTask.md`, and `ProjectStatus.md` are human-readable Markdown documents, but tools parse them as machine-readable state.

Known drift:

- `ActiveTask.md` uses `risk_level`; Studio code has a path expecting `risk`.
- `ProjectStatus.md` uses `workflow_level_actual` and `workflow_level_target_next`; Studio code expects `phase`, `current_goal`, and `current_focus`.
- `ActiveTask.md` has `## Next Action`; `workflow_status.ps1` expects `## Next Recommended Task`.
- `ActiveTask.md` has `## Current Findings`; `role_router_status.ps1` expects `## Latest Status Note`.
- Multiple tools parse `Backlog.md` by naively splitting Markdown table rows on `|`.
- Backlog status descriptions and `Task_State_Model.md` enum are not fully aligned.

Resolution direction:

- Define a machine-readable contract for each state document.
- Centralize parsing where possible.
- Add a consistency checker before further automation depends on these files.

### 6.6 Approval policy wording needs alignment

Older approval-gate wording can be read as requiring re-approval before every file edit. Current user-approved operating model is scope-based approval:

- approved work packets authorize needed changes inside approved scope;
- re-ask for scope expansion, schema/save-load/build/workflow policy changes, commits/pushes, or genuine ambiguity.

Resolution direction:

- Align `04_Human_Approval_Gates.md`, `Universal_AI_Staff_Behavior.md`, `SuperBot_Stage1_Operating_Charter.md`, and `AGENTS.md` wording.

## 7. Batch Roadmap

### Batch 0: Authority-map foundation

Status: represented by this draft.

Tasks:

1. Create this authority map.
2. Define labels.
3. Record non-goals and scope boundaries.
4. Do not modify existing operational documents yet.

Exit criteria:

- One document exists that can be reviewed as the proposed authority model.

### Batch 1: Document inventory and classification

Status: partially represented by sections 4 and 5.

Tasks:

1. Inventory AIWorkflow root documents.
2. Inventory important subfolders.
3. Assign provisional labels.
4. Mark ambiguous documents.

Exit criteria:

- Important documents have a proposed authority class.
- Ambiguous documents are visible.

### Batch 2: Source-of-truth hierarchy

Status: proposed in section 3.

Tasks:

1. Confirm conflict-resolution order.
2. Decide whether `02_Workflow_Scope.md`, `04_Human_Approval_Gates.md`, and `07_Review_Validation_Rules.md` remain current canonical.
3. Decide whether `01`, `03`, and `05` are current, mixed, or legacy/manual fallback.

Exit criteria:

- Future agents know which document wins when two documents conflict.

### Batch 3: Current / legacy / historical labels

Status: planned.

Tasks:

1. Define a document header convention.
2. Add labels to high-risk documents first.
3. Avoid mass rewriting content; add labels and notes before deeper edits.

High-risk first pass:

- `00_AI_Orchestrator_Overview.md`
- `01_AI_Orchestrator_Protocol.md`
- `03_Agent_Roles.md`
- `04_Human_Approval_Gates.md`
- `05_Tool_Routing_Rules.md`
- `_Docs/AIWorkflow/FinalBlueprint/`

Exit criteria:

- Older paths no longer look automatically current.

### Batch 4: Studio / AIWorkflow / SuperBot boundary

Status: partially represented by sections 4 and 6.3.

Tasks:

1. Update map/index docs to distinguish `_Docs/Studio/` and `_Docs/AIWorkflow/Studio/`.
2. Keep `_Docs/Studio/` as product direction source.
3. Keep `_Docs/AIWorkflow/Studio/` as AIWorkflow-era records/templates/contracts unless migration is approved.
4. Ensure SuperBot artifact path notes are consistent.

Exit criteria:

- A reader can tell where Studio product direction lives and where SuperBot/AIWorkflow records live.

### Batch 5: State document and tool schema relationship

Status: represented by `State_Tool_Schema_Map.md`.

Tasks:

1. Document state-source contracts for `Backlog.md`, `ActiveTask.md`, and `ProjectStatus.md`.
2. Compare contracts with tool readers.
3. Patch obvious field-name drift only after approval.
4. Add or plan a consistency checker.

Exit criteria:

- Human-readable docs and tool-readable contracts are not silently diverging.

### Batch 6: FinalBlueprint index

Status: represented by `FinalBlueprint/README.md`.

Tasks:

1. Create `_Docs/AIWorkflow/FinalBlueprint/README.md`.
2. Group files by status:
   - current reference;
   - historical spec;
   - implementation report;
   - smoke/validation report;
   - roadmap;
   - Korean companion;
   - superseded/reference only.
3. Link the current reference set from `_Docs/AIWorkflow/README.md` after review.

Exit criteria:

- FinalBlueprint no longer reads as a flat pile of competing canonical documents.

### Batch 7: DOC-001 readiness decision

Status: complete as an authority-map readiness decision.

Decision outcomes:

- PASS: DOC-001 can proceed.
- PASS_WITH_NOTES: DOC-001 can proceed while carrying known cleanup notes.
- BLOCKED: more authority-map cleanup is required first.

Checklist result:

| Check | Result | Evidence |
|---|---|---|
| Core document roles are assigned | PASS | Sections 4 and 5 classify folders and core documents |
| Source-of-truth order is visible | PASS | Section 3 defines the proposed order |
| Studio / AIWorkflow / SuperBot boundary is clear | PASS | `_FolderPurpose.md`, `Studio/README.md`, and section 6.3 distinguish `_Docs/Studio/` from `_Docs/AIWorkflow/Studio/` |
| Current / legacy / historical labeling approach exists | PASS | Section 2 defines labels; high-risk root docs now have minimal status labels |
| State document schema drift is visible | PASS_WITH_NOTES | `State_Tool_Schema_Map.md` records field/section drift and required consistency checks |
| FinalBlueprint is indexed | PASS_WITH_NOTES | `FinalBlueprint/README.md` classifies all current FinalBlueprint markdown files |

Final readiness verdict:

`PASS_WITH_NOTES` for starting DOC-001 consolidation.

DOC-001 may proceed now, but it must carry these notes:

1. Do not rewrite all historical documents at once.
2. Treat `README.md` as an index/map, not the policy source itself.
3. Treat `ProjectStatus.md` as a status snapshot, not the task source of truth.
4. Do not change `Backlog.md`, `ActiveTask.md`, or `ProjectStatus.md` schema without a separate approved migration.
5. Use `State_Tool_Schema_Map.md` before changing tool-facing fields or sections.
6. Use `FinalBlueprint/README.md` before linking a FinalBlueprint document as current authority.
7. Keep `_Docs/Studio/` as current Studio product direction and `_Docs/AIWorkflow/Studio/` as AIWorkflow-era records/templates/contracts/SuperBot artifact area.

## 8. Recommended Next Work

Recommended next batch:

```text
DOC-001: Consolidate workflow instruction entry points
```

Recommended DOC-001 starting scope:

1. Reduce duplicated rule text in `_Docs/AIWorkflow/README.md` by turning it into links to canonical/operational documents.
2. Align `09_Operational_Playbook.md` with the authority map without rewriting every procedure.
3. Add links from relevant index/map docs to `Workflow_Document_Authority_Map.md`, `State_Tool_Schema_Map.md`, and `FinalBlueprint/README.md`.
4. Defer any tool parser/schema migration to a separate approved task.

Recommended commit message after review:

```text
docs: record DOC-001 readiness decision
```

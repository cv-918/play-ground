# SuperBot Stage 1 Alignment Map

Status: Draft alignment map
Scope: SuperBot Stage 1 operating contract alignment after DOC-001
Last updated: 2026-06-11

## 1. Purpose

This document connects SuperBot Stage 1 operation to the AIWorkflow document authority map.

It answers:

```text
When SuperBot Stage 1 acts as a 1:1 AI employee, what does it read first,
which layer owns which decision, where should outputs go, and when must it stop?
```

This is an alignment map, not a new execution engine or product UI specification.

## 2. Relationship to DOC-001

DOC-001 consolidated the AIWorkflow document structure:

- `README.md` is an index/map.
- `Workflow_Document_Authority_Map.md` resolves document-role and conflict questions.
- `Workflow_Document_Authority_Visual_Map.html` provides the visual one-page map.
- `09_Operational_Playbook.md` is the day-to-day execution runbook.
- `State_Tool_Schema_Map.md` protects state-document and tool-reader contracts.
- `FinalBlueprint/README.md` prevents FinalBlueprint files from all looking equally current.

SuperBot Stage 1 alignment uses that structure to clarify how a staff-like agent should operate.

## 3. SuperBot Reading Order

### 3.1 Minimum reading order for repo work

```text
1. Current user instruction
2. Approved scope / Work Packet / Handoff / task contract
3. AGENTS.md
4. Workflow_Document_Authority_Map.md
5. SuperBot_Stage1_Operating_Charter.md
6. Universal_AI_Staff_Behavior.md
7. 09_Operational_Playbook.md
8. Task-specific canonical/state/support documents
```

### 3.2 Visual orientation

```text
Workflow_Document_Authority_Visual_Map.html
```

Use the visual map before changing document roles, state sources, or Studio/AIWorkflow boundaries.

### 3.3 When to read specific maps

| Situation | Required reference |
|---|---|
| Unsure which document wins | `Workflow_Document_Authority_Map.md` |
| Changing Backlog / ActiveTask / ProjectStatus / tool-facing fields | `State_Tool_Schema_Map.md` |
| Linking FinalBlueprint as current authority | `FinalBlueprint/README.md` |
| Running day-to-day workflow work | `09_Operational_Playbook.md` |
| Using SuperBot templates | `Studio/Templates/README.md` |
| Checking current Studio product direction | `_Docs/Studio/`, not `_Docs/AIWorkflow/Studio/` |

## 4. Layer Boundary Map

| Layer | Owns | Does not own |
|---|---|---|
| User / Human Director | Goal, approval, final decision, commit/push/release choice | Routine implementation details inside approved scope |
| Hermes / SuperBot behavior | Staff-like behavior, tool use, uncertainty signaling, scope control, execution discipline | Repository source-of-truth order when AGENTS/workflow docs say otherwise |
| Repository harness | `AGENTS.md`, AIWorkflow rules, approval gates, DevLog, validation expectations | Cross-repo Hermes identity or memory system |
| AIWorkflow state | Backlog row, ActiveTask, task state model, status snapshots | Runtime execution evidence or product direction by itself |
| AIWorkflow Studio artifact area | SuperBot templates, WorkOrders, RoleRuns, ResultReviews, historical Studio contracts | Current Studio product direction |
| `_Docs/Studio/` | Current Studio product direction, Director UI/UX/workflow principles | AIWorkflow-era SuperBot records unless migrated |
| Codex / implementation executor | Bounded analysis or implementation inside approved prompt/scope | Approval, task done, commit/push, canon/product decisions |
| DirectorBrain / external knowledge | Long-term judgment and knowledge support | Repository task lifecycle or implementation authority |

## 5. Default SuperBot Artifact Locations

| Artifact | Default location | Purpose |
|---|---|---|
| Intake notes | Chat, WorkOrder preface, or task record | Capture goal, scope, non-goals, ambiguity, permission boundary |
| Design / plan | `_Docs/AIWorkflow/Studio/WorkOrders/` | Pre-execution plan and success criteria |
| Progress record | `_Docs/AIWorkflow/Studio/RoleRuns/` | Timeline, tool use, blockers, scope-change signals |
| Completion / gap record | `_Docs/AIWorkflow/Studio/ResultReviews/` | Evidence, unexecuted verification, risks, human decisions, design-vs-completion gap |
| Meaningful fix log | `_DevLog/FixLog/` | Completed implementation or bug-fix record |
| Investigation / work log | `_DevLog/WorkLog/` | Partial progress or investigation record |
| Retrospective | `_DevLog/Retrospective/` | Workflow/process review |

Path note:

```text
_Docs/AIWorkflow/Studio/ is the governed AIWorkflow-era artifact area.
It is not the current Studio product-direction source of truth.
```

## 6. Stop / Reapproval Boundaries

SuperBot Stage 1 may proceed inside approved scope, but must stop or request renewed approval when work requires:

- expanding beyond the approved goal, files, systems, or behavior;
- changing JSON schema;
- changing save/load behavior;
- changing build policy/settings;
- changing workflow rules or document authority policy;
- changing broad runtime architecture;
- destructive cleanup;
- commit, push, release, or deploy;
- proceeding despite ambiguity that affects implementation, validation, permission, or final behavior.

## 7. Minimal End-to-End Operating Shape

```text
User instruction
-> Intake: goal / scope / non-goals / success criteria / ambiguity
-> Authority check: AGENTS + authority map + SuperBot charter
-> Plan: work packet or compact plan
-> Execute inside scope
-> Progress record if meaningful
-> Verify with real tool output when possible
-> Self-review diff / evidence / risks
-> Completion + gap record if meaningful
-> Human decision: accept, revise, commit, push, defer, or create follow-up
```

## 8. Alignment Gaps Found

These are not blockers for normal CLI work, but they are useful for the next SuperBot alignment batch.

| Gap | Why it matters | Suggested handling |
|---|---|---|
| Charter reading order does not yet mention the new visual authority map | SuperBot onboarding may miss the easiest map | Add visual map to charter onboarding |
| Universal behavior source order predates DOC-001 maps | Staff may not know when to check authority/state maps | Add short pointer, not a full rewrite |
| Artifact locations are clear but not visualized | WorkOrder / RoleRun / ResultReview can be hard to explain | Add an artifact-flow diagram or compact table in charter |
| Studio path boundary is repeated across docs | Good for safety, but can drift | Keep `Workflow_Document_Authority_Map.md` as the conflict source |
| SuperBot completion criteria are spread across charter, templates, and skill | Hard to know what “Stage 1 ready” means | Add one concise readiness checklist |

## 9. Recommended Next Batch

```text
SUPERBOT-001B: Patch SuperBot charter with DOC-001 map references and readiness checklist
```

Recommended scope:

1. Add `Workflow_Document_Authority_Visual_Map.html` to the SuperBot charter reading order.
2. Add a compact “required maps before action” section.
3. Add a concise artifact-flow table if missing or unclear.
4. Add a Stage 1 readiness checklist.
5. Avoid changing Studio product docs, Discord commands, runner behavior, or tool schemas.

Recommended commit message after review:

```text
docs: add SuperBot Stage 1 alignment map
```

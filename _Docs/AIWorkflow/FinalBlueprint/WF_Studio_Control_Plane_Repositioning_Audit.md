# Studio Control Plane Repositioning Audit

## 1. Purpose

This audit repositions AIWorkflow Studio after reviewing the current AI-based
development ecosystem and the user's long-term direction.

The target user is not a prompt operator. The target user is a Human Director,
Executive Producer, Creative Director, active game developer, AI trainee, and
aspiring IP General Director.

The product goal is therefore not a bigger Discord bot, a generic AI chatbot,
a generic IDE, or a homemade replacement for every external AI tool.

The product goal is:

```text
AIWorkflow Studio = Human Director Control Plane
```

Studio should coordinate decisions, approvals, staff work, memory, evidence,
verification, completion, and finalization. External tools should provide
execution, editing, search, model runtime, browser automation, and asset
generation where they are already stronger.

## 2. Core Decision

### Keep Studio

Studio remains valuable, but its product role must be narrowed.

Studio should remain the source of authority for:

- Human Director decisions
- approved scope
- rejected scope
- pending proposals
- official decisions and canon-like records
- WorkOrders
- MeetingSessions
- StaffAgent registry and role boundaries
- evidence / verification material references
- completion and finalization decisions
- git gate decisions
- project profile boundaries

### Do Not Turn Studio Into Everything

Studio should not attempt to become:

- a general code editor
- a general terminal
- a general AI chat surface
- a full RAG platform
- a full browser automation engine
- a full multi-agent runtime framework
- a replacement for Codex, Cursor, Warp, LangGraph, Dify, or similar tools

The productivity rule is:

```text
If an external tool is already better at execution, Studio should call it,
track it, and govern it instead of rebuilding it.
```

## 3. New Product Boundary

### Studio Owns

| Area | Studio responsibility |
|---|---|
| Direction | Turn broad Human Director intent into structured plans, meetings, decisions, and WorkOrders. |
| Governance | Separate proposal, decision, memory, canon-like record, approval, and finalization. |
| Staff coordination | Define AI staff identities, charters, authority, handoff, and output contracts. |
| Meeting control | Run structured meeting records and produce follow-up work or decisions. |
| Work control | Keep WorkOrder scope, non-goals, required outputs, approval items, and handoff status. |
| Review | Help the Human Director read staff reports, generated candidates, diffs, and completion evidence. |
| Completion | Connect verification material, completion reports, finalization decisions, DevLog, and git gate. |
| Audit | Preserve traceability from intent to output to evidence to final decision. |

### External Tools Own

| Area | Better owner |
|---|---|
| Code implementation | Codex App/CLI, Cursor, Windsurf, GitHub Copilot coding agent, or similar coding agents. |
| Terminal/session operation | Warp, native terminal, or a dedicated local process manager. |
| Durable agent loops | LangGraph or another durable agent runtime, after a bounded spike. |
| Document/RAG search | Dify, RAGFlow, LlamaIndex, or another knowledge/search system. |
| Browser automation | Playwright, browser-use, Hermes, or a browser adapter layer. |
| Asset generation | Scenario, Meshy, Leonardo, Runway, ElevenLabs, Unity Muse, or other specialist tools. |
| Broad UI prototyping | v0, Lovable, Bolt, Firebase Studio, or similar app builders when useful. |

Studio should integrate these tools through ToolRequest, ToolRun,
ToolResult, EvidenceLink, ApprovalRequirement, and Finalization records.

## 4. Current Surface Classification

| Surface | Classification | Product decision |
|---|---|---|
| Home | Human Director primary | Keep, but redesign around "what I must decide now" rather than mixed status panels. |
| Goal Planning | Human Director primary | Keep. This is the Studio-native entry point for broad direction. |
| Director Inbox | Human Director primary | Keep. This should become the main decision queue. |
| Meeting Room | Human Director primary | Keep. It is a core Studio function, not an external-tool replacement. |
| Work Orders | Human Director / Producer primary | Keep. This is the handoff bridge from direction to execution. |
| Staff Reports | Human Director review surface | Keep, but make report adoption/rejection clearer and hide draft internals by default. |
| Knowledge / Decisions | Human Director governance surface | Keep. This is where ideas become decisions or memory. |
| Evidence / Verification Material | Human Director review surface | Keep. This supports completion decisions. |
| Diff Review / Git Gate | Human Director release surface | Keep, but do not compete with full git clients. Studio should only support selected-file commit/push decisions. |
| DevLog | Human Director / Documentation reference | Keep as read/review surface. |
| Project | Reference / Producer surface | Keep, but show boundaries and readiness rather than internal config detail. |
| Departments | Reference surface | Keep as reference; not a daily action center. |
| AI Staff | Reference surface | Keep as reference; hide registry-level detail by default. |
| Timeline | Reference / audit surface | Keep as secondary navigation, not the main work surface. |
| Toolbox | Maintenance surface | Keep only user-useful local controls at the top; move diagnostics below a divider. |
| Systems | Internal/admin | Hide from normal navigation. Surface only through advanced/internal tools. |
| Policy | Internal/admin | Hide from normal navigation. Show policy effects in Director-facing cards only. |
| Raw JSON / registry links | Internal/debug | Collapse by default. Never make raw artifacts the primary user path. |
| Discord command surfaces | Legacy/adapter | Stop treating as primary UX. Keep only as optional adapter/compatibility path. |

## 5. Button and Function Classification

### User-Facing Actions

These actions belong in normal Human Director flows:

- preview goal plan
- store goal plan
- create governed candidates
- create meeting
- record my meeting turn
- request next AI staff turn
- view meeting board
- create follow-up WorkOrder
- record decision
- review staff report
- decide record candidate
- create staff context preview
- start approved staff execution through a governed route
- inspect WorkOrder handoff readiness
- approve/reject/request changes/defer completion
- view verification material
- selected-file commit / selected-file commit+push
- restart Studio server
- restart Discord bot only if Discord is still used
- upload selected resource bundle when explicitly configured

### Internal/Admin Actions

These should be hidden, collapsed, or moved under an advanced section:

- surface map
- recovery plan
- smoke plan
- smoke status
- schema checks
- registry raw views
- policy replay/repair
- conditional automation case tests
- tool registry status
- raw ToolRunRequest debugging
- direct internal JSON inspection

### External-Tool Handoff Actions

These should not be rebuilt as Studio-native features:

- general coding sessions
- full terminal multiplexing
- broad RAG/document chat
- browser operation
- asset generation
- generic AI conversation
- long-running autonomous loops without a durable runtime

Studio should create governed requests, call or hand off to the tool, collect
result references, and show the Human Director what changed.

## 6. Updated Navigation Model

### Primary Human Director Navigation

```text
Home
Goal Planning
Director Inbox
Meeting Room
Work Orders
Staff Reports
Knowledge / Decisions
Evidence / Verification Material
Diff Review / Git Gate
DevLog
Toolbox
```

### Secondary Reference Navigation

```text
Project
Departments
AI Staff
Timeline
```

### Hidden / Advanced Navigation

```text
Systems
Policy
Raw registries
Schema/debug tools
Discord adapter diagnostics
```

## 7. External Tool Adoption Position

The immediate direction is selective adoption, not migration.

| Tool family | Studio position |
|---|---|
| Codex App/CLI | Primary implementation and code-aware worker route. Keep using. |
| Warp | Candidate terminal/session control surface for the human, not a Studio replacement. |
| LangGraph | Candidate durable runtime for future persistent staff loops. Evaluate by spike. |
| Dify/RAGFlow | Candidate knowledge/RAG layer. Evaluate by spike. |
| Cursor/Windsurf | Optional editing assistants. Do not require them in the core workflow. |
| CrewAI/AutoGen | Useful for experiments, but not the first core replacement. |
| OpenHands/OpenClaw/Hermes/browser-use | Evaluate as external adapters only after safety boundaries are explicit. |
| Game/IP tools | Treat as specialist production equipment, not governance systems. |

## 8. Productivity-Based Redesign Plan

### Bundle A: Product Boundary Lock

- Record that Studio is the Human Director Control Plane.
- Remove Discord-first language from new planning.
- Treat Discord as optional adapter/legacy UI.
- Add "build vs integrate" decision criteria.

### Bundle B: Surface Pruning

- Move Systems and Policy out of normal navigation.
- Move surface/recovery/smoke/debug buttons out of Home.
- Keep raw JSON and registry links collapsed.
- Keep Toolbox focused on the few tools the user actually runs.

### Bundle C: Home and Decision Queue Redesign

- Make Home answer only:
  - What must I decide now?
  - What is currently active?
  - What staff output needs review?
  - What completion/git gate needs attention?
- Move everything else to detail pages.

### Bundle D: External Tool Strategy

- Create a Tool Integration Policy:
  - what Studio calls directly
  - what Studio only records
  - what requires approval
  - what can incur cost
  - what can modify files
- Run small spikes for Warp, LangGraph, and Dify/RAGFlow before integrating.

### Bundle E: Studio Runtime Bridge

- Keep WorkOrder -> StaffContext -> Codex staff run -> report -> materialization.
- Add only the missing glue needed for real game work.
- Do not build a full custom multi-agent runtime until LangGraph/other runtime spikes are reviewed.

### Bundle F: Game Work Validation Loop

- Use one small real game task to validate the new control-plane flow.
- The success criterion is not "Studio has many features."
- The success criterion is "the user can direct work with less cognitive load."

## 9. Build-vs-Integrate Rule

Before adding any Studio feature, answer:

1. Does this help the Human Director decide, approve, reject, or finalize?
2. Is this a governance/memory/evidence function that must belong to Studio?
3. Is an external tool already better at this?
4. Can Studio store a request/result link instead of implementing the tool?
5. Does the feature reduce the user's cognitive load?

If the answer to 3 is yes and the answer to 2 is no, do not build it in Studio.
Integrate or document the external tool instead.

## 10. Guide Update Decision

This audit changes product direction and planning boundaries, not the current
runtime behavior by itself.

The Human Director guide must be updated when the UI pruning and navigation
changes are implemented. The guide does not need a behavior update for this
audit alone.

## 11. Immediate Next Work

Recommended next task:

```text
Apply Studio Control Plane surface pruning.
```

Scope:

- keep game files untouched
- update Studio navigation and Home/toolbox exposure only
- hide internal/admin surfaces from normal flow
- preserve existing internal APIs and schemas
- update the Korean user guide after visible UI changes
- validate with node --check, Studio smoke, and browser inspection

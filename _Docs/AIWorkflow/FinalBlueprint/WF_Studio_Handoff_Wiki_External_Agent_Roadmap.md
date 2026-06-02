# Studio, Handoff, LLM Wiki, and External Agent Roadmap

## 1. Purpose

This document fixes the Phase 1 operating direction for the next AIWorkflow
Studio evolution.

It reconciles these systems:

- AIWorkflow Studio
- Handoff system
- external knowledge-base candidates (Obsidian, Hermes LLM Wiki, and the LLM Wiki experiment)
- Hermes
- OpenClaw
- Codex App / Codex CLI
- Existing AIWorkflow governance, evidence, finalization, and git gates

The target is not a generic automation dashboard.

The target is a Personal AI Development Studio where the human user acts as
Human Director / Executive Producer / Creative Director, while AI staff and
tool adapters handle research, analysis, implementation, verification, and
record keeping under Studio governance.

---

## 2. Final Product Position

```text
AIWorkflow Studio
= Human Director control plane / company headquarters / decision authority
```

The Studio exists to help the Human Director:

- state broad goals and agenda items
- receive staff advice, objections, and options
- approve direction
- request revisions or more research
- review completion results
- decide whether work is accepted, fixed, deferred, or rejected
- preserve valuable decisions, lessons, and project memory

The Studio should not become:

- a full IDE
- a replacement for Codex, Warp, Cursor, or other coding tools
- a generic chat app
- a raw JSON explorer for internal records
- a browser automation engine
- a multi-agent runtime implementation by itself

---

## 3. System Role Map

| System | Final role | User-facing level |
|---|---|---|
| Studio | Human Director operating console, agenda board, approval and decision center | Primary UI |
| External knowledge base | Company-memory candidate, official-knowledge candidates, decisions, lessons, rejected ideas, research notes | Obsidian/Hermes/Markdown candidate |
| Handoff | Internal work packet / dispatch layer carrying scope, constraints, context, validation, and output contract | Mostly hidden |
| Hermes | Browser and web research / browser QA / web evidence adapter | Called through Studio |
| OpenClaw | Long-running autonomous staff runtime candidate | Sandboxed worker candidate |
| Codex App / CLI | Code analysis, implementation, local repository work | Implementation worker / executor |
| Local tools | Build, test, validation, data publish, smoke checks | Allowlisted execution tools |
| Git | Commit and push boundary | Explicit Human Director gate |

---

## 4. Core Principle

```text
Agent autonomy within Studio governance.
```

AI staff may think, propose, object, research, and draft within their role.

They may not:

- approve their own work
- canonize memory
- commit or push
- bypass Human Director decisions
- expand scope beyond the approved packet
- treat external tool output as truth without reviewable evidence

Studio remains the authority for:

- agenda state
- Director decisions
- approval gates
- WorkOrder creation
- Handoff packet creation
- memory promotion
- verification and completion review
- git gate decisions

---

## 5. The Better Workflow

The old page-centered model should evolve into an agenda-centered Director
workflow.

```text
1. Human Director gives a broad agenda item.
2. Studio turns it into a Director Brief.
3. Studio decides whether the item needs staff advice, web research, direct
   WorkOrder drafting, or a clarification question.
4. AI staff, Hermes, OpenClaw, Codex, or local tools produce advice, evidence,
   drafts, or implementation results.
5. AI Librarian extracts durable memory candidates.
6. Human Director approves direction, requests another advisory loop, rejects,
   or defers.
7. Approved direction becomes a WorkOrder and Handoff packet.
8. A bounded executor runs the work.
9. Verification material returns to Studio.
10. Human Director accepts, accepts with known concerns, requests fixes,
    rejects, or defers.
11. Valuable decisions, lessons, and records are kept in Studio records first, then handed to the external knowledge-base layer when long-term curation is useful.
12. Git commit/push remains an explicit final gate.
```

### Advisory Loop

The Human Director can loop between steps 2 and 6 as many times as needed.

This loop is where staff may:

- bring options
- identify risks
- ask questions
- disagree with each other
- request research
- propose constraints
- narrow scope
- recommend a preferred direction

The loop ends only when the Human Director chooses a direction, defers the
agenda item, or rejects it.

---

## 6. LLM Wiki Position

The LLM Wiki is not a primary Studio screen. Treat it as an external
knowledge-base candidate.

It is not just a RAG database and not just an archive folder.

It is a candidate human-readable Markdown knowledge system that an AI Librarian,
Obsidian, Hermes' LLM Wiki behavior, or another external knowledge tool can
maintain over time. Studio decides what is worth keeping; long-term wiki
curation belongs outside the Director console.

### 6.1 Knowledge Classes

| Class | Meaning |
|---|---|
| Inbox | Raw notes, conversations, reports, links, meeting output, or imported material |
| Research | Web research, reference analysis, competitor notes, external documentation summaries |
| Proposal | An idea or recommendation that has not been accepted |
| Decision | A Human Director judgment: accept, reject, revise, defer, or canonize |
| Canon | Official project truth: world, character, system, design, or policy facts |
| Lesson | Reusable learning from implementation, review, QA, failures, or process |
| Rejected | Explicitly rejected ideas and the reason they should not be repeated |
| MOC | Map of Content documents that index and connect knowledge clusters |

### 6.2 Obsidian Compatibility

The first storage format should be plain Markdown, compatible with Obsidian.

Recommended long-term structure:

```text
_Docs/AIWorkflow/StudioWiki/
  00_MOC.md
  Inbox/
  Research/
  Proposals/
  Decisions/
  Canon/
  Lessons/
  Rejected/
  Concepts/
```

Obsidian links such as `[[Decision: Early Conflict Direction]]` may be used in
Wiki documents, but Studio must not depend on Obsidian being open.

Obsidian is a reading and navigation tool, not the source of authority.

### 6.3 Wiki Promotion Rule

Raw information must not become official memory automatically.

```text
Raw material -> AI Librarian draft -> Human Director review -> Wiki record
```

Canon promotion requires an explicit Human Director decision.

---

## 7. Handoff Position

The Handoff system should not be treated as a second product beside Studio.

It should become the internal Work Packet / Dispatch Layer.

### 7.1 Keep

Keep Handoff capabilities that provide:

- bounded scope
- non-goals
- target role or executor
- required context
- validation requirements
- expected output contract
- chain-of-custody
- audit trail

### 7.2 Hide

Hide or demote from normal Director UI:

- raw queue files
- packet file names
- internal role-worker mechanics
- sample handoffs
- violation logs unless action is required
- low-level packet status that does not need a Director decision

### 7.3 Rename Conceptually

Use this product language:

```text
Work Packet
Dispatch
Staff Handoff
Execution Brief
```

Avoid presenting Handoff as a separate user-facing workflow unless the Human
Director explicitly asks to inspect internals.

### 7.4 Retirement Criteria

Do not delete Handoff now.

Retire it only when Studio has an equivalent internal dispatch layer that can
preserve:

- scope
- non-goals
- context pack
- role routing
- evidence requirements
- output contract
- audit history

Until then, Handoff remains valuable as an internal safety and traceability
mechanism.

---

## 8. Hermes Position

Hermes should be treated as a browser and web adapter.

Best-fit uses:

- web research
- reference collection
- external documentation inspection
- web UI QA
- browser-game smoke checks
- screenshot and page-state evidence
- external AI web UI interaction experiments

Hermes output should enter Studio as:

- ResearchNote
- EvidenceLink
- external knowledge-base candidate note
- meeting reference
- staff report input

Hermes must not:

- approve direction
- canonize knowledge
- commit or push
- modify local source outside a governed packet
- become the default implementation agent

---

## 9. OpenClaw Position

OpenClaw should be treated as a long-running autonomous staff runtime
candidate.

Best-fit uses:

- extended investigation
- multi-step research
- autonomous staff report drafting
- cross-tool task attempts inside a sandbox
- experimental agent-worker orchestration

Initial allowed scope:

- read
- analyze
- propose
- draft reports
- produce Wiki candidates
- run within a Studio-approved Work Packet

Initial blocked scope:

- direct commit/push
- direct canon changes
- direct approval
- unbounded source edits
- external deployment
- unrestricted long-running local control

OpenClaw may become a worker runtime.

It must not become the company authority.

---

## 10. Codex Position

Codex App and Codex CLI remain the primary repository-aware implementation
worker.

Codex should receive:

- approved WorkOrder
- Handoff packet or equivalent context pack
- relevant Wiki context
- approved scope
- non-goals
- validation plan
- required return format

Codex should not receive:

- raw ambiguous agenda without Studio triage
- unbounded "do whatever is needed" authority
- commit/push permission unless explicitly approved by the Human Director

---

## 11. Context Pack

Every significant worker run should be backed by a Context Pack.

Context Pack contents:

- Director agenda
- approved direction
- relevant canon
- relevant decisions
- relevant lessons
- rejected directions to avoid
- files or systems in scope
- non-goals
- validation requirements
- evidence requirements
- output contract

Handoff packets should carry or reference this Context Pack.

---

## 12. Studio UX Implications

The Studio should gradually move toward these Director-facing surfaces:

| Surface | Purpose |
|---|---|
| Home | What the Director must decide now |
| New Agenda / Director Brief | Enter broad goals and get them structured |
| Advisory Room | Staff advice, research, objections, options, and loops |
| Director Decisions | Accept, reject, revise, defer, or canonize |
| Work Orders | Approved execution candidates |
| Result Review | Completion, concerns, fixes, validation material |
| Records | Proposals, decisions, reference notes, and canon candidates |
| Toolbox | Small allowlisted maintenance tools |

Internal surfaces should be hidden by default:

- raw Handoff queues
- raw RoleRun records
- raw JSON registries
- low-level runtime metadata
- legacy Discord dispatch surfaces

---

## 13. Keep / Reduce / Retire Criteria

### Keep in Studio

Keep features that directly support:

- Director decisions
- advisory loops
- approval gates
- memory promotion
- result review
- evidence review
- git release decisions
- tool request and result tracking

### Reduce or Hide

Reduce or hide features that are:

- internal implementation details
- raw file browsers
- debug-only smoke outputs
- duplicate surfaces for the same decision
- pages that require the Director to understand internal schemas

### Move to External Tools

Move or delegate features that are better handled by:

- Codex for code implementation
- Hermes for browser/web work
- OpenClaw for experimental long-running staff runs
- Warp or terminal tools for local session control
- Obsidian for human Wiki reading and linking
- future RAG tools for large-scale retrieval

### Retire

Retire features when:

- they duplicate Studio's Director-facing flow
- they only exist because of a legacy Discord-first assumption
- they expose internal state without helping a real decision
- their useful parts have been replaced by Work Packet, Context Pack, or LLM
  Wiki records

---

## 14. Phase Roadmap

### Phase 1: Direction Lock

Create this document and use it as the fixed boundary for the next Studio
redesign.

Deliverables:

- role map
- workflow map
- Handoff keep/hide/retire criteria
- external knowledge-base position
- Hermes/OpenClaw/Codex positions

### Phase 2: Studio Surface Simplification

Convert Studio from page-centered operations to agenda-centered Director work.

Deliverables:

- Home shows only Director decisions
- broad goal entry becomes Director Brief
- meeting/advisory flow becomes attached to agenda
- internal Handoff and raw records hidden by default

### Phase 3: External Knowledge-Base Foundation Review

Compare the Markdown Wiki, AI Librarian, Hermes, and Obsidian knowledge workflows.

Deliverables:

- external knowledge-base candidate list
- Obsidian / Hermes LLM Wiki evaluation criteria
- criteria for handing Studio records to the external knowledge-base layer
- MOC template candidate
- Obsidian-compatible linking convention candidate

### Phase 4: Context Pack and Work Packet Bridge

Make every staff/executor run receive governed context.

Deliverables:

- Context Pack schema
- Work Packet / Handoff bridge
- "what the worker sees" preview
- post-run evidence and memory extraction path

### Phase 5: Hermes Adapter

Add browser/web research and QA as a governed tool.

Deliverables:

- Hermes tool request
- ResearchNote output
- browser evidence links
- external knowledge-base integration

### Phase 6: OpenClaw Sandbox Worker

Add OpenClaw as a controlled long-running staff runtime candidate.

Deliverables:

- sandbox permission profile
- read/analyze/propose-only default mode
- Work Packet input
- StaffReport output
- no approval/canon/git authority

### Phase 7: RAG / Graph Retrieval Extension

Add retrieval only after the Markdown Wiki becomes too large for direct
curation.

Deliverables:

- MOC routing
- local search
- vector or graph retrieval candidate evaluation
- retrieval evidence rules

---

## 15. Current Tool Adoption Snapshot

This roadmap now treats Hermes as installed and smoke-tested, but not yet
automatically wired into Studio execution.

Current fixed state:

- Studio remains the Human Director control plane.
- Handoff remains an internal Work Packet / dispatch layer until Studio can
  fully preserve scope, non-goals, context, output contract, and audit history
  without it.
- Hermes is the interim browser/web adapter before OpenClaw is introduced.
- Hermes is verified with `openai-codex`, `gpt-5.5`, OAuth auth, web search, and
  browser automation smoke.
- Hermes may collect web and browser evidence, but it may not approve, canonize,
  implement local source changes, commit, push, or replace Codex.
- OpenClaw is not installed in this roadmap state and remains a sandbox worker
  candidate.
- The LLM Wiki is not a Studio feature. It belongs to the external
  knowledge-base layer, currently represented by Obsidian-compatible Markdown
  and later by Hermes LLM Wiki or another knowledge tool if it proves useful.

The next integration step is not another Studio page. It is a real
Hermes-backed research smoke that turns web/browser findings into a governed
Studio reference record.

---

## 16. Non-Negotiable Boundaries

- Studio owns governance.
- Human Director owns approval.
- The external knowledge-base layer owns durable memory.
- Handoff carries bounded work.
- Hermes performs browser/web work only under tool policy.
- OpenClaw runs only as a bounded worker.
- Codex implements only inside approved scope.
- RAG is a retrieval aid, not the source of truth.
- No external agent may approve, canonize, commit, push, or deploy by itself.

---

## 17. Phase 1 Decision

This document fixes the next direction:

```text
Studio becomes an agenda-centered Human Director control plane.
The external knowledge-base layer becomes the company memory candidate.
Handoff becomes an internal dispatch/work-packet layer.
Hermes becomes the browser/web adapter.
OpenClaw becomes a sandboxed long-running staff runtime candidate.
Codex remains the main repository implementation worker.
```

Future Studio work should be judged against this direction before adding new
features.

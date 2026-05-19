# Personal AI Development Studio Architecture

## 1. Status

This document is the official long-term product architecture for evolving
AIWorkflow beyond a Discord-first runner harness.

The target product is:

```text
Personal AI Development Studio
AI Studio Company Runtime
```

This document supersedes any interpretation that AIWorkflow is only:

- a Discord bot
- a prompt generator
- a Codex execution wrapper
- a simple task runner
- a roleplay prompt collection

AIWorkflow Core remains valuable, but its long-term role changes. It becomes the
operating, governance, audit, verification, and finalization system for a
personal AI development studio.

---

## 2. One-Line Definition

Personal AI Development Studio is a project-independent AI company runtime where
the human user acts as Human Director / Executive Producer / Creative Director,
persistent AI staff agents work as planners, designers, engineers, artists, QA,
writers, producers, reviewers, and validators, and AIWorkflow Core governs
approval, execution, evidence, verification, completion, finalization, and git
gates.

---

## 3. Product Philosophy

The user is not a prompt operator.

The user is the director.

The system is not a chatbot.

The system is a company runtime.

AI agents are not roleplay masks.

AI agents are persistent staff members with:

- identity
- role charter
- authority
- memory
- project context
- tools
- output contracts
- approval rules
- meeting behavior
- handoff behavior
- evidence responsibility
- quality criteria

Tools are equipment.

AIWorkflow Core is the operating system, governance system, audit system,
verification system, and finalization system.

The controlling principle is:

```text
Agent Autonomy within Workflow Governance.
```

AI staff agents may think, propose, object, question, and hand off within their
role authority.

They may not unilaterally approve, canonize, implement, import, commit, push, or
release outside governance gates.

---

## 4. Current Harness Position

The current AIWorkflow harness is not the complete AI company runtime.

The current harness already provides the foundation for:

- Task lifecycle state
- Approval gates
- PC Runner execution
- Evidence collection
- VerificationReport
- CompletionReport
- Completion Card
- FinalizationLog
- Git gate

These pieces must not be discarded.

They become the Studio Operating Core.

The missing higher-level layers are:

- persistent AI staff agents
- departments
- meeting sessions
- work orders
- durable memory
- proposal/decision/canon separation
- studio UI
- project-independent core APIs

---

## 5. Final Product Boundary

### In Scope

- Persistent AI Staff Agent runtime
- Department model
- MeetingSession runtime
- WorkOrder pipeline
- Memory and canon management
- Proposal and decision tracking
- Approval and governance policy
- Evidence and verification system
- Tool adapter execution
- Project profile abstraction
- Studio UI
- Mobile-friendly director control
- Audit and DevLog integration

### Out of Scope

- pretending that prompt templates are real staff agents
- automatic canon changes without approval
- automatic implementation without policy approval
- automatic commit/push/release
- Discord-specific core dependencies
- PlayGround-specific core dependencies
- monolithic "super agent" design
- untraceable multi-agent chat without artifacts

---

## 6. Technology Assumptions

The architecture is designed for currently available technology, while keeping
provider-specific pieces behind adapters.

Current practical building blocks include:

- LLM agent execution with tool calling and structured outputs.
- Persistent conversation/session memory for multi-turn agents.
- Explicit handoffs between specialized agents.
- File search / retrieval over project documents.
- Remote MCP or function-calling tool access.
- Local CLI and build/test adapters.
- Browser or computer-use adapters where safe and approved.
- Local database storage for durable studio state.

OpenAI's current platform capabilities that map to this design include:

- Responses API built-in tools such as file search, web search, function calling,
  and remote MCP tool access.
- Agents SDK handoffs for delegation between specialized agents.
- Agents SDK sessions for persistent conversation history across runs.
- File search / vector stores for retrieval over project knowledge.

Technology references:

- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- OpenAI tools guide: https://platform.openai.com/docs/guides/tools
- OpenAI file search guide: https://platform.openai.com/docs/guides/tools-file-search
- OpenAI Agents SDK sessions: https://openai.github.io/openai-agents-python/sessions/
- OpenAI Agents SDK handoffs: https://openai.github.io/openai-agents-python/handoffs/

These are implementation options, not hard-coded product dependencies.

The core architecture must remain provider-independent.

---

## 7. Top-Level Architecture

```text
Personal AI Development Studio
├─ Studio UI Layer
│  ├─ Web dashboard
│  ├─ Mobile control panel
│  ├─ Meeting room
│  ├─ Approval inbox
│  ├─ Evidence viewer
│  ├─ Completion review screen
│  ├─ Memory / canon browser
│  └─ Agent / department configuration
│
├─ Studio API Layer
│  ├─ Director command API
│  ├─ Meeting API
│  ├─ WorkOrder API
│  ├─ AgentRun API
│  ├─ Memory API
│  ├─ Approval API
│  ├─ Evidence API
│  ├─ Verification API
│  └─ ProjectProfile API
│
├─ AIWorkflow Core
│  ├─ Task lifecycle
│  ├─ WorkOrder lifecycle
│  ├─ RoleRun / ToolRun lifecycle
│  ├─ Approval gates
│  ├─ Runner orchestration
│  ├─ Evidence collection
│  ├─ VerificationReport
│  ├─ CompletionReport / Completion Card
│  ├─ ApprovalHistory
│  ├─ FinalizationLog
│  ├─ DevLog integration
│  └─ Git gate
│
├─ Agent / Worker Layer
│  ├─ StaffAgent registry
│  ├─ Department registry
│  ├─ Staff context loader
│  ├─ Staff memory adapter
│  ├─ Staff tool permissions
│  ├─ AgentRun executor
│  ├─ Handoff router
│  └─ Multi-agent meeting coordinator
│
├─ Meeting Runtime
│  ├─ MeetingSession
│  ├─ agenda
│  ├─ participants
│  ├─ discussion turns
│  ├─ proposals
│  ├─ objections
│  ├─ unresolved questions
│  ├─ director decisions
│  ├─ accepted directions
│  ├─ rejected directions
│  └─ follow-up WorkOrders
│
├─ Memory / Knowledge Layer
│  ├─ project memory
│  ├─ staff memory
│  ├─ canon memory
│  ├─ proposal memory
│  ├─ decision memory
│  ├─ evidence index
│  ├─ document retrieval
│  ├─ vector search
│  └─ relation graph
│
├─ Tool Adapter Layer
│  ├─ Codex CLI adapter
│  ├─ Local CLI adapter
│  ├─ Browser adapter
│  ├─ Build/Test adapter
│  ├─ Game runner adapter
│  ├─ Asset generator adapter
│  ├─ External AI adapter
│  ├─ Git adapter
│  └─ MCP / connector adapter
│
├─ Project Profile Layer
│  ├─ PlayGround profile
│  ├─ Unity profile
│  ├─ browser game profile
│  └─ future project profiles
│
└─ Policy Layer
   ├─ human approval gates
   ├─ auto-approval policy
   ├─ path permission rules
   ├─ tool permission rules
   ├─ memory write policy
   ├─ canon approval policy
   ├─ asset import approval policy
   ├─ external tool policy
   └─ commit/push/release gate
```

---

## 8. Dependency Direction

The core must be independent from UI and project details.

Correct dependency direction:

```text
UI Adapter -> Studio API -> AIWorkflow Core -> Project Profile / Tool Adapter
```

Forbidden dependency direction:

```text
AIWorkflow Core -> Discord
AIWorkflow Core -> PlayGround hard-coded paths
AIWorkflow Core -> specific LLM provider
AIWorkflow Core -> specific asset generator
```

Rules:

- Discord is a UI adapter.
- Codex is a tool adapter.
- PlayGround is a project profile.
- External AI systems are tool or agent execution providers.
- Approval authority remains in governance policy.

---

## 9. Core Domain Objects

### 9.1 StaffAgent

```yaml
StaffAgent:
  agent_id: string
  display_name: string
  department_id: string
  role_title: string
  seniority: junior | regular | senior | lead | director
  identity:
    persona_style: string
    stable_preferences: string[]
    collaboration_style: string
  role_charter:
    mission: string
    responsibilities: string[]
    forbidden_actions: string[]
    authority: string[]
    approval_required_actions: string[]
  expertise:
    domains: string[]
    project_specialties: string[]
    anti_patterns: string[]
  memory_policy:
    readable_memory_scopes: string[]
    writable_memory_scopes: string[]
    canon_write_permission: none | propose_only | approval_required
  tool_policy:
    allowed_tools: string[]
    blocked_tools: string[]
    approval_required_tools: string[]
  output_contracts:
    required_outputs: string[]
    optional_outputs: string[]
    structured_schemas: string[]
  meeting_behavior:
    participation_style: string
    must_object_when: string[]
    must_ask_when: string[]
    must_defer_when: string[]
  handoff_behavior:
    can_handoff_to: string[]
    handoff_requires: string[]
  evidence_responsibility:
    required_evidence: string[]
    cannot_claim_without_evidence: string[]
  quality_criteria:
    pass_conditions: string[]
    failure_patterns: string[]
```

StaffAgent is not a prompt string.

StaffAgent is a persistent entity with durable configuration, memory access,
tool permissions, and output obligations.

### 9.2 Department

```yaml
Department:
  department_id: string
  name: string
  mission: string
  staff_agents: string[]
  department_lead: string
  default_meeting_roles: string[]
  default_review_gates: string[]
  owned_artifacts: string[]
  escalation_rules: string[]
```

Initial departments:

- Executive / Production
- Creative Direction
- Game Design
- Narrative / Scenario
- Engineering
- Art / Assets
- QA / Testing
- Documentation / Release

### 9.3 MeetingSession

```yaml
MeetingSession:
  meeting_id: string
  topic: string
  meeting_type: creative | technical | production | review | postmortem
  participants: string[]
  chair_agent_id: string
  director_user_id: string
  agenda: string[]
  known_constraints: string[]
  loaded_context_refs: string[]
  discussion_turns: Turn[]
  proposals: Proposal[]
  objections: Objection[]
  unresolved_questions: Question[]
  director_decisions: Decision[]
  accepted_directions: string[]
  rejected_directions: string[]
  follow_up_workorders: string[]
  minutes_artifact: string
  status: draft | active | waiting_director | finalized | archived
```

MeetingSession must produce artifacts.

A meeting that leaves only chat text is incomplete.

### 9.4 WorkOrder

WorkOrder is the bridge between studio-level intent and AIWorkflow execution.

```yaml
WorkOrder:
  work_order_id: string
  source_type: director_goal | meeting | proposal | bug | follow_up
  source_ref: string
  objective: string
  department_id: string
  assigned_agents: string[]
  scope: string[]
  non_goals: string[]
  expected_outputs: string[]
  approval_items: ApprovalItem[]
  evidence_requirements: string[]
  verification_plan: string[]
  handoff_plan: Handoff[]
  target_project_profile: string
  status: proposed | approved | active | review | completed | blocked | rejected
```

Task is lower-level than WorkOrder.

One WorkOrder may create:

- one AIWorkflow task
- multiple AIWorkflow tasks
- a MeetingSession
- a Proposal package
- a documentation-only artifact

### 9.5 Proposal

```yaml
Proposal:
  proposal_id: string
  source_agent_id: string
  source_meeting_id: string
  title: string
  summary: string
  rationale: string
  options: ProposalOption[]
  risks: string[]
  dependencies: string[]
  approval_items: ApprovalItem[]
  evidence_refs: string[]
  status: draft | submitted | accepted | rejected | superseded
```

Proposal is not a decision.

### 9.6 Decision

```yaml
Decision:
  decision_id: string
  decision_maker: human_director | delegated_policy
  decision_type: approve | reject | defer | request_changes | accept_concerns
  target_ref: string
  decision_summary: string
  accepted_scope: string[]
  rejected_scope: string[]
  conditions: string[]
  timestamp: string
  evidence_refs: string[]
```

Decision is not canon unless the decision type and policy say it updates canon.

### 9.7 Memory

```yaml
MemoryRecord:
  memory_id: string
  project_id: string
  scope: global | project | agent | department | meeting | task | canon
  type: fact | preference | proposal | decision | canon | rejection | evidence | lesson
  status: draft | proposed | approved | canon | rejected | deprecated
  content: string
  source_refs: string[]
  confidence: low | medium | high
  owner_agent_id: string
  created_at: string
  updated_at: string
```

Memory rules:

- Proposed setting is not approved setting.
- Approved setting is not necessarily canon.
- Canon changes require explicit policy approval.
- Rejected ideas remain useful memory but must not be reintroduced as accepted
  facts.
- Evidence links must be stored separately from narrative summaries.

### 9.8 Handoff

```yaml
Handoff:
  handoff_id: string
  from_agent_id: string
  to_agent_id: string
  reason: string
  input_contract: string[]
  expected_output: string[]
  constraints: string[]
  evidence_refs: string[]
  status: proposed | accepted | completed | rejected
```

Handoff is a traceable artifact, not a hidden prompt transition.

### 9.9 RoleRun

```yaml
RoleRun:
  role_run_id: string
  agent_id: string
  work_order_id: string
  meeting_id: string | null
  input_context_refs: string[]
  prompt_ref: string
  model_provider: string
  model_name: string
  reasoning_level: string
  output_refs: string[]
  tool_run_refs: string[]
  evidence_refs: string[]
  status: queued | running | completed | failed | cancelled
```

RoleRun is the execution trace of a StaffAgent for a specific job.

### 9.10 ToolRun

```yaml
ToolRun:
  tool_run_id: string
  tool_adapter_id: string
  initiated_by: agent_id | system | human_director
  work_order_id: string
  command_id: string
  permission_class: read | write | execute | external | destructive
  approval_ref: string | null
  inputs_ref: string
  outputs_ref: string
  exit_code: number | null
  status: queued | running | succeeded | failed | cancelled | timed_out
```

ToolRun may produce evidence, but it must not approve itself.

---

## 10. Persistent Staff Agent Requirements

A real StaffAgent must satisfy all of the following.

### 10.1 Identity

The agent must have stable role identity:

- name
- department
- role title
- point of view
- collaboration style
- domain taste
- failure patterns it cares about

Identity must remain bounded by role responsibility.

### 10.2 Role Charter

Each role must define:

- mission
- responsibilities
- authority
- deliverables
- review responsibilities
- handoff responsibilities
- forbidden behavior

### 10.3 Authority

Authority must be explicit.

Examples:

```text
Scenario Writer may propose dialogue.
Scenario Writer may not canonize worldbuilding.

Art Director may approve concept direction for proposal.
Art Director may not import generated assets into game data without approval.

Gameplay Programmer may implement approved source changes.
Gameplay Programmer may not change save/load schema without approval.
```

### 10.4 Memory

Each StaffAgent must have:

- shared project memory
- role-specific memory
- meeting memory
- decision memory
- evidence memory

Memory must be retrieved by policy, not dumped wholesale into every prompt.

### 10.5 Project Context

Context loading must be role-specific.

Examples:

- Scenario Director loads canon, tone, approved character briefs, rejected plot
  directions.
- Gameplay Programmer loads architecture notes, relevant source paths, runtime
  lifecycle rules, validation plan.
- QA Tester loads acceptance criteria, known bugs, build/test commands, previous
  regression notes.

### 10.6 Tool Access

Tools must be granted by role and work order.

Examples:

- Scenario Writer: document search, memory search, proposal writer.
- Gameplay Programmer: repo search, Codex CLI, local build/test, git diff read.
- Art Director: asset library search, concept generator, asset review.
- QA Tester: game runner, browser runner, build/test runner, screenshot capture.

### 10.7 Output Contract

Each agent output must be structured enough for downstream workflow.

Examples:

- ScenarioPitch
- StoryArcPlan
- CharacterBrief
- GameDesignProposal
- TechnicalDesignBrief
- ImplementationPlan
- AssetRequest
- QAReport
- ReviewVerdict
- VerificationReport
- ApprovalItems

### 10.8 Approval Rules

Each agent must know:

- what it can do without approval
- what it can propose but not finalize
- what requires explicit Human Director approval
- what is forbidden

### 10.9 Meeting Behavior

Each agent must be able to:

- propose
- object
- ask clarifying questions
- challenge scope
- identify risk
- defer when evidence is missing
- hand off to another role

### 10.10 Evidence Responsibility

Agents must not claim completion without evidence.

Creative work evidence may include:

- meeting notes
- proposal artifact
- decision record
- canon diff
- rejected option record

Engineering work evidence may include:

- diff snapshot
- build logs
- test logs
- runtime screenshots
- debug output

Art work evidence may include:

- source prompt
- generated image reference
- license/source metadata
- import decision
- in-game visual validation

---

## 11. Initial Staff Roster

### 11.1 Executive / Production

#### Human Director

The human user.

Authority:

- final creative direction
- final approval
- final completion decision
- final commit/push/release decision

#### Executive Producer Agent

Responsible for:

- scope control
- production risk
- milestone feasibility
- resource tradeoffs
- approval queue prioritization

Must object when:

- scope expands silently
- meeting output creates too many work orders
- creative direction conflicts with production capacity

#### Project Manager Agent

Responsible for:

- WorkOrder breakdown
- status tracking
- dependency tracking
- handoff hygiene
- meeting follow-up tracking

### 11.2 Creative Direction

#### Creative Director Agent

Responsible for:

- high-level product identity
- tone consistency
- creative tradeoffs
- cross-department coherence

Must not override Human Director.

#### Game Director Agent

Responsible for:

- gameplay direction
- player experience goals
- feature priority
- prototype selection

### 11.3 Game Design Department

#### Game Designer Agent

Responsible for:

- core loop
- player motivation
- mechanics proposal
- progression structure
- feature constraints

#### System Designer Agent

Responsible for:

- economy
- progression
- combat systems
- reward systems
- balance model

#### Level / Encounter Designer Agent

Responsible for:

- level flow
- encounter pacing
- difficulty ramps
- tutorial beats

### 11.4 Narrative Department

#### Scenario Director Agent

Responsible for:

- world direction proposal
- main plot structure
- character conflict
- theme design
- scenario work breakdown

Approval required for:

- core worldbuilding
- protagonist definition
- major character canon
- ending direction
- narrative change that conflicts with game genre

Forbidden:

- rewrite approved canon without approval
- create implementation tasks directly
- record unapproved settings as canon

Outputs:

- ScenarioPitch
- StoryArcPlan
- CharacterBrief
- ApprovalItems

#### Scenario Writer Agent

Responsible for:

- scene outline
- dialogue draft
- quest text
- character voice
- lore draft

Must distinguish:

- draft text
- proposed canon
- approved canon

### 11.5 Engineering Department

#### Technical Architect Agent

Responsible for:

- architecture boundaries
- module ownership
- lifecycle risk
- data flow
- future maintainability

#### Gameplay Programmer Agent

Responsible for:

- approved gameplay implementation
- component behavior
- data loading behavior
- runtime debugging

#### UI Programmer Agent

Responsible for:

- UI implementation
- HUD behavior
- input flow
- responsive presentation

#### Tools Engineer Agent

Responsible for:

- workflow tools
- automation scripts
- adapters
- project utilities

### 11.6 Art Department

#### Art Director Agent

Responsible for:

- visual identity
- art direction
- style consistency
- asset approval recommendations

#### Concept Artist Agent

Responsible for:

- concept proposals
- visual variations
- mood exploration

#### Pixel Artist Agent

Responsible for:

- sprite direction
- pixel asset drafts
- animation sheet requirements

#### VFX Artist Agent

Responsible for:

- particle direction
- hit effects
- UI effects
- readability of visual feedback

#### Asset Curator Agent

Responsible for:

- asset source tracking
- license/source metadata
- generated asset candidates
- import readiness

### 11.7 QA Department

#### QA Tester Agent

Responsible for:

- test plans
- smoke tests
- reproduction steps
- defect reports

#### Balance Tester Agent

Responsible for:

- balance observations
- economy pacing
- combat tuning suggestions

#### Bug Reproducer Agent

Responsible for:

- precise reproduction steps
- environment notes
- evidence capture

#### Regression Tester Agent

Responsible for:

- previously fixed behavior checks
- build/test history comparison
- no-regression evidence

### 11.8 Documentation / Release

#### Documentation Keeper Agent

Responsible for:

- DevLog
- workflow guide updates
- decision record hygiene
- user-facing documentation

#### Release Manager Agent

Responsible for:

- release checklist
- commit boundary review
- version notes
- deployment/release gate

---

## 12. Meeting Runtime

### 12.1 Meeting Types

```text
Creative Meeting
Technical Design Meeting
Production Planning Meeting
Review Meeting
QA Triage Meeting
Postmortem Meeting
Release Readiness Meeting
```

### 12.2 Meeting Lifecycle

```text
1. Meeting Request
2. Participant Selection
3. Context Pack Assembly
4. Agenda Confirmation
5. Opening Brief
6. Role-Specific Proposal Round
7. Objection / Risk Round
8. Synthesis Round
9. Director Decision Gate
10. Proposal / WorkOrder Generation
11. Meeting Minutes
12. Memory Update
13. Follow-up Tracking
```

### 12.3 Meeting Rules

- Every participant must speak from role authority.
- Participants should object when the proposal violates their quality criteria.
- Participants must ask questions when required context is missing.
- No participant may canonize, implement, import, commit, or release by meeting
  conversation alone.
- Meeting output must be converted into proposals, decisions, or work orders.
- Unresolved questions must remain visible.

### 12.4 Example Meeting Output

```yaml
MeetingSummary:
  topic: "Early combat loop direction"
  accepted_direction:
    - "Prototype A: compact enemy encounter loop"
  rejected_direction:
    - "Prototype B: large multi-zone loop; too large for current milestone"
  unresolved_questions:
    - "How many enemy archetypes can be supported by current animation budget?"
  approval_items:
    - "Approve Prototype A as first implementation target"
  follow_up_workorders:
    - "Design Prototype A combat loop"
    - "Create enemy archetype art constraints"
```

---

## 13. Memory Architecture

### 13.1 Memory Stores

```text
Relational Store
- canonical records
- WorkOrders
- Decisions
- Approvals
- RoleRuns
- ToolRuns
- MeetingSessions

Document Store
- markdown specs
- DevLogs
- meeting minutes
- proposal artifacts
- generated briefs

Vector Store
- semantic retrieval over documents
- role-specific context search
- meeting memory search

Graph / Relation Index
- proposal -> decision
- decision -> canon
- WorkOrder -> tasks
- ToolRun -> evidence
- agent -> output
```

### 13.2 Memory Status

```text
draft
proposed
approved
canon
rejected
deprecated
superseded
```

### 13.3 Canon Policy

Canon is special.

Rules:

- Only explicit Human Director decisions or delegated canon policy may create
  canon.
- Agent proposals never become canon automatically.
- Meeting consensus never becomes canon automatically.
- Generated documents must label canon, proposal, and speculation separately.
- Canon changes must produce a Decision record.

### 13.4 Retrieval Policy

Each RoleRun receives a Context Pack.

Context Pack includes:

- task/work order summary
- relevant approved decisions
- relevant canon
- relevant rejected directions
- role-specific constraints
- project profile rules
- tool permissions
- required output contract

Context Pack must not include irrelevant memory just because it exists.

---

## 14. Governance Model

### 14.1 Authority Levels

```text
L0 Observe
- read state
- summarize
- ask clarifying questions

L1 Propose
- create proposal
- create draft
- identify risks

L2 Plan
- create WorkOrder draft
- create implementation plan
- create asset request

L3 Execute Read-Only
- run safe read-only checks
- collect evidence
- inspect repo

L4 Execute Write
- modify approved files
- generate approved assets
- update approved docs

L5 Finalize
- task done
- finalization decision
- canon update

L6 Externalize
- commit
- push
- release
- publish
```

Rules:

- L0-L2 may often be autonomous.
- L3 may be autonomous only for allowlisted safe commands.
- L4 requires task-specific approval.
- L5 requires Human Director decision or strict deterministic policy.
- L6 requires explicit Human Director action.

### 14.2 Approval Item Structure

```yaml
ApprovalItem:
  approval_id: string
  type: scope | canon | implementation | asset_import | external_tool | completion | git
  plain_language_summary: string
  what_will_change: string[]
  what_will_not_change: string[]
  files_or_memory_affected: string[]
  risks: string[]
  rollback_plan: string[]
  evidence_required: string[]
```

Approval requests must not say only:

```text
within approved scope
```

They must show what changes.

### 14.3 Policy Engine

The policy engine decides:

- can auto-proceed
- needs human approval
- blocked
- needs clarification
- needs meeting
- needs review
- needs verification
- needs finalization

The policy engine must be deterministic.

LLM output can inform policy inputs, but LLM output is not the policy authority.

---

## 15. Execution Model

### 15.1 Execution Units

```text
WorkOrder
  -> Task
    -> RoleRun
    -> ToolRun
    -> Evidence
    -> VerificationReport
    -> CompletionReport
    -> FinalizationLog
```

### 15.2 Tool Adapter Requirements

Every tool adapter must support:

- declared capability
- permission class
- input schema
- output schema
- start detection
- end detection
- timeout handling
- failure handling
- stdout/stderr or equivalent log capture
- evidence artifact generation
- no hidden approval

### 15.3 Execution Safety

Forbidden:

- arbitrary shell command execution
- hidden destructive commands
- hidden file writes
- untracked asset import
- automatic commit/push
- secrets exposure
- cross-project writes without profile approval

---

## 16. Evidence, Review, Verification, Completion

### 16.1 Evidence

Evidence is raw or lightly structured observation.

Examples:

- logs
- screenshots
- build output
- changed files
- diff snapshots
- generated asset metadata
- meeting minutes
- proposal artifacts
- approval records

Evidence does not decide pass/fail.

### 16.2 Review

Review evaluates quality and risk.

Review may produce:

- Critical
- Major
- Minor
- Optional
- Scope Concern

### 16.3 Verification

Verification evaluates whether acceptance criteria are satisfied.

Verdicts:

- PASS
- PASS_WITH_NOTES
- CONCERNS
- BLOCKED
- FAIL

### 16.4 Completion

Completion asks:

- Did the work satisfy the approved objective?
- Are the remaining issues acceptable?
- Was validation performed?
- Is there evidence?
- Is the diff within scope?
- Does the user accept the result?

Completion does not automatically commit.

---

## 17. Studio UI

### 17.1 Required Screens

```text
Studio Home
Project Dashboard
Department View
Staff Agent View
Meeting Room
WorkOrder Board
Approval Inbox
Run Timeline
Evidence Viewer
Verification Report View
Completion Review Screen
Diff / Review Screen
Memory / Canon Browser
Proposal Browser
Decision Log
DevLog Viewer
Project Profile Manager
Tool Adapter Manager
Policy / Safety Settings
```

### 17.2 UI Principles

- The director should not memorize commands.
- Every card must answer "what is this", "why do I care", "what changes if I
  approve", and "what happens next".
- Approval cards must show concrete affected files, memory, canon, assets, or
  runtime behavior.
- Long evidence must be drill-down, not first-screen noise.
- Mobile UI must prioritize decision cards and status summaries.
- The UI must distinguish:
  - proposal
  - decision
  - canon
  - work order
  - task
  - run
  - evidence
  - completion
  - commit

---

## 18. Project Profile Layer

ProjectProfile makes the studio project-independent.

```yaml
ProjectProfile:
  project_id: string
  display_name: string
  project_type: cpp_game | unity_game | browser_game | document_project | other
  root_path: string
  source_paths: string[]
  data_paths: string[]
  asset_paths: string[]
  canon_paths: string[]
  build_commands: CommandRef[]
  test_commands: CommandRef[]
  validation_rules: string[]
  path_permission_rules: string[]
  devlog_paths: string[]
  artifact_paths: string[]
```

AIWorkflow Core must not hard-code PlayGround paths.

PlayGround is one ProjectProfile.

Unity project is another ProjectProfile.

---

## 19. Implementation Architecture

### 19.1 Suggested Runtime Stack

This is an implementation recommendation, not a product law.

```text
Backend:
- TypeScript or Python service
- SQLite for local first version
- PostgreSQL optional for multi-project / multi-device
- local file artifact storage
- vector store for document memory
- event bus / job queue for background runs

Agent Runtime:
- provider-neutral AgentRun interface
- OpenAI Agents SDK adapter
- local model adapter if needed
- external AI adapter if needed

UI:
- local web dashboard
- responsive mobile layout
- Discord adapter retained as optional notification/control surface

Execution:
- existing PC Runner
- existing Evidence / Verification / Completion layers
- tool adapters as allowlisted commands
```

### 19.2 Storage Layout

Repository-tracked:

```text
_Docs/AIWorkflow/
_Docs/AIWorkflow/Studio/
_DevLog/
```

Local untracked:

```text
_Local/AIWorkflowStudio/
_Temp/AIWorkflowStudio/
```

Runtime artifacts:

```text
_Temp/AIWorkflowStudio/projects/<project_id>/
_Temp/AIWorkflowStudio/workorders/<work_order_id>/
_Temp/AIWorkflowStudio/meetings/<meeting_id>/
_Temp/AIWorkflowStudio/runs/<role_run_id>/
_Temp/AIWorkflowStudio/tool_runs/<tool_run_id>/
```

Durable local database:

```text
_Local/AIWorkflowStudio/studio.sqlite
```

### 19.3 Event Model

```text
DirectorGoalSubmitted
MeetingRequested
MeetingStarted
AgentContextLoaded
AgentProposalSubmitted
AgentObjectionSubmitted
DirectorDecisionRecorded
WorkOrderCreated
ApprovalRequested
ApprovalGranted
RoleRunStarted
ToolRunStarted
EvidenceRecorded
VerificationGenerated
CompletionGenerated
FinalizationRecorded
TaskDoneRecorded
GitGateRequested
GitCommitRecorded
GitPushRecorded
```

Events make the studio inspectable and auditable.

---

## 20. Critical Invariants

These invariants must never be violated.

1. Proposal is not decision.
2. Decision is not canon unless canon policy says so.
3. Evidence collection is not verification.
4. Verification is not completion.
5. Completion is not commit.
6. Tool execution is not approval.
7. LLM output is not authority.
8. Staff memory is not automatically project fact.
9. Meeting consensus is not Human Director approval.
10. Project profile owns project-specific paths.
11. UI adapter must not own core workflow logic.
12. Auto-approval must remain deterministic and auditable.

---

## 21. Failure Modes To Design Against

### 21.1 Roleplay Without Responsibility

Symptom:

- agent speaks in a role style but has no durable memory, authority, or output
  contract.

Prevention:

- StaffAgent registry
- output contracts
- RoleRun artifacts
- memory policy

### 21.2 Canon Pollution

Symptom:

- unapproved lore or design assumptions become treated as fact.

Prevention:

- proposal/decision/canon separation
- canon approval gate
- memory status labels

### 21.3 Meeting Soup

Symptom:

- multi-agent chat produces interesting text but no usable work.

Prevention:

- MeetingSession schema
- proposals
- objections
- decisions
- follow-up WorkOrders

### 21.4 Approval Fog

Symptom:

- approval request says "within scope" but the director cannot see what changes.

Prevention:

- ApprovalItem.what_will_change
- affected files/memory/assets
- explicit non-goals

### 21.5 Tool Autonomy Creep

Symptom:

- tools start changing files, importing assets, or committing without clear
  approval.

Prevention:

- tool permission classes
- ToolRun approval refs
- git gate

### 21.6 Memory Hallucination

Symptom:

- agent cites memory that does not exist or confuses rejected ideas with canon.

Prevention:

- source_refs
- status labels
- retrieval audit
- "cannot claim without memory ref" rules

---

## 22. Implementation Roadmap

The roadmap must preserve final-form architecture. Reduced scope is allowed only
when it implements a durable slice of the final structure.

### Phase A: Official Studio Architecture

Goal:

- establish this document as the long-term product definition
- update document maps
- update Human Director guide

Outputs:

- Studio architecture spec
- README map entry
- guide link / summary

### Phase B: Studio Domain Model

Goal:

- define schemas for StaffAgent, Department, MeetingSession, WorkOrder, Memory,
  Proposal, Decision, Handoff, RoleRun, ToolRun

Outputs:

- JSON schemas
- storage layout
- invariant tests

### Phase C: Read-Only Staff Registry

Goal:

- create persistent staff definitions without autonomous execution

Outputs:

- staff registry
- department registry
- role detail view
- role permission display

### Phase D: WorkOrder Layer

Goal:

- introduce WorkOrder above current Task

Outputs:

- WorkOrder create/read/list
- WorkOrder -> Task conversion
- approval item rendering

### Phase E: Memory Foundation

Goal:

- implement durable local memory with status labels

Outputs:

- memory store
- decision store
- canon store
- retrieval API
- memory write policy

### Phase F: MeetingSession Runtime

Goal:

- create structured meetings with participants, agenda, turns, proposals,
  objections, decisions, and follow-up WorkOrders

Outputs:

- meeting create/start/continue/finalize
- meeting minutes
- proposal artifacts
- unresolved question tracking

### Phase G: Staff Agent Runtime

Goal:

- execute individual StaffAgent RoleRuns with context packs, output contracts,
  memory refs, and handoff records

Outputs:

- AgentRun adapter
- structured output validation
- RoleRun artifacts
- handoff router

### Phase H: Studio UI

Goal:

- build a local web UI for director operation

Outputs:

- dashboard
- approval inbox
- meeting room
- work order board
- memory/canon browser
- evidence/completion viewer

### Phase I: Tool Adapter Expansion

Goal:

- expand controlled adapters for asset generation, browser UI, external AI, and
  project-specific runners

Outputs:

- tool registry
- permission model
- evidence capture per tool

### Phase J: Conditional Automation

Goal:

- allow low-risk repetitive workflows to proceed with deterministic policy

Outputs:

- auto-approval expansion
- policy test suite
- audit replay
- rollback/repair flows

### Fixed Completion Standards

The roadmap is grouped into three fixed completion standards:

```text
A. Studio Console MVP
   The Human Director can use Studio to understand and operate work status,
   staff, meetings, verification material, and git gates.

B. Studio Runtime MVP
   Studio WorkOrders connect to the existing AIWorkflow Task lifecycle,
   PC Runner, VerificationReport, CompletionReport, FinalizationLog, and git
   gate without replacing those governance layers.

C. Personal AI Company v1
   Staff agents, meetings, work orders, approvals, execution handoff,
   verification material, decisions, memory/canon, completion review, and git
   gates form one governed company runtime.
```

After C is reached, new work must be classified as v1 stabilization, UX polish,
role/department expansion, tool adapter expansion, project profile expansion,
or a v2 candidate. Post-C improvements must not be reclassified as "v1 is
conceptually incomplete" unless one of the CompanyRuntimeReadinessReport C
gates regresses.

---

## 23. First Implementation Slice

The first implementation slice should not try to build every agent.

It should build the durable foundation that prevents future rewrite.

Recommended first slice:

```text
Studio Domain Model + Staff Registry + WorkOrder + Memory Status Policy
```

Why:

- It establishes real staff identity instead of prompt roleplay.
- It creates the layer above Task.
- It separates proposal, decision, and canon before creative agents start
  producing content.
- It allows future MeetingSession and AgentRun to use stable IDs and schemas.

Minimum deliverables:

- `StaffAgent.schema.json`
- `Department.schema.json`
- `WorkOrder.schema.json`
- `MeetingSession.schema.json`
- `MemoryRecord.schema.json`
- `Proposal.schema.json`
- `Decision.schema.json`
- local read-only registry command or service
- guide update explaining that StaffAgent is not a prompt

---

## 24. Human Director Experience Target

The final user experience should feel like:

```text
I give a large goal.
The studio selects the right departments.
Staff agents prepare proposals, objections, and risks.
I approve direction.
The studio creates work orders.
Approved staff execute or supervise work.
Evidence and verification are collected.
I review completion.
The studio records finalization.
I decide commit/push/release.
```

The user should not feel like:

```text
I am writing prompts for every worker.
I am manually copying context between tools.
I am guessing which command to run.
I am auditing invisible AI behavior.
I am cleaning up untracked decisions.
```

---

## 25. Final Definition

AIWorkflow Studio is a personal AI development company runtime.

It is built from:

- persistent AI staff agents
- departments
- structured meetings
- durable memory
- proposal/decision/canon separation
- work orders
- governed execution
- evidence
- verification
- completion
- finalization
- git gates
- project profiles
- tool adapters
- director-first UI

The current AIWorkflow Core is the operating core of that company.

The next evolution is not more Discord commands.

The next evolution is to turn roles into persistent staff, meetings into
artifacts, proposals into decisions, and tasks into governed work orders.

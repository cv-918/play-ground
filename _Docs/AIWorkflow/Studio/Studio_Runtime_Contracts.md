# Studio Runtime Contracts

## Purpose

This document defines the runtime contracts for persistent AI staff agents,
creative meetings, memory access, role runs, tool runs, handoffs, and evidence.

It is a product-level design contract for the Personal AI Development Studio.

It does not implement live autonomous staff execution yet.

## Non-Negotiable Principle

```text
Agent Autonomy within Workflow Governance.
```

Staff agents may reason, propose, object, ask questions, and hand work to other
staff inside their role charter.

They may not directly approve, canonize, implement, import, commit, push, or
release outside governance.

## Director Goal Planning Contract

The Human Director may start with a broad goal instead of a fully scoped task.

That goal must first become a `DirectorGoalPlan` before it is handed to
meetings, staff agents, or AIWorkflow task execution.

A DirectorGoalPlan records:

- the original Director goal
- target project profile
- recommended departments
- recommended staff agents
- routing reasons
- Director constraints
- approval items
- non-goals
- meeting candidates
- WorkOrder candidates
- Proposal candidates
- next steps
- safety flags

Planning a goal does not execute work. It may create Studio planning records
only. It must not canonize memory, modify source/data/assets/docs, create a
task lifecycle decision, mark a task done, commit, or push.

The deterministic console route is intentionally conservative. LLM staff runs
may later refine the plan, but they must still produce structured proposals
and approval items rather than silently changing project state.

## Meeting Facilitation Contract

Creative and technical meetings are not scripts. They are structured
collaboration sessions with participants, agenda, discussion turns, proposals,
objections, unresolved questions, Director decisions, accepted directions,
rejected directions, and follow-up work.

A Meeting Facilitation Plan may summarize the current meeting and recommend:

- what the current meeting state means
- which staff agent should speak next
- why that staff agent is recommended
- whether to keep discussing, create follow-up work, record a decision, or end
  the meeting
- blockers such as unresolved questions or objections

The facilitation plan is advisory. It must not append a meeting turn, run a
staff agent, create work, record a decision, canonize memory, commit, or push.
Those actions remain separate buttons and governance gates.

## Knowledge Transition Contract

Proposal, Decision, and MemoryRecord are different levels of commitment.

- Proposal: an idea candidate. It is not approved and not canon.
- Decision: a Human Director judgment record. It can become project memory.
- MemoryRecord: reusable context for future staff agents.
- Canon MemoryRecord: a memory record treated as official setting or durable
  project truth.

The Studio UI must show a transition plan before a user has to remember these
rules. A Knowledge Transition Plan explains:

- what the current record means
- possible next actions
- what changes if the user accepts the transition
- what does not change
- what the Human Director should check before memory/canon adoption

Reading a transition plan is read-only. Creating a Decision, MemoryRecord, or
canon MemoryRecord remains an explicit button action.

## Project Execution Contract

Project execution depends on the active Project Profile and tool adapter
registry.

Core logic must not hard-code a specific game project path. Project Profile
records provide source roots, data roots, build profiles, validation profiles,
and project-specific boundaries.

A ProjectExecutionPlan explains:

- which Project Profile is active
- which build and validation profiles exist
- which tool adapters are available
- which tools can write files
- which tools can call external services or incur cost
- which actions require Human Director approval before execution
- what to check before a ToolRunRequest, build, validation, or runner action

Reading a ProjectExecutionPlan is read-only. It must not run a build, run a
tool, modify files, create a task decision, commit, or push.

## Completion Decision Contract

Completion review is a Human Director decision point.

The system may collect validation material and summarize completion state, but
it must not decide that work is complete without the appropriate policy gate or
human decision.

A CompletionDecisionPlan explains:

- the current task and runner run
- the verification verdict
- what the completion gate means
- when to use accept, accept-concerns, request-changes, or defer
- what changes after each decision
- remaining concerns and warnings
- what the Director should check before finalization

Reading a CompletionDecisionPlan is read-only. It must not write a
FinalizationLog, mark a task done, commit, or push. Those remain explicit
finalization and git gate actions.

## Staff Agent Runtime Contract

A persistent StaffAgent is not a prompt.

A StaffAgent runtime invocation must be built from:

- StaffAgent registry record
- Department registry record
- role charter
- authority rules
- memory policy
- tool policy
- output contracts
- meeting behavior
- handoff behavior
- evidence responsibility
- quality criteria
- current project profile
- current WorkOrder, MeetingSession, Task, or Director goal
- relevant approved decisions and memory records

The runtime must produce structured output, not only free-form chat.

The concrete input/output contracts are defined in:

```text
_Docs/AIWorkflow/Studio/Staff_Context_And_Output_Contract.md
_Docs/AIWorkflow/Studio/Schemas/StaffContextPacket.schema.json
_Docs/AIWorkflow/Studio/Schemas/RoleRunOutput.schema.json
```

## Staff Context Packet

Every RoleRun must receive a context packet with these fields:

```text
role_run_id
agent_id
department_id
source_type
source_ref
objective
current_project_profile
director_intent
approved_scope
non_goals
relevant_memory_refs
relevant_decision_refs
relevant_evidence_refs
allowed_tools
blocked_tools
approval_required_tools
required_outputs
quality_criteria
stop_conditions
```

If any required field is missing, the agent must ask a question or return a
blocked output instead of inventing missing context.

The first local context builder is:

```bat
tools\aiworkflow\studio_context_builder.bat plan scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_context_builder.bat create scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
```

It builds a sealed StaffContextPacket from a concrete StaffAgent registry entry
and a WorkOrder. It may include matching MemoryRecord refs through
`--memory-query`, but it does not call an LLM, create a RoleRun, execute the
staff agent, create tasks, approve work, write memory, write canon, modify
source files, commit, or push.

The first local staff prompt exporter is:

```bat
tools\aiworkflow\studio_staff_prompt_exporter.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_prompt_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
```

It turns a StaffContextPacket into a Codex-ready prompt that demands
RoleRunOutput JSON and repeats governance boundaries. It writes only `_Temp`
prompt artifacts and does not call an LLM or execute staff.

The first local signed-in Codex staff executor is:

```bat
tools\aiworkflow\studio_staff_executor.bat status
tools\aiworkflow\studio_staff_executor.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_executor.bat run _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json --execute
```

It calls local `codex exec -` only when `--execute` is explicit. The default
policy is signed-in Codex App/CLI first, `gpt-5.5`, high reasoning, read-only
sandbox, and no OpenAI API billing by default. It stores stdout, stderr,
metadata, and parseable `RoleRunOutput` JSON under `_Temp`.

The first local Handoff router is:

```bat
tools\aiworkflow\studio_handoff_router.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json
tools\aiworkflow\studio_handoff_router.bat create-context _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json --execute
```

It validates source/target staff identity and source-to-target handoff
permission, then produces a sealed target-agent StaffContextPacket. When
possible, it resolves `RoleRunOutput` evidence refs into short evidence
summaries so the next staff agent receives usable context instead of only an
opaque artifact id. It does not execute the target agent, approve the handoff,
write canon, create tasks, modify source files, commit, or push.

The first local Human Director review packet exporter is:

```bat
tools\aiworkflow\studio_review_packet_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
```

It renders a RoleRunOutput into `_Temp` HTML with Korean review labels for
summary, questions, approval items, objections, proposals, handoffs,
WorkOrder candidates, memory candidates, evidence refs, and safety flags. It
does not approve, materialize, execute, write canon, create tasks, modify
source files, commit, or push.

The read-only dashboard also lists recent staff-run records from
`_Temp\AIWorkflowStudio\staff_runs` and generated review packet links from
`_Temp\AIWorkflowStudio\review_packets` so the Human Director can jump from the
Studio overview to the concrete staff-output evidence and review surfaces. The
dashboard remains read-only and does not execute packet actions.

The first local Studio Director Console is:

```bat
tools\aiworkflow\studio_director_console.bat --host 127.0.0.1 --port 47831
tools\aiworkflow\studio_director_console.bat --once --json
```

It serves a local-only browser UI for Studio metrics, Project Dashboard,
Director Inbox / 감독자 결정함, handoff candidates, execution timeline,
materialized draft records, WorkOrders, MeetingSessions, Department and
StaffAgent directories, Project Profiles, Tool Adapters,
Proposal/Decision/Memory browser panels, Diff / 변경 검토, Evidence / 검증 자료,
DevLog, Conditional Automation policy evidence, and review packet links. The
console may call only allowlisted Studio actions: refresh summary, export the
static dashboard, preview or execute the existing read-only staff handoff
pipeline, materialize RoleRunOutput into governed draft records, record Human
Director decisions for materialized drafts, create Backlog tasks from reviewed
WorkOrders, explicitly create/start/finalize MeetingSession records after a
browser button click, route approved workflow tasks to PC Runner, record
completion finalization decisions, and run selected-file Git commit or
commit+push gate operations. It may also run Conditional Automation status,
validate, test, `_Temp` test-write, replay, and repair-plan commands. It does
not let AI staff autonomously approve task execution, start PC Runner, write
canon, modify source files, commit, or push.

The first local Staff pipeline is:

```bat
tools\aiworkflow\studio_staff_pipeline.bat handoff _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json --execute --model gpt-5.5 --reasoning high --ephemeral
```

It connects the Handoff router, signed-in Codex staff executor, and review
packet exporter for read-only staff handoff runs. It may call the signed-in
Codex CLI when `--execute` is passed, but it does not approve work, create
Backlog tasks, write canon, modify source files, commit, or push.

## RoleRun Lifecycle

```text
created
context_loaded
planning
tool_review
running
handoff_pending
output_ready
needs_director_decision
completed
blocked
failed
cancelled
```

### RoleRun Responsibilities

A RoleRun may:

- inspect allowed context
- search approved memory/document sources
- produce proposals
- object to risks
- ask clarifying questions
- request approval items
- recommend WorkOrders
- hand off to another staff agent

A RoleRun may not:

- write canon directly unless explicitly authorized
- execute source edits directly
- approve its own proposal
- mark tasks done
- claim validation without evidence
- commit or push

## ToolRun Contract

ToolRun is the trace of a tool invocation requested by a RoleRun, Runner, or
Studio API.

ToolRun must record:

- tool_run_id
- requester role_run_id or system actor
- tool_id
- command or adapter name
- input summary
- approval reference when needed
- start/end time
- exit status
- evidence paths
- error summary
- safety flags

ToolRun may produce evidence.

ToolRun cannot decide approval, verification pass/fail, completion, or commit.

## ToolRunRequest Contract

ToolRunRequest is the pre-execution governance request for a future ToolRun.

It records:

- who requested the tool
- which ToolAdapter is requested
- what action is requested
- why the action is needed
- permission class
- input refs
- expected outputs
- evidence requirements
- approval ref when already available
- request status

ToolRunRequest planning may evaluate ToolAdapter policy and return:

```text
allowed_without_execution
human_required
ready_for_execution_gate
blocked
```

ToolRunRequest planning must not execute adapters, call LLMs, create tasks,
approve work, write canon, modify source files, mark work done, commit, or
push.

## Memory Access Contract

Memory is not a single bucket.

Memory records must be tagged by:

- scope
- status
- source
- owner
- project profile
- related WorkOrder or Task
- evidence refs
- supersedes/superseded_by links when applicable

Allowed memory statuses:

```text
draft
proposed
approved
canon
rejected
deprecated
superseded
evidence
lesson
```

### Memory Read Rules

Staff agents may read memory according to their registry `memory_policy`.

The context loader must distinguish:

- canon facts
- approved decisions
- proposals
- rejected ideas
- lessons
- evidence

Agents must not treat proposals as canon.

### Memory Write Rules

Staff agents may draft memory records only inside their writable scopes.

Writing `approved` or `canon` memory requires governance:

- explicit Human Director decision, or
- deterministic policy decision that is allowed for that memory type

Rejected and superseded memory must remain searchable so agents do not repeat
old mistakes.

## Canon Governance Contract

Canon is the set of approved project facts that future creative, design, art,
and implementation work must respect.

Canon can include:

- worldbuilding facts
- character facts
- tone and art direction
- gameplay identity
- data/schema conventions
- architecture decisions
- project constraints

Canon changes require an ApprovalItem that clearly states:

- what changes
- what does not change
- why the change is needed
- affected documents/files/memory
- rollback or supersession plan
- downstream roles affected

No StaffAgent may silently canonize its own output.

The first local proposal/decision store is:

```bat
tools\aiworkflow\studio_decision_store.bat status
tools\aiworkflow\studio_decision_store.bat create-proposal _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_proposal.example.json --execute
tools\aiworkflow\studio_decision_store.bat create-decision _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_decision.example.json --execute
tools\aiworkflow\studio_decision_store.bat canon-plan DEC-20260518-153500-motivation
```

It stores Proposal and Decision records only when `--execute` is explicit.
`canon-plan` prepares the memory/canon handoff but does not write memory or
canon. Proposal storage is not approval. Decision storage is not task
execution approval.

The first local RoleRunOutput materializer is:

```bat
tools\aiworkflow\studio_output_materializer.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat materialize _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json --execute
```

It turns staff output into draft/proposed Proposal, MemoryRecord, WorkOrder,
and Handoff records, plus one materialization manifest. It does not approve
those records, create Backlog tasks, write canon, execute tools, call LLMs,
modify source files, commit, or push.

The first local materialization review tool is:

```bat
tools\aiworkflow\studio_materialization_review.bat plan MAT-20260518-150000-scenario --decision approve --target all
tools\aiworkflow\studio_materialization_review.bat record MAT-20260518-150000-scenario --decision approve --target all --execute
```

It records Human Director decisions about materialized draft records. Decision
records may approve, reject, defer, request changes, or accept concerns. They
do not create tasks, write canon, execute accepted records, modify source
files, commit, or push.

## MeetingSession Runtime Contract

A MeetingSession is a structured work session, not a loose chat transcript.

Every MeetingSession must define:

- meeting_session_id
- topic
- source_ref
- participants
- chair role
- agenda
- known constraints
- director intent
- relevant memory refs
- discussion turns
- proposals
- objections
- unresolved questions
- director decisions
- accepted directions
- rejected directions
- follow-up WorkOrders
- evidence refs
- close state

## Meeting Lifecycle

```text
draft
scheduled
context_loaded
in_progress
director_decision_needed
follow_up_tasking
closed
blocked
cancelled
```

## Meeting Behavior Rules

Participants must speak from their role charter.

They must object when their role charter says they must object.

They must ask when director intent, canon, scope, or evidence is unclear.

They must separate:

- idea
- proposal
- accepted direction
- approved decision
- canon
- WorkOrder
- executable Task

Meeting output is incomplete unless it records:

- what was accepted
- what was rejected
- what remains unresolved
- what requires Human Director approval
- what WorkOrders should be created next

The local meeting runtime tool provides the first deterministic implementation
slice for this contract:

```bat
tools\aiworkflow\studio_meeting_runtime.bat inspect <meeting_json_path>
tools\aiworkflow\studio_meeting_runtime.bat handoff <meeting_json_path>
tools\aiworkflow\studio_meeting_runtime.bat create <meeting_json_path> --execute
```

It validates staff participation, chair membership, discussion turn speakers,
unresolved questions, and follow-up WorkOrder ids. It does not create
WorkOrders or tasks by itself.

## Handoff Contract

Handoff is a structured transfer of responsibility between staff agents or
between Studio layer and AIWorkflow Core.

Every handoff must include:

- source actor
- target actor
- objective
- scope
- non-goals
- context refs
- expected output
- evidence requirements
- approval requirements
- stop conditions

Receiving agents may reject or block a handoff if required context is missing.

## Approval Item Contract

Approval requests must be understandable without hunting through logs.

Every approval item must show:

- why approval is needed
- what will change
- what will not change
- files, memory, canon, assets, tools, or runtime behavior affected
- concrete risks
- evidence required after execution
- rollback or correction path

Bad approval text:

```text
Approve execution within scope.
```

Good approval text:

```text
Approve changing UserData.json stage_progress default handling only.
No JSON schema change, no unrelated gameplay tuning, no asset import.
Evidence required: JSON smoke, loader readability check, Debug x64 build.
```

## Evidence Contract

Evidence must be attached to claims.

User-facing Korean UI and guide text should call this `검증 자료`, not the
older literal Korean label. Internal schema names, path names, and JSON fields such as
`evidence_refs` remain `evidence` for compatibility.

Examples:

- proposal claim -> source memory or decision refs
- implementation claim -> diff refs and changed file list
- validation claim -> command, exit code, log path, report id
- completion claim -> CompletionReport and FinalizationLog refs
- canon claim -> approved Decision refs

If evidence / 검증 자료 is missing, output status must be `needs_evidence`, `blocked`, or
`concerns`, not `pass`.

## Provider Independence

The runtime may use OpenAI, Codex CLI, local models, browser adapters, or future
external AI systems.

Default Studio provider policy:

- Use Codex App/CLI signed-in execution first.
- Do not require OpenAI API keys or API billing by default.
- Use other LLM providers only when the Codex/ChatGPT route cannot meet quality
  requirements.
- Staff runtime planning may prepare a RoleRun envelope without calling any LLM.

The first local staff runtime tool is:

```bat
tools\aiworkflow\studio_staff_runtime.bat plan <context_packet_json_path>
tools\aiworkflow\studio_staff_runtime.bat create <context_packet_json_path> --execute
tools\aiworkflow\studio_staff_runtime.bat inspect-output <role_run_output_json_path>
```

It validates StaffContextPacket boundaries, creates RoleRun envelopes, and
checks RoleRunOutput safety flags. It does not call LLMs, call tools, create
WorkOrders, create tasks, approve work, write canon, modify source files,
commit, or push.

## Tool Adapter Governance

Tool adapters are registered before use. A registered adapter must disclose:

- whether it can modify files
- whether it can call external systems
- whether it can incur cost
- whether Human Director approval is required
- which actions are allowed
- which actions are blocked
- which evidence / 검증 자료 outputs are required

The first read-only registry tool is:

```bat
tools\aiworkflow\studio_tool_registry_status.bat validate
tools\aiworkflow\studio_tool_registry_status.bat adapter codex_cli_signed_in
```

The first ToolRunRequest planner is:

```bat
tools\aiworkflow\studio_tool_run_planner.bat status
tools\aiworkflow\studio_tool_run_planner.bat plan _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json
tools\aiworkflow\studio_tool_run_planner.bat create _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json --execute
```

It validates ToolRunRequest JSON, reads the ToolAdapter registry, reports
adapter availability, blocked actions, approval needs, cost/external/file risk,
and required evidence / 검증 자료. It stores request records only when `--execute` is
explicit. It does not execute the requested adapter.

The registry includes the current LLM policy:

- Codex App/CLI signed-in routes are the default LLM execution path.
- ChatGPT/Codex subscription capabilities are preferred over raw API billing.
- Codex image generation is the first planned image-generation route.
- Other providers are considered only after Codex/ChatGPT quality is
  insufficient for the specific task.

Provider-specific behavior must stay behind adapters.

The core records must remain provider-independent:

- StaffAgent
- RoleRun
- ToolRun
- ToolRunRequest
- WorkOrder
- MeetingSession
- Proposal
- Decision
- MemoryRecord
- Evidence / 검증 자료
- Approval
- Verification
- Completion
- Finalization

## Conditional Automation Governance

Conditional automation is a policy test, not a staff privilege.

Automation may proceed only when a deterministic policy evaluation returns
`auto_allowed`. If the result is `human_required`, the Human Director must
approve the specific scope first. If the result is `blocked`, the system must
produce a repair plan instead of running the action.

The first local policy tool is:

```bat
tools\aiworkflow\studio_conditional_automation.bat validate
tools\aiworkflow\studio_conditional_automation.bat test
tools\aiworkflow\studio_conditional_automation.bat test --execute
tools\aiworkflow\studio_conditional_automation.bat replay <evaluation_json_path>
tools\aiworkflow\studio_conditional_automation.bat repair-plan <evaluation_json_path>
```

`test --execute` writes an evaluation record under `_Temp` so later policy
changes can be replayed. The tool does not approve tasks, create tasks, start
runners, call LLMs, write memory, write canon, modify source files, commit, or
push.

## Current Implementation Status

Current status:

```text
interactive guarded Studio runtime foundation
```

Implemented now:

- durable StaffAgent/Department registries
- core Studio schemas
- WorkOrder to Task bridge schema and rules
- registry and dashboard inspection commands
- governed WorkOrder, Memory, Proposal, and Decision local stores
- WorkOrderTaskBinding record creation when a Studio WorkOrder creates a
  Backlog task
- governed MeetingSession lifecycle records
- governed RoleRun envelopes and RoleRunOutput routing previews
- ToolAdapter registry and governed ToolRunRequest planner
- StaffContextPacket builder
- Staff prompt exporter for signed-in Codex App/CLI execution input
- Staff executor for signed-in Codex CLI read-only RoleRun attempts
- Handoff router from Handoff records to target-agent StaffContextPacket
- Staff pipeline for read-only Handoff -> staff run -> review packet chaining
- RoleRunOutput materializer for draft Proposal, Memory, WorkOrder, and
  Handoff records
- materialization review decision recorder
- review packet exporter for Human Director-readable RoleRunOutput HTML
- conditional automation replay and repair-plan support
- interactive Studio Director Console with Korean-labeled Director-facing
  Home, Project Dashboard, Director Inbox, Departments, Staff, Meeting Room,
  Staff Runs, Work Orders, Knowledge, Timeline, Diff Review, Evidence / 검증 자료,
  and DevLog pages: `홈`, `프로젝트`, `감독자 결정함`, `부서`, `AI 직원`, `회의실`,
  `직원 보고서`, `업무 지시`, `지식/결정`, `실행 타임라인`, `변경 검토`, `검증 자료`,
  and `DevLog`; Systems and Policy remain internal/admin pages hidden under
  `내부 도구` by default
- Studio Console actions for MeetingSession creation/turns, AI staff meeting
  contribution plan/run, WorkOrder to StaffContextPacket plan/store, WorkOrder
  staff run plan/run, Proposal to Decision, Decision to Memory/canon Memory,
  RoleRunOutput review packet export, guarded ToolRunRequest plan/store, and
  selected-file Git gate operations

Not implemented yet:

- autonomous staff-to-staff execution without Human Director review
- persistent background staff scheduling

Studio records are governed local runtime artifacts. They can prepare, store,
route, execute explicitly approved signed-in Codex RoleRuns, and audit staff
work, but they do not let AI staff autonomously approve work, write canon,
create tasks, commit, push, or change project files.

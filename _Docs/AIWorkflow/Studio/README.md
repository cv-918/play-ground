# AIWorkflow Studio Domain Model

## Purpose

This folder contains the first durable implementation slice for the
Personal AI Development Studio / AI Studio Company Runtime architecture.

The goal of this slice is not to execute autonomous staff agents yet.

The goal is to define the stable domain model that future staff agents,
meetings, work orders, memory, decisions, handoffs, tool runs, and evidence
will use.

User-facing Korean UI and guide text should label `Evidence` as
`검증 자료`. Internal schema names, file paths, and JSON fields such as
`evidence_refs` remain unchanged for compatibility.

## Scope

This slice defines:

- DirectorGoalPlan schema
- StaffAgent schema
- Department schema
- WorkOrder schema
- MeetingSession schema
- MeetingFacilitationPlan schema
- MemoryRecord schema
- KnowledgeTransitionPlan schema
- Proposal schema
- Decision schema
- Handoff schema
- RoleRun schema
- ToolRun schema
- ToolRunRequest schema
- WorkOrderTaskBinding schema
- StaffContextPacket schema
- RoleRunOutput schema
- ToolAdapter schema
- ProjectExecutionPlan schema
- CompletionDecisionPlan schema
- ConditionalAutomationCase schema
- Memory status policy
- Conditional automation policy
- Initial read-only department and staff registries
- Director goal planning intake that turns a broad Human Director goal into
  recommended departments, staff, meeting candidates, WorkOrder candidates,
  Proposal candidates, approval items, non-goals, and next steps without
  executing implementation, canonizing memory, modifying source files, or
  committing/pushing
- WorkOrder to Task bridge rules
- Runtime contracts for staff agents, meetings, memory, tools, and evidence
  / 검증 자료
- Staff context and structured output contract
- Scenario Director context/output examples
- Creative MeetingSession to WorkOrder to TaskBinding examples
- Canon decision flow and proposal/decision/memory examples
- Local WorkOrder store and read/list/store tool
- Local Proposal/Decision store, validation, and canon handoff planner
- Local MemoryRecord store, validation, canon view, and retrieval query tool
- Deterministic Knowledge Transition Plan for Proposal, Decision, and
  MemoryRecord records. It explains whether a record is only an idea, a
  Director decision, a normal memory, or canon-like memory; what changes when
  it is accepted; what does not change; and what the Human Director must check
  before turning it into memory or canon.
- Local MeetingSession runtime validation and handoff tool
- Deterministic Meeting Facilitation Plan that explains the current meeting
  state, recommends the next speaker/action, lists Director decision options,
  and keeps AI staff discussion separate from canon, implementation, task
  lifecycle, and git decisions
- Local StaffContextPacket builder from StaffAgent and WorkOrder records
- Local Staff execution prompt exporter for Codex signed-in route
- Local Staff executor for signed-in Codex App/CLI read-only RoleRun attempts
- Local Handoff router from Handoff records to target-agent StaffContextPacket
- Local Staff pipeline for Handoff -> context -> signed-in Codex staff run ->
  review packet
- Local Staff RoleRun planning and RoleRunOutput inspection tool
- Local RoleRunOutput materializer for Proposal, Memory, WorkOrder, and
  Handoff drafts
- Local materialization review tool for Human Director Decision records
- Read-only Studio dashboard HTML snapshot export with Director Inbox, staff
  run timeline, and review packet links
- Read-only RoleRunOutput review packet HTML export for Human Director review
- Local-only Studio Director Console server with a sidebar-based Director
  workspace. The normal Director-facing pages are Korean-labeled Home,
  Project Dashboard, Director Inbox, Department, Staff, Meeting Room, Staff
  Runs, Work Orders, Knowledge, Timeline, Diff Review, Evidence / 검증 자료, and
  DevLog pages: `홈`, `프로젝트`, `감독자 결정함`, `부서`, `AI 직원`, `회의실`,
  `직원 보고서`, `업무 지시`, `지식/결정`, `실행 타임라인`, `변경 검토`,
  `검증 자료`, and `DevLog`.
  Systems and Policy are
  internal/admin pages and are hidden under the `내부 도구` section by
  default. Home is the Director situation board for recent work,
  staff status, and AIWorkflow Core state. The Goal Planning page
  (`목표 기획`) is the Director-facing intake for broad goals; it produces a
  deterministic DirectorGoalPlan preview and can store the plan or create
  governed MeetingSession, WorkOrder, and Proposal candidates. Director-facing
  page cards explain
  what the Director can do on that page, translate department/staff/artifact
  identifiers into Korean labels, and keep raw JSON, registry, and run evidence
  / 검증 자료
  links collapsed under internal/debug inspection details instead of exposing
  them as normal Director actions. The other Director-facing pages expose dashboard refresh,
  project profile overview, consolidated Director decisions, handoff plan,
  explicit read-only staff handoff execution, staff run timeline,
  RoleRunOutput review packet export actions, governed record-candidate
  materialization actions, materialized draft decision actions,
  WorkOrder task creation actions, direct MeetingSession creation and turn
  recording, direct WorkOrder creation, direct Proposal/Decision/Memory record
  creation, Department/StaffAgent directory cards, Proposal/Decision/Memory
  browser panels, Meeting Room inspection/lifecycle actions, MeetingSession to
  AI staff meeting-turn plan/run actions, MeetingSession to
  follow-up WorkOrder/Decision actions, WorkOrder to StaffContextPacket
  planning/storage actions, WorkOrder to signed-in Codex staff-run plan/run
  actions, Proposal to Decision actions, Decision to Memory/canon Memory
  actions, Diff Review selected-file Git gate actions, DevLog links, and review
  packet links. The internal/admin pages expose Project
  Profile and Tool Adapter browser panels, governed ToolRun Request
  planning/storage actions, and Conditional Automation policy test actions.
  The evidence / 검증 자료 review surfaces translate common completion concerns into
  human-readable meaning: failed/cancelled sessions explain that a previous
  runner or staff execution stopped, and file-category warnings explain whether
  the signal touches workflow state, workflow tooling, game data, or game
  source. Finalization confirmations distinguish accepting clean results,
  accepting known concerns, requesting fixes, rejecting, and deferring.
- WorkOrderTaskBinding records written when WorkOrder planner creates a Backlog
  task
- ToolAdapter schema and read-only tool adapter registry
- ToolRunRequest store and deterministic adapter-governance planner
- Deterministic ProjectExecutionPlan for the active Project Profile. It shows
  build/validation profiles, enabled tool adapters, human-approval-required
  tool effects such as file writes, external calls, and cost, and recommended
  next checks without executing tools or changing workflow state.
- Deterministic CompletionDecisionPlan for the current AIWorkflow completion
  gate. It explains the current verdict, decision options, effects of
  accepting/accepting concerns/requesting changes/deferring, remaining
  concerns, and Director checklist without writing finalization, marking done,
  committing, or pushing.
- Conditional automation case suite, deterministic policy test, replay, and
  repair-plan tool

## Current Execution Status

Current status:

```text
domain model foundation + guarded local runtime stores/builders/exporters
```

This folder does not:

- execute staff agents automatically
- call OpenAI API billing by default
- modify project source
- approve tasks
- mark tasks done
- commit or push

## Local Registry Inspection

The first executable support tool is read-only:

```bat
tools\aiworkflow\studio_registry_status.bat
tools\aiworkflow\studio_registry_status.bat validate
tools\aiworkflow\studio_registry_status.bat departments
tools\aiworkflow\studio_registry_status.bat staff scenario_director
tools\aiworkflow\studio_workorder_planner.bat status
tools\aiworkflow\studio_workorder_planner.bat list
tools\aiworkflow\studio_workorder_planner.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_workorder_planner.bat store _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
tools\aiworkflow\studio_workorder_planner.bat create _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
tools\aiworkflow\studio_decision_store.bat create-proposal _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_proposal.example.json --execute
tools\aiworkflow\studio_decision_store.bat create-decision _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_decision.example.json --execute
tools\aiworkflow\studio_decision_store.bat canon-plan DEC-20260518-153500-motivation
tools\aiworkflow\studio_memory_store.bat status
tools\aiworkflow\studio_memory_store.bat validate
tools\aiworkflow\studio_memory_store.bat list
tools\aiworkflow\studio_memory_store.bat canon
tools\aiworkflow\studio_memory_store.bat query protagonist
tools\aiworkflow\studio_memory_store.bat read MEM-20260518-154000-motivation
tools\aiworkflow\studio_memory_store.bat create _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_canon_memory.example.json --execute
tools\aiworkflow\studio_meeting_runtime.bat inspect _Docs\AIWorkflow\Studio\Examples\creative_meeting_session.example.json
tools\aiworkflow\studio_meeting_runtime.bat handoff _Docs\AIWorkflow\Studio\Examples\creative_meeting_session.example.json
tools\aiworkflow\studio_meeting_runtime.bat create _Docs\AIWorkflow\Studio\Examples\creative_meeting_session.example.json --execute
tools\aiworkflow\studio_meeting_runtime.bat start MEET-20260518-151000-scenario --execute
tools\aiworkflow\studio_meeting_runtime.bat add-turn MEET-20260518-151000-scenario scenario_director synthesis "Summarize current direction." --execute
tools\aiworkflow\studio_meeting_runtime.bat finalize MEET-20260518-151000-scenario --execute
tools\aiworkflow\studio_context_builder.bat plan scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_context_builder.bat create scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
tools\aiworkflow\studio_staff_prompt_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_executor.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_handoff_router.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json
tools\aiworkflow\studio_handoff_router.bat create-context _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json --execute
tools\aiworkflow\studio_staff_pipeline.bat handoff _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json --execute --model gpt-5.5 --reasoning high --ephemeral
tools\aiworkflow\studio_staff_runtime.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_runtime.bat create _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json --execute
tools\aiworkflow\studio_staff_runtime.bat inspect-output _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_staff_runtime.bat route-output _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat materialize _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json --execute
tools\aiworkflow\studio_materialization_review.bat plan MAT-20260518-150000-scenario --decision approve --target all
tools\aiworkflow\studio_dashboard_export.bat
tools\aiworkflow\studio_review_packet_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_director_console.bat --host 127.0.0.1 --port 47831
tools\aiworkflow\studio_director_console.bat --once --json
tools\aiworkflow\studio_tool_registry_status.bat validate
tools\aiworkflow\studio_tool_registry_status.bat adapter codex_cli_signed_in
tools\aiworkflow\studio_tool_run_planner.bat plan _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json
tools\aiworkflow\studio_tool_run_planner.bat create _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json --execute
tools\aiworkflow\studio_conditional_automation.bat validate
tools\aiworkflow\studio_conditional_automation.bat test --execute
```

These tools validate registry references, print department/staff details, and
preview or create WorkOrder-derived Backlog tasks, store governed WorkOrder
records, governed Proposal and Decision records, governed MemoryRecord files,
governed MeetingSession records, governed RoleRun envelopes, read-only
dashboard snapshots, tool adapter policy displays, governed ToolRunRequest
records, sealed StaffContextPacket records, Codex-ready staff prompt
artifacts, and RoleRunOutput materialization manifests. ToolRunRequest records
evaluate adapter permission, approval, cost, and evidence needs before any tool
executes. Staff prompt export prepares the signed-in Codex App/CLI input but
still does not call a model. Staff executor can call signed-in Codex CLI only
with `run --execute`; it stores evidence under `_Temp` and uses a read-only
sandbox. Studio Console exposes this through explicit WorkOrder buttons:
Context preview, Context storage, staff execution plan, and staff execution.
The execution button calls the signed-in Codex route and still cannot approve
work, modify source files, write canon, mark tasks done, commit, or push.
Handoff router can turn a Handoff record into the next target agent's sealed
StaffContextPacket, but it does not execute the target agent.
Output materialization writes draft/proposed Studio records only; in the
Director UI these are shown as "record candidates." It is not
approval, task creation, canonization, or implementation. Materialization
review can write Decision records only; it does not execute the accepted
records. Review packet export writes a Human Director-readable `_Temp` HTML
view only. Studio Director Console exposes review packet export as "Make
report" directly from Staff Runs so the Director can read staff output before
materialization or decision recording. Raw run JSON and staff run evidence are
internal/debug links in the UI. Studio Director Console serves a local browser
UI and can call only allowlisted Studio actions. It can materialize staff
output into governed draft records, record Director decisions about those
drafts, and create
Backlog tasks from reviewed WorkOrders only through explicit button clicks. It
also displays Proposal, Decision, and Memory/Canon records so the Director can
separate ideas, decisions, and canon status. It displays MeetingSessions and
can inspect, handoff-check, explicitly store meeting records, and append
meeting turns while keeping meeting consensus separate from approval and canon.
It can create manual Studio records for MeetingSession, WorkOrder, Proposal,
Decision, and MemoryRecord through schema-backed local stores. These records
are governed records only: creating them does not approve implementation, write
canon by itself, start PC Runner, modify game files, commit, or push. It also
displays active Project Profiles and Tool Adapter policy summaries so the Director can see the
project target and available execution equipment before approving downstream
work. It exposes Department and StaffAgent directory panels so the Director can
see who owns a responsibility before starting a meeting, handoff, or WorkOrder.
The Systems page is internal/admin by default. It can also plan and store governed ToolRunRequest records. A
ToolRunRequest says which adapter is requested, why it is needed, what
permission class it needs, and what evidence must be collected. It is not tool
execution, does not call external systems, and does not grant approval by
itself.
Meeting Room lifecycle buttons may create, start, or finalize MeetingSession
records only through explicit UI actions; meeting lifecycle state is not
approval, canon, task execution, or git finalization.
Meeting Room can also create a focused follow-up WorkOrder or record a
Decision from a meeting result. These actions keep meeting consensus separate
from execution authority: a follow-up WorkOrder must still pass WorkOrder/task
gates, and a Decision must still be converted into Memory/canon Memory through
the Knowledge page when appropriate. Knowledge page actions support Proposal
to Decision and Decision to Memory/canon Memory transitions. Proposal approval
is not implementation approval, and Decision storage is not canon until a
MemoryRecord with `status=canon` is explicitly written with the Decision as
evidence.
Meeting Room can request an AI staff meeting contribution through explicit
plan/run buttons. The plan button builds a temporary WorkOrder and
StaffContextPacket preview. The run button calls signed-in Codex as the
selected meeting participant and, for stored MeetingSessions only, appends a
new synthesis turn. This is a meeting note, not a Director decision, not canon,
not a task, and not a source or git change.
It exposes Conditional Automation status, validation, dry-run test, `_Temp`
evaluation write, replay, and repair-plan actions as policy evidence only. Its
handoff execution path still routes through the existing read-only staff
pipeline. These policy tools do not set ActiveTask, approve task execution,
start PC Runner, modify source files, commit, or push. Conditional automation
test-write writes only `_Temp` evaluation artifacts when `--execute` is passed.
The Home page also reads the AIWorkflow Core state directly from ActiveTask,
Backlog, PC Runner runtime artifacts, verification/completion reports, and Git
status. This makes Studio Console the default workbench even when Discord is
not used as the normal UI. The Core state display is read-oriented by default:
it explains the current task, latest runner gate, evidence links, and Git state
before asking the Director to act. Explicit Home, Director Inbox, and Diff
Review buttons may then perform bounded workflow actions:

- create an intake task from a Studio request
- approve and start the selected task through PC Runner
- record completion finalization decisions
- commit or commit+push only the files selected in Studio Git Gate

These actions still use the existing workflow services. They do not bypass
approval policy, runner gates, evidence records, completion review, or git
selection. Selected-file commit refuses `_Temp`, `_Local`, `node_modules`,
`.env`, `*.local.json`, and unrelated already-staged files.

## Directory Map

```text
_Docs/AIWorkflow/Studio/
+-- README.md
+-- WorkOrder_Task_Bridge.md
+-- Studio_Runtime_Contracts.md
+-- Staff_Context_And_Output_Contract.md
+-- Canon_Decision_Flow.md
+-- MemoryRecords/
|   +-- README.md
+-- WorkOrders/
|   +-- README.md
+-- TaskBindings/
|   +-- README.md
+-- Proposals/
|   +-- README.md
+-- Decisions/
|   +-- README.md
+-- MeetingSessions/
|   +-- README.md
+-- ContextPackets/
|   +-- README.md
+-- RoleRuns/
|   +-- README.md
+-- Handoffs/
|   +-- README.md
+-- Materializations/
|   +-- README.md
+-- Examples/
|   +-- scenario_director_context_packet.example.json
|   +-- scenario_director_role_run_output.example.json
|   +-- creative_meeting_session.example.json
|   +-- scenario_pitch_work_order.example.json
|   +-- scenario_pitch_task_binding.example.json
|   +-- protagonist_motivation_proposal.example.json
|   +-- protagonist_motivation_decision.example.json
|   +-- protagonist_motivation_canon_memory.example.json
|   +-- protagonist_motivation_rejected_memory.example.json
|   +-- conditional_automation_cases.example.json
|   +-- tool_run_request_codex_staff.example.json
+-- Schemas/
|   +-- StaffAgent.schema.json
|   +-- Department.schema.json
|   +-- WorkOrder.schema.json
|   +-- WorkOrderTaskBinding.schema.json
|   +-- StaffContextPacket.schema.json
|   +-- RoleRunOutput.schema.json
|   +-- MeetingSession.schema.json
|   +-- MemoryRecord.schema.json
|   +-- Proposal.schema.json
|   +-- Decision.schema.json
|   +-- Handoff.schema.json
|   +-- RoleRun.schema.json
|   +-- RoleRunOutputMaterialization.schema.json
|   +-- ToolRun.schema.json
|   +-- ToolRunRequest.schema.json
|   +-- ToolAdapter.schema.json
|   +-- ConditionalAutomationCase.schema.json
+-- Registries/
|   +-- departments.initial.json
|   +-- staff_agents.initial.json
|   +-- tool_adapters.initial.json
+-- ToolRuns/
|   +-- README.md
+-- Policies/
    +-- Memory_Status_Policy.md
    +-- Conditional_Automation_Policy.md
```

## Core Invariants

These rules are mandatory for all future implementations:

1. StaffAgent is not a prompt.
2. Proposal is not a decision.
3. Decision is not canon unless canon policy says so.
4. Meeting consensus is not Human Director approval.
5. Memory status must distinguish draft, proposed, approved, canon, rejected,
   deprecated, and superseded.
6. ToolRun may produce evidence / 검증 자료 but cannot approve itself.
7. RoleRun may call tools only through declared tool policy.
8. WorkOrder sits above Task and may create one or more AIWorkflow tasks.
9. Evidence collection / 검증 자료 수집 is not verification.
10. Completion is not commit.
11. Durable memory writes must preserve memory status, source refs, and canon
    decision boundaries.
12. Meeting consensus is not approval; MeetingSession handoff must keep
    unresolved questions and follow-up WorkOrders visible.
13. Staff RoleRuns are governed runtime envelopes. Staff output may request
    approval or handoff, but it must not directly approve, write canon, create
    tasks, change source files, commit, or push.
14. StaffContextPacket is the sealed input to a staff runtime. It must be built
    from registry, source work, memory, tool policy, and safety rules instead
    of loose role prompts.
15. Staff execution prompts must be generated from StaffContextPacket and must
    require RoleRunOutput JSON. Prompt export is not LLM execution.
16. Studio UI surfaces must display governance boundaries. A dashboard may
    summarize state, but it must not silently perform approvals or execution.
17. ToolAdapter registry entries must state file impact, external calls, cost
    possibility, approval requirements, and evidence / 검증 자료 outputs before use.
18. ToolRunRequest is the pre-execution governance record. It may evaluate
    adapter policy, approval needs, cost risk, and evidence / 검증 자료 needs, but it must
    not execute the adapter.
19. Proposal/Decision stores must keep ideas, approvals, rejections, and canon
    handoffs separate. A Proposal is not approval, and a Decision does not
    write canon memory by itself.
20. Conditional automation decisions must be deterministic, replayable, and
    auditable. A staff agent, LLM, or tool adapter may propose automation
    eligibility, but the policy test/replay result is the authority.
21. RoleRunOutput materialization may create draft/proposed Studio records,
    but it must not treat staff output as approval. Canon, executable tasks,
    implementation, and commits still require their normal governance gates.
22. Materialization review may record Human Director decisions about drafts,
    but it must not execute accepted drafts. Acceptance records are evidence
    for downstream governance, not direct permission to bypass the Core gates.
23. Staff executor may call Codex CLI only through signed-in App/CLI execution,
    not OpenAI API billing by default. Its default sandbox must be read-only,
    and any produced output is evidence / 검증 자료 until routed through the normal
    Proposal, Decision, Memory, WorkOrder, and Task gates.
24. Handoff router may convert a governed Handoff into a target-agent
    StaffContextPacket, but it must not execute the target agent, approve the
    handoff, write canon, create tasks, modify source files, commit, or push.
25. Review packet export may render staff output for Human Director review,
    but it must not change the output, approve it, materialize it, or execute
    any downstream action.
26. Staff pipeline may connect handoff router, signed-in Codex staff executor,
    and review packet export for read-only staff runs, but it must not approve
    work, create Backlog tasks, write canon, modify source files, commit, or
    push.
27. Studio Director Console may make the Studio workflow interactive, but it
    must remain local-only and route button actions through allowlisted tools.
    It may record governed draft decisions and create Backlog tasks from
    reviewed WorkOrders, but it must not become a task-execution approval,
    canon, source-edit, runner-start, commit, or push authority.

## Relationship To Existing AIWorkflow Core

The existing AIWorkflow Core owns:

- Task
- Approval
- Runner
- Evidence / 검증 자료
- Verification
- Completion
- Finalization
- Git gate

The Studio layer adds:

- StaffAgent
- Department
- MeetingSession
- WorkOrder
- WorkOrderTaskBinding
- Memory
- Proposal
- Decision
- Handoff
- RoleRun
- ToolRun

Future implementation should connect WorkOrder to the existing Task lifecycle
instead of replacing it.

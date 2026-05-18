# AIWorkflow Studio Domain Model

## Purpose

This folder contains the first durable implementation slice for the
Personal AI Development Studio / AI Studio Company Runtime architecture.

The goal of this slice is not to execute autonomous staff agents yet.

The goal is to define the stable domain model that future staff agents,
meetings, work orders, memory, decisions, handoffs, tool runs, and evidence
will use.

## Scope

This slice defines:

- StaffAgent schema
- Department schema
- WorkOrder schema
- MeetingSession schema
- MemoryRecord schema
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
- ConditionalAutomationCase schema
- Memory status policy
- Conditional automation policy
- Initial read-only department and staff registries
- WorkOrder to Task bridge rules
- Runtime contracts for staff agents, meetings, memory, tools, and evidence
- Staff context and structured output contract
- Scenario Director context/output examples
- Creative MeetingSession to WorkOrder to TaskBinding examples
- Canon decision flow and proposal/decision/memory examples
- Local WorkOrder store and read/list/store tool
- Local Proposal/Decision store, validation, and canon handoff planner
- Local MemoryRecord store, validation, canon view, and retrieval query tool
- Local MeetingSession runtime validation and handoff tool
- Local StaffContextPacket builder from StaffAgent and WorkOrder records
- Local Staff execution prompt exporter for Codex signed-in route
- Local Staff RoleRun planning and RoleRunOutput inspection tool
- Local RoleRunOutput materializer for Proposal, Memory, WorkOrder, and
  Handoff drafts
- Local materialization review tool for Human Director Decision records
- Read-only Studio dashboard HTML snapshot export with Director Inbox
- ToolAdapter schema and read-only tool adapter registry
- ToolRunRequest store and deterministic adapter-governance planner
- Conditional automation case suite, deterministic policy test, replay, and
  repair-plan tool

## Current Execution Status

Current status:

```text
domain model foundation + guarded local runtime stores/builders/exporters
```

This folder does not:

- execute live staff agents
- call LLMs
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
tools\aiworkflow\studio_staff_runtime.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_runtime.bat create _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json --execute
tools\aiworkflow\studio_staff_runtime.bat inspect-output _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_staff_runtime.bat route-output _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat materialize _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json --execute
tools\aiworkflow\studio_materialization_review.bat plan MAT-20260518-150000-scenario --decision approve --target all
tools\aiworkflow\studio_dashboard_export.bat
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
still does not call a model. Output materialization writes draft/proposed
Studio records only; it is not approval, task creation, canonization, or
implementation. Materialization review can write Decision records only; it
does not execute the accepted records. These tools do not execute live staff
agents, call LLMs, set ActiveTask, start PC Runner, modify source files,
commit, or push. Conditional automation replay writes only `_Temp` evaluation
artifacts when `--execute` is passed.

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
6. ToolRun may produce evidence but cannot approve itself.
7. RoleRun may call tools only through declared tool policy.
8. WorkOrder sits above Task and may create one or more AIWorkflow tasks.
9. Evidence collection is not verification.
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
    possibility, approval requirements, and evidence outputs before use.
18. ToolRunRequest is the pre-execution governance record. It may evaluate
    adapter policy, approval needs, cost risk, and evidence needs, but it must
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

## Relationship To Existing AIWorkflow Core

The existing AIWorkflow Core owns:

- Task
- Approval
- Runner
- Evidence
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

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
- WorkOrderTaskBinding schema
- StaffContextPacket schema
- RoleRunOutput schema
- Memory status policy
- Initial read-only department and staff registries
- WorkOrder to Task bridge rules
- Runtime contracts for staff agents, meetings, memory, tools, and evidence
- Staff context and structured output contract
- Scenario Director context/output examples
- Creative MeetingSession to WorkOrder to TaskBinding examples
- Canon decision flow and proposal/decision/memory examples
- Local MemoryRecord store and validation tool

## Current Execution Status

Current status:

```text
domain model foundation + guarded WorkOrder/Memory local tools
```

This folder does not:

- execute agents
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
tools\aiworkflow\studio_workorder_planner.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_workorder_planner.bat create _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
tools\aiworkflow\studio_memory_store.bat status
tools\aiworkflow\studio_memory_store.bat validate
tools\aiworkflow\studio_memory_store.bat list
tools\aiworkflow\studio_memory_store.bat read MEM-20260518-154000-motivation
tools\aiworkflow\studio_memory_store.bat create _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_canon_memory.example.json --execute
```

These tools validate registry references, print department/staff details, and
preview or create WorkOrder-derived Backlog tasks and governed MemoryRecord
files. They do not execute agents, call LLMs, set ActiveTask, approve work,
start PC Runner, modify source files, commit, or push.

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
|   +-- ToolRun.schema.json
+-- Registries/
|   +-- departments.initial.json
|   +-- staff_agents.initial.json
+-- Policies/
    +-- Memory_Status_Policy.md
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

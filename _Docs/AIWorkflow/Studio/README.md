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
- Memory status policy
- Initial read-only department and staff registries
- WorkOrder to Task bridge rules

## Current Execution Status

Current status:

```text
read-only model foundation
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
```

It validates registry references and prints department/staff details. It does
not execute agents, call LLMs, change task state, approve work, modify files,
commit, or push.

## Directory Map

```text
_Docs/AIWorkflow/Studio/
+-- README.md
+-- WorkOrder_Task_Bridge.md
+-- Schemas/
|   +-- StaffAgent.schema.json
|   +-- Department.schema.json
|   +-- WorkOrder.schema.json
|   +-- WorkOrderTaskBinding.schema.json
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

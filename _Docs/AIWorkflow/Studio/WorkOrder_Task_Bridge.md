# WorkOrder To Task Bridge

## Purpose

This document defines how the Personal AI Development Studio layer hands work
to the existing AIWorkflow task/runner core.

The Studio layer may create proposals, decisions, meetings, and WorkOrders.

The existing AIWorkflow Core remains responsible for:

- Backlog task lifecycle
- ActiveTask selection
- approval records
- PC Runner execution
- evidence collection
- verification
- completion review
- finalization
- git gate

The bridge exists so WorkOrders do not bypass the existing governance system.

## Core Rule

WorkOrder is not a Task.

A WorkOrder is a director-level unit of intent and coordination.

A Task is an executable workflow item that can be approved, run, verified,
completed, and committed through AIWorkflow Core.

```text
Director goal
  -> MeetingSession / Proposal / Decision
  -> WorkOrder
  -> WorkOrderTaskBinding
  -> Backlog Task
  -> ActiveTask
  -> Runner / Evidence / Verification / Completion / Finalization
```

## Invariants

1. A WorkOrder may create zero, one, or many Tasks.
2. A Task may be linked to exactly one primary WorkOrder and may reference
   related WorkOrders if needed.
3. WorkOrder approval does not equal Task approval.
4. Task approval does not equal completion approval.
5. Completion approval does not equal commit approval.
6. Meeting consensus cannot create an approved Task without Human Director or
   deterministic policy approval.
7. Staff agents may propose WorkOrders, but they may not silently create
   implementation Tasks outside policy.
8. WorkOrderTaskBinding is the durable trace between Studio intent and
   AIWorkflow execution.

## WorkOrder Lifecycle

Use these lifecycle states for Studio WorkOrders:

```text
draft
proposed
director_review
approved_for_tasking
tasking
tasks_open
completion_review
completed
blocked
rejected
superseded
```

### State Meaning

```text
draft
  Staff or system is still shaping the work. Not ready for director review.

proposed
  WorkOrder is structured and can be reviewed.

director_review
  Human Director must approve, reject, narrow, or request changes.

approved_for_tasking
  WorkOrder is approved to be decomposed into one or more AIWorkflow tasks.

tasking
  Backlog task creation is in progress.

tasks_open
  One or more linked tasks exist and are not all complete.

completion_review
  Linked task work appears complete and needs director/reviewer decision.

completed
  Linked task completion/finalization evidence is sufficient.

blocked
  Work cannot progress without missing info, failed policy, or failed evidence.

rejected
  Human Director or policy rejected this work.

superseded
  A newer WorkOrder replaces this one.
```

## WorkOrderTaskBinding

Each generated or linked Task must have a WorkOrderTaskBinding record.

The binding records:

- which WorkOrder created or owns the Task
- which Task was created
- why the Task exists
- which scope is authorized
- which non-goals must stay out
- which approvals allowed the Task to proceed
- which runner/evidence/completion/finalization artifacts closed the loop

The binding schema is:

```text
_Docs/AIWorkflow/Studio/Schemas/WorkOrderTaskBinding.schema.json
```

## Approval Boundaries

WorkOrder approval may authorize planning or task creation.

It must not silently authorize:

- source code changes
- game data changes
- JSON schema changes
- canon changes
- generated asset import
- external tool usage
- completion approval
- commit, push, release, or deployment

Those permissions must still pass the existing AIWorkflow approval gates or a
future deterministic auto-approval policy.

## Task Creation Rules

When a WorkOrder creates a Task, the Task must include:

- source WorkOrder id
- plain-language objective
- concrete authorized scope
- concrete non-goals
- expected outputs
- required validation
- approval reason
- staff roles involved
- evidence requirements

The Task must not say only:

```text
execute within approved scope
```

It must say what is expected to change and what is explicitly not expected to
change.

## Read-Only Planner

The first local bridge support tool is:

```bat
tools\aiworkflow\studio_workorder_planner.bat plan <work_order_json_path>
tools\aiworkflow\studio_workorder_planner.bat plan <work_order_json_path> --json
tools\aiworkflow\studio_workorder_planner.bat create <work_order_json_path>
tools\aiworkflow\studio_workorder_planner.bat create <work_order_json_path> --execute
```

It converts a WorkOrder into a TaskDraft and Backlog row preview.

`create` without `--execute` is still a dry-run.

`create --execute` appends one row to `Backlog.md`.

It does not:

- set ActiveTask
- approve work
- start PC Runner
- modify source files
- commit or push

The planner/create split exists to show what would be created before the
workflow writes task state. Creating the Backlog task is not approval to execute
the task.

## Example

```text
WorkOrder:
  WO-20260518-143000-skill-json-integrity
  Objective: verify and fix Skill.json integrity.

Binding:
  primary_task -> GAME-001
  authorized_scope:
    - inspect Skill.json, PlayableCharacter.json, AttributeNode.json
    - run JSON smoke validation
    - run runtime loader validation if available
  non_goals:
    - no JSON schema change
    - no unrelated gameplay tuning
    - no asset import

Task:
  GAME-001 in Backlog/ActiveTask.

Runner/Evidence:
  runner-run-game-001-...
  verification-game-001-...
  completion-game-001-...
  finalization-...
```

## Future Automation Target

The final automation target is:

```text
Director goal
  -> staff meeting
  -> WorkOrder proposal
  -> director/policy approval
  -> deterministic Task creation
  -> PC Runner execution
  -> evidence/verification/completion
  -> director/policy finalization
  -> git gate
```

The bridge must remain provider-independent. LLMs may draft WorkOrders and
suggest Task decomposition, but deterministic validation and approval policy
decide whether records can be written or executed.

# Role Worker Intake Contract

## Purpose

This document defines how a role chat or future role-worker automation should consume Handoff Queues before doing any work.

It is Phase 10A of the AIWorkflow Handoff Integration.

## Role Worker Definition

A Role Worker is one of:

- a role chat acting as Planner, Developer, Artist, Reviewer, or QA
- a future automation acting within one of those role boundaries

A Role Worker is not automatically trusted because of its chat label.

It must follow observable file-based intake rules.

## Required Intake Order

Before acting, a Role Worker must inspect:

1. `_Docs/Handoff/Dashboard.md`
2. `_Docs/Handoff/Queues/<Role>.md`
3. the target Packet `manifest.yaml`
4. the relevant role request document
5. the relevant role routine under `_Docs/Handoff/Role_Routines/`

The Role Worker should not ask the human developer to re-explain where work lives before checking its Queue.

## Queue State Rules

### Waiting User Approval

The Role Worker must not execute the work.

It may summarize the waiting approval request and ask for a human decision.

### Ready Work

The Role Worker may inspect the Packet and write an intake decision or plan.

`Ready` does not authorize source edits, JSON edits, runtime changes, build/test execution, approval evidence, `Done`, commit, or push.

### In Progress

The Role Worker may continue only if:

- it is the current owner, claimed role, or explicitly instructed by the human developer
- the work is still inside the approved scope
- required approvals are already recorded or not required

### Review Requested

Only Reviewer-like work should proceed from this section.

The Role Worker must read `ReviewRequest.md` and the relevant Results documents before giving a review result.

### QA Requested

Only QA-like work should proceed from this section.

The Role Worker must read `QARequest.md`, Results documents, and validation notes before giving a QA result.

### Blocked

The Role Worker must not bypass the block.

It may summarize the blocker and propose the next human or role decision.

## Intake Decision Required

Before doing work, the Role Worker must produce an Intake Decision.

The Intake Decision may be written in chat or, when durable tracking is needed, as:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
```

The Intake Decision must include:

- role
- Handoff ID
- Queue section
- Packet status
- documents read
- whether this role is a valid target
- whether approval is required
- allowed next action
- forbidden actions
- stop condition, if any

## Stop Conditions

The Role Worker must stop when:

- the Packet is not visible in its Queue and no explicit human instruction targets it
- the manifest is missing or structurally invalid
- the role is not a target, owner, or requested reviewer/QA role
- `WaitingUserApproval` is present without human approval
- code, JSON, runtime, asset, build, approval, `Done`, commit, or push work would be required without explicit approval
- `Violations/Open.md` contains a Critical or Major issue for the Packet
- the requested work conflicts with `AGENTS.md` or `_Docs/AIWorkflow/`

## Automation Boundary

Phase 10A does not create role-worker automation.

It only defines the observable intake contract.

Future role-worker automation may use this contract, but must receive separate approval before claiming, editing, executing, or marking work complete.

## Completion Standard

Phase 10A is complete when:

- the Role Worker definition is documented
- Queue state rules are documented
- Intake Decision requirements are documented
- stop conditions are documented
- role-worker automation remains explicitly out of scope

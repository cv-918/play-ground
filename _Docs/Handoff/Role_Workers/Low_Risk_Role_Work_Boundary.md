# Low-Risk Role Work Boundary

## Purpose

This document defines which role-worker activities may be considered low-risk candidates for future automation.

It is Phase 11A of the AIWorkflow Handoff Integration.

## Important Boundary

This document does not approve role-worker automation.

It only defines candidate categories that may be automated later after separate human approval.

Until that separate approval exists, role workers must continue to follow the normal Handoff intake, approval, and stop rules.

## Low-Risk Definition

A role-worker activity is low-risk only when it:

- stays inside `_Docs/Handoff/` or `_DevLog/WorkLog/`
- does not change game source
- does not change gameplay JSON
- does not change assets
- does not change build settings
- does not change runtime behavior
- does not set approval evidence
- does not claim a Packet
- does not mark work `Done`
- does not commit or push
- does not wake or control another role chat
- produces reviewable text output
- can be reversed by editing or deleting a document

If any condition is false, the work is not low-risk.

## Low-Risk Candidate Categories

### Read-Only Reporting

Allowed candidate:

- summarize Dashboard state
- summarize role Queue state
- summarize Waiting User Approval items
- summarize Consistency Issues
- summarize active or blocked Packets

No file edits are required.

### Intake Decision Drafting

Allowed candidate:

- write an Intake Decision draft
- identify the relevant Queue section
- list documents read
- list required approvals
- list forbidden actions
- recommend stop or proceed-to-planning

Allowed path candidate:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
```

This does not claim the Packet or authorize execution.

### Harness Reporting

Allowed candidate:

- write Contract Check run reports
- write Blind Scenario run reports
- write Intake Decision review reports

Allowed path candidate:

```text
_Docs/Handoff/Role_Workers/Harness/Runs/
```

This records readiness evidence only.

### Planning Drafts

Allowed candidate:

- draft a Developer plan
- draft an Artist request plan
- draft a Reviewer checklist
- draft a QA checklist
- draft a Planner handoff outline

These drafts must not change Packet status, approval evidence, source, JSON, assets, or runtime behavior.

### Clarification Requests

Allowed candidate:

- write a clarification request when Packet context is missing
- summarize blocker conditions
- propose questions for the human developer

This must not move a Packet to `Blocked` unless status updates are separately approved.

## Not Low-Risk

The following are not low-risk:

- source code edits
- gameplay JSON edits
- JSON schema changes
- save/load behavior changes
- runtime behavior changes
- actor or scene lifecycle changes
- asset creation or replacement
- build/test execution
- approval evidence changes
- Packet claim changes
- `delivery_status` or `execution_status` changes
- `Done` or `Archived` marking
- generated status surface edits outside the Supervisor
- `00_Index.md` operational status rewrites
- commit
- push
- role-chat wakeup or control

## Role-Specific Examples

### Planner

Low-risk candidate:

- draft a PlanningBrief
- draft a Handoff Packet outline
- draft role request text

Not low-risk:

- publish a Packet as `Ready` without approval
- change manifest status automatically
- approve implementation scope

### Developer

Low-risk candidate:

- draft an implementation plan
- draft an Intake Decision
- identify likely files to inspect

Not low-risk:

- edit source code
- edit gameplay JSON
- run build/test as completion evidence
- mark implementation complete

### Artist

Low-risk candidate:

- draft an art request response
- list resource requirements
- identify missing references

Not low-risk:

- create, replace, or commit asset files
- change resource paths
- mark art delivery complete

### Reviewer

Low-risk candidate:

- draft a review checklist
- summarize files needing review
- classify review questions

Not low-risk:

- mark review passed after unverified source changes
- change Packet routing
- approve risky implementation

### QA

Low-risk candidate:

- draft a QA checklist
- summarize required manual test evidence
- record user-provided QA evidence when explicitly instructed

Not low-risk:

- claim validation passed without evidence
- run build/test as an automated completion gate
- mark Packet `Done`

## Required Output For Low-Risk Automation Candidates

Any future low-risk role-worker automation must report:

- role
- Handoff ID
- Queue section
- work category
- files read
- files written, if any
- approval state
- stop condition, if any
- confirmation that no forbidden actions were performed

## Escalation Rule

If a low-risk candidate discovers that risky work is required, it must stop and write an approval request or blocker summary.

It must not continue by expanding its own scope.

## Completion Standard

Phase 11A is complete when:

- low-risk candidate categories are documented
- not-low-risk actions are documented
- role-specific examples are documented
- required output for future low-risk automation is documented
- no role-worker automation is created

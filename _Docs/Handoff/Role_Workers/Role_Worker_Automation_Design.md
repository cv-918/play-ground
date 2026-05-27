# Role Worker Automation Design

## Purpose

This document defines the Phase 12A design for future Role Worker automation in the AI Role Handoff System.

It does not create or approve a recurring automation.

It defines the safe v1 boundary that Phase 12B may use if the human developer separately approves automation creation.

## Design Decision

Use one low-risk Role Worker automation first.

Recommended automation name:

```text
playground-handoff-role-worker-low-risk
```

Do not create separate recurring automations for Planner, Developer, Artist, Reviewer, and QA in v1.

The first role-worker automation should scan all role Queues, then produce document-only reports for safe candidates. This keeps thread count lower, avoids five independent workers racing over the same Packet, and makes the automation easier to disable or audit.

## Relationship To Existing Systems

```text
Handoff Supervisor
  -> reads Packets
  -> regenerates Dashboard, Queues, and Violations
  -> does not perform role work

Low-Risk Role Worker Automation
  -> reads Dashboard and Queues
  -> reads target Packets
  -> writes intake/report drafts for low-risk candidates only
  -> does not change Packet state

Human Developer
  -> approves automation creation
  -> approves risky work
  -> decides when v1 is complete
```

The Role Worker automation must not replace the Supervisor.

The Supervisor remains the source for generated status surfaces. The Role Worker automation consumes those surfaces.

## Initial Automation Mode

The first automation mode is:

```text
document-only low-risk reporting
```

Allowed candidate work:

- summarize role Queue state
- write intake decision drafts
- write low-risk work reports
- write clarification or blocker summaries
- write planning drafts that do not change status or approval evidence
- write run reports under the Role Worker automation area

Forbidden work:

- game source edits
- gameplay JSON edits
- JSON schema edits
- save/load changes
- runtime behavior changes
- actor or scene lifecycle changes
- asset creation or replacement
- build or test execution
- approval evidence changes
- Packet claim changes
- `delivery_status` or `execution_status` changes
- `Done` or `Archived` marking
- generated Dashboard, Queue, or Violation edits
- `00_Index.md` operational status rewrites
- commit
- push
- waking or controlling another role chat

## Inputs

The automation may read:

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Packets/**/manifest.yaml`
- Packet request documents such as `ImplementationRequest.md`, `ReviewRequest.md`, and `QARequest.md`
- Packet result documents needed to understand the handoff
- `_Docs/Handoff/Role_Workers/Role_Worker_Intake_Contract.md`
- `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary.md`
- `_Docs/Handoff/Role_Routines/*.md`

It must not read game source, gameplay JSON, asset files, local config, secrets, build output, or `_Temp/` as part of v1 low-risk automation.

## Outputs

Allowed output paths:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
_Docs/Handoff/Packets/<handoff-id>/Results/
```

Preferred run report path:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_LowRiskRoleWorker.md
```

Preferred Packet result paths:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>LowRiskWorkReport.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>ClarificationRequest.md
```

The automation must not overwrite an existing human-authored result document.

If a target output already exists, the automation should record `AlreadyPresent` in the run report and skip that output.

## Candidate Selection

The automation may consider a Packet only when all conditions are true:

- the Packet appears in a role Queue
- the Packet has no Critical or Major issue in `Violations/Open.md`
- the requested action is listed as a low-risk candidate in `Low_Risk_Role_Work_Boundary.md`
- the work can be completed by writing reviewable text only
- no source, JSON, runtime, asset, build, approval, claim, Done, commit, push, or role-chat control action is required

The automation must ignore or report-but-not-act on:

- `WaitingUserApproval` Packets
- Packets with missing manifests
- Packets with unknown roles
- Packets requiring source or data inspection outside `_Docs/Handoff`
- Packets requiring fresh build, runtime, or QA execution
- Packets whose only next action is human approval

## Stop Rules

The automation must stop on a Packet when:

- the risk level cannot be classified as low-risk document-only work
- approval is required or requested
- the Packet asks for status changes
- the Packet asks for approval evidence changes
- the Packet asks for implementation, validation, commit, or push
- the output path would overwrite an existing document
- generated Supervisor surfaces appear stale or inconsistent

Stopping means:

- write a run report entry
- optionally write a blocker or clarification summary
- do not execute the risky action
- do not mark the Packet done

## Idempotency Rules

Recurring automation must be safe to run repeatedly.

Therefore:

- Do not overwrite existing result documents.
- Do not append to existing human-authored Packet results.
- Do not change manifest state to avoid reprocessing.
- Use run reports to record skipped, already-present, or blocked candidates.
- Prefer one Packet result per role and one timestamped run report per automation run.

## Recommended Phase 12B Creation Scope

If approved later, Phase 12B should create one recurring automation with this scope:

- cadence: 60 minutes, unless the human developer chooses otherwise
- status: ACTIVE only if explicitly approved
- model: default Codex automation model unless the user chooses another
- allowed writes: Role Worker automation run reports and low-risk Packet result drafts only
- forbidden writes: source, JSON, assets, generated Supervisor surfaces, manifest status, approval evidence, Done, Git

The automation prompt should be self-contained and should explicitly include the forbidden action list.

## Human Approval Needed For Phase 12B

Before creating the actual automation, the human developer must decide:

- whether to create the single low-risk Role Worker automation
- cadence
- ACTIVE or PAUSED
- whether Packet `Results/` drafts are allowed, or run reports only

## Completion Standard

Phase 12A is complete when:

- the single-automation v1 design is documented
- allowed inputs and outputs are documented
- stop rules are documented
- idempotency rules are documented
- Phase 12B approval questions are documented
- no recurring Role Worker automation is created

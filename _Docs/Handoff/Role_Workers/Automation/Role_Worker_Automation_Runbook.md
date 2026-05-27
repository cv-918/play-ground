# Role Worker Automation Runbook

## Purpose

This document records the Phase 12B recurring automation created for low-risk Role Worker support.

It is an operational runbook, not permission to expand automation scope.

## Automation

- automation id: `playground-handoff-role-worker-low-risk`
- status: PAUSED
- cadence: 60-minute interval, aligned with the Handoff Supervisor cadence
- execution environment: local workspace
- workspace: `C:\Users\kalux\workStation\play-ground`

## Mode

```text
document-only low-risk reporting and safe Packet Results drafting
```

The automation is a shared office-assistant style worker. It is not a Developer, QA, Planner, Artist, or Reviewer replacement.

It reads Supervisor-generated work surfaces, writes its own run report, and may write safe Packet Results drafts when the work is document-only low-risk.

## Allowed Reads

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Role_Worker_Automation_Design.md`
- `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary.md`
- `_Docs/Handoff/Role_Workers/Role_Worker_Intake_Contract.md`
- `_Docs/Handoff/Role_Routines/*.md`
- relevant Packet manifests, request documents, and result documents under `_Docs/Handoff/Packets/`

## Allowed Writes

Timestamped run reports under:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
```

Use:

```text
_Docs/Handoff/Role_Workers/Automation/_Run_Report_Template.md
```

New Packet Results draft documents under:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/
```

Allowed draft names:

```text
<Role>IntakeDecision.md
<Role>LowRiskWorkReport.md
<Role>ClarificationRequest.md
<Role>BlockerSummary.md
```

The automation must not overwrite existing result documents.

## Forbidden Actions

The automation must not:

- edit game source
- edit gameplay JSON
- edit or create assets
- run builds or tests
- change runtime behavior
- edit build settings
- edit generated Supervisor surfaces
- edit `00_Index.md`
- edit Packet manifests
- change Packet status
- set approval evidence
- claim Packets
- mark work `Done` or `Archived`
- commit
- push
- wake or control role chats
- read `_Temp/`, `_Local/`, `.env`, `node_modules/`, local config, secrets, game source, gameplay JSON, assets, or build output

## Run Behavior

When activated later, each run should:

1. Read the allowed Handoff surfaces.
2. Scan all role Queues.
3. Identify low-risk document-only candidates.
4. Skip `WaitingUserApproval`, blocked, risky, or unclear candidates.
5. Write one timestamped run report.
6. Write safe Packet Results drafts only when the target output does not already exist.
7. Stop without editing operational status.

## Activation Rule

The automation remains PAUSED after Bundle 2.

Do not activate it until the human developer explicitly asks for first-run validation under the updated Results-draft boundary.

## First Run Validation

Phase 12C first-run validation was performed on 2026-05-27.

Observed run report:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/2026-05-27_173316_LowRiskRoleWorker.md
```

Observed result:

- Run time: 2026-05-27 17:33:16 +09:00
- Roles scanned: Planner, Developer, Artist, Reviewer, QA
- Candidates considered: none
- Files written: the timestamped run report only
- Packet Results drafts: not written
- Packet manifests: not edited
- Approval evidence: not changed
- Packet claim/status/Done/Archived: not changed
- Source, JSON, assets, build/test, commit, push: not touched

After the first run was validated, the automation was returned to `PAUSED`.

## Phase 23-28 Bundle 2 Update

On 2026-05-27, Bundle 2 updated the automation boundary:

- status remains `PAUSED`
- cadence remains 60 minutes
- single shared Role Worker automation is retained
- safe Packet Results draft writing is allowed
- game source, JSON, runtime, assets, build/test, manifests, status, approval evidence, Done/Archived, commit, push, and role-chat control remain forbidden

## Phase 12B Completion

Phase 12B is complete when:

- the automation exists
- it is PAUSED
- its cadence matches the Handoff Supervisor cadence
- its prompt forbids Packet Results drafts and risky actions
- this runbook records the creation boundary
- no first run has been claimed as validated

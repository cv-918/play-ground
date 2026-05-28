# Developer Worker Prompt Contract

## Purpose

This document defines Phase 29B of the Handoff v2 automation work.

It records the exact prompt contract and run report format for the future Developer Worker dry-run automation.

It does not create, update, activate, or run a recurring automation.

## Recommended Automation

Recommended name:

```text
playground-handoff-developer-worker-dry-run
```

Recommended initial state:

```text
PAUSED
```

Recommended cadence:

```text
60 minutes, aligned with the Handoff Supervisor cadence
```

Initial mode:

```text
approved-scope dry run
```

## Dry-Run Meaning

Dry-run mode may inspect and plan approved implementation work.

Dry-run mode must not edit implementation files.

Allowed dry-run output is limited to:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_DeveloperWorkerDryRun.md
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md
```

The automation must not overwrite `DeveloperDryRunPlan.md`.

If the file already exists, the run report must record `AlreadyPresent` and skip writing it.

## Candidate Selection

The automation may select a Packet only when all conditions are true:

- `to_roles` includes `Developer`.
- `approved_execution_scope.approved` is `true`.
- `approved_scope_allowed_paths` is not empty.
- `delivery_status` is not `Done` or `Archived`.
- `execution_status` is not `Done` or `Blocked`.
- the Packet has an `ImplementationRequest.md` or equivalent implementation request.
- the Packet has no Critical or Major entry in `Violations/Open.md`.
- changed-file scope drift is absent or already explained in the Packet.
- the likely implementation can stay inside the approved allowed paths.

If multiple candidates exist, choose one candidate only.

Preferred order:

1. Explicitly active Developer Packet.
2. Most recently updated approved-scope Developer Packet.
3. Otherwise, no candidate.

## Allowed Reads

The dry-run automation may read:

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md`
- target Packet `manifest.yaml`
- target Packet `PlanningBrief.md`
- target Packet `ImplementationRequest.md`
- target Packet `Results/*.md`
- source files listed in `approved_scope_allowed_paths`
- nearby source files needed to understand the listed files

Read-only source inspection should use `rg`, `Get-Content`, `git diff --name-only`, and `git status`.

## Allowed Writes

The dry-run automation may write:

- one timestamped run report under `_Docs/Handoff/Role_Workers/Automation/Runs/`
- one new `Results/DeveloperDryRunPlan.md` in the selected Packet

The dry-run automation must not write anything else.

## Forbidden Actions

The dry-run automation must not:

- edit game source
- edit gameplay JSON
- edit non-schema data
- create or edit assets
- run build commands
- run tests
- change runtime behavior
- edit build settings
- edit generated Supervisor surfaces
- edit `_Docs/Handoff/00_Index.md`
- edit Packet manifests
- edit approval evidence
- claim Packets
- change `delivery_status` or `execution_status`
- mark Packet `Done` or `Archived`
- create DevLogs
- commit
- push
- wake or control role chats
- create or modify recurring automations

## Stop Conditions

The dry-run automation must stop without a Packet plan when:

- no approved-scope Developer Packet exists
- the selected Packet has Critical or Major violations
- the selected Packet has no approved execution scope
- the likely implementation needs files outside approved paths
- the work appears to need schema, save/load, lifecycle, build setting, asset, commit, or push changes not already approved
- the working tree has unrelated changes in files that the dry-run would need to inspect as target files
- the automation cannot determine a safe, reviewable plan

When stopping, write only the run report and record the stop reason.

## Exact Automation Prompt

Use this prompt for the future recurring automation after separate user approval:

```text
Run the PlayGround Handoff Developer Worker in approved-scope dry-run mode.

Repository root:
C:\Users\kalux\workStation\play-ground

Automation name:
playground-handoff-developer-worker-dry-run

Mode:
approved-scope dry run

Goal:
Inspect the Handoff Developer queue and prepare at most one implementation dry-run plan for a Developer Packet that already has an approved execution scope.

Read first:
- AGENTS.md
- _Docs/Handoff/Dashboard.md
- _Docs/Handoff/Queues/Developer.md
- _Docs/Handoff/Violations/Open.md
- _Docs/Handoff/Role_Workers/Developer_Worker_MVP.md
- _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md

Candidate rule:
Select at most one Packet where:
- to_roles includes Developer
- approved_execution_scope.approved is true
- approved_scope_allowed_paths is not empty
- delivery_status is not Done or Archived
- execution_status is not Done or Blocked
- the Packet has an ImplementationRequest.md or equivalent implementation request
- Violations/Open.md has no Critical or Major issue for that Packet
- the likely implementation can stay inside approved_scope_allowed_paths

Allowed reads:
- target Packet manifest and request/result documents
- source files listed in approved_scope_allowed_paths
- nearby source files only when needed to understand the approved files
- git status and git diff --name-only for working-tree awareness
- rg and Get-Content for read-only inspection

Allowed writes:
- one timestamped run report under _Docs/Handoff/Role_Workers/Automation/Runs/
- one new _Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md

Do not overwrite DeveloperDryRunPlan.md.
If it already exists, write only the run report and record AlreadyPresent.

Forbidden actions:
- do not edit game source
- do not edit gameplay JSON
- do not edit non-schema data
- do not create or edit assets
- do not run build commands
- do not run tests
- do not change runtime behavior
- do not edit build settings
- do not edit generated Supervisor surfaces
- do not edit _Docs/Handoff/00_Index.md
- do not edit Packet manifests
- do not edit approval evidence
- do not claim Packets
- do not change delivery_status or execution_status
- do not mark Done or Archived
- do not create DevLogs
- do not commit
- do not push
- do not wake or control role chats
- do not create or modify recurring automations

Required run report:
Always write one timestamped run report using the format in _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md.

Required result:
If one safe candidate is selected and DeveloperDryRunPlan.md does not already exist, write DeveloperDryRunPlan.md using the format in _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md.
Otherwise, write no Packet Result and explain why in the run report.
```

## Run Report Format

Each run report must use this structure:

```md
# Developer Worker Dry-Run Report

## Automation

Name: playground-handoff-developer-worker-dry-run
Run At:
Mode: approved-scope dry run

## Files Read

-

## Queue Summary

| Handoff ID | Delivery | Execution | Scope Approved | Decision | Reason |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Selected Packet

Handoff ID:
Title:
Decision: NoCandidate / PlanWritten / AlreadyPresent / Blocked

## Approved Scope Check

- approved_execution_scope:
- allowed paths:
- forbidden paths:
- non-goals:
- validation plan:

## Working Tree Check

- git status checked:
- changed target files:
- unrelated changes observed:
- decision:

## Proposed Implementation Plan

-

## Files Expected To Change In Future Implementation

-

## Out-Of-Scope Or Protected Changes Needed

-

## Files Written

-

## Forbidden Action Check

- [ ] No game source edits.
- [ ] No gameplay JSON edits.
- [ ] No non-schema data edits.
- [ ] No asset edits.
- [ ] No build commands.
- [ ] No tests.
- [ ] No runtime behavior changes.
- [ ] No build setting edits.
- [ ] No generated Supervisor surface edits.
- [ ] No 00_Index.md edits.
- [ ] No Packet manifest edits.
- [ ] No approval evidence edits.
- [ ] No Packet claim.
- [ ] No status changes.
- [ ] No Done or Archived marking.
- [ ] No DevLog creation.
- [ ] No commit.
- [ ] No push.
- [ ] No role-chat wakeup or control.
- [ ] No recurring automation creation or modification.

## Stop Reason

-

## Result

-
```

## DeveloperDryRunPlan Format

If written, `DeveloperDryRunPlan.md` must use this structure:

```md
# Developer Dry-Run Plan

## Handoff

Handoff ID:
Title:

## Scope Status

Approved execution scope:
Allowed paths:
Forbidden paths:
Non-goals:

## Understanding

-

## Proposed Implementation

-

## Expected Files To Change

-

## Expected Validation

-

## Stop Conditions For Implementation Mode

-

## Not Performed In Dry Run

- No source edits.
- No JSON edits.
- No asset edits.
- No build/test execution.
- No status changes.
- No commit or push.
```

## Phase 29B Completion Criteria

Phase 29B is complete when:

- this prompt contract exists
- Korean support summary exists
- `_Docs/Handoff/00_Index.md` links both documents
- WorkLog records that no automation was created
- Handoff Supervisor scan reports no consistency issues
- `git diff --check` passes for Phase 29B files

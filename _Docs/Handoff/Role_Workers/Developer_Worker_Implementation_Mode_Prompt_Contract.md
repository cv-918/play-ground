# Developer Worker Implementation Mode Prompt Contract

## Purpose

This document defines the Phase 31A prompt contract for a future Developer Worker implementation-mode automation.

It records the exact operating prompt, output rules, and stop behavior for a narrow approved-scope implementation pilot.

This document does not create, update, activate, or run a recurring automation.

## Recommended Automation

Recommended name:

```text
playground-handoff-developer-worker-implementation-pilot
```

Recommended initial state:

```text
PAUSED
```

Recommended first use:

```text
Temporarily activate for one approved-scope pilot, then return to PAUSED.
```

Recommended cadence if created as recurring automation:

```text
60 minutes, aligned with the Handoff Supervisor cadence.
Keep PAUSED except during an explicitly approved pilot window.
```

## Mode Meaning

Implementation mode may edit files inside the selected Packet's approved execution scope.

The worker must not ask for extra approval merely because source files are edited.

It must stop only when:

- the work needs a file outside `approved_scope_allowed_paths`
- the work needs a protected behavior not included in the approved scope
- the needed validation is outside the approved validation plan
- target files contain unrelated local changes
- the worker cannot produce a small reviewable diff

## Candidate Selection

The automation may select one Packet only when all conditions are true:

- `to_roles` includes `Developer`.
- `approved_execution_scope.approved` is `true`.
- `approved_scope_allowed_paths` is not empty.
- `delivery_status` is not `Done` or `Archived`.
- `execution_status` is not `Done`, `Blocked`, or `WaitingUserApproval`.
- the Packet has `ImplementationRequest.md` or an equivalent implementation request.
- `_Docs/Handoff/Violations/Open.md` has no Critical or Major issue for the Packet.
- the likely implementation can stay inside `approved_scope_allowed_paths`.
- the approved validation plan is clear or explicitly allows manual validation deferral.

If multiple candidates exist, choose at most one.

Preferred order:

1. Explicitly active Developer Packet.
2. Most recently updated approved-scope Developer Packet.
3. Otherwise, no candidate.

## Working Tree Rule

The automation must run `git status --short` and `git diff --name-only` before editing.

Unrelated local changes outside the selected Packet's target files do not block the worker. They must be recorded in the run report.

Unrelated local changes inside any target file block the worker. In that case, write a run report and `Results/DeveloperScopeChangeRequest.md`, then stop without editing.

## Allowed Reads

The automation may read:

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md`
- target Packet `manifest.yaml`
- target Packet `PlanningBrief.md`
- target Packet `ImplementationRequest.md`
- target Packet `Results/*.md`
- files listed in `approved_scope_allowed_paths`
- nearby source files only when needed to understand an approved file's local context
- `git status --short`
- `git diff --name-only`
- `git diff -- <approved files>`
- `git diff --check -- <approved files>`

## Allowed Writes

The automation may write:

- files listed in `approved_scope_allowed_paths`
- one timestamped run report under `_Docs/Handoff/Role_Workers/Automation/Runs/`
- one new or explicitly superseding `Results/DeveloperResult.md`
- `Results/DeveloperScopeChangeRequest.md` when the worker must stop
- one DevLog under `_DevLog/FixLog/` or `_DevLog/WorkLog/`

## Forbidden Actions

The automation must not:

- edit files outside `approved_scope_allowed_paths`
- edit JSON schema unless explicitly included in the approved scope
- change save/load behavior unless explicitly included in the approved scope
- change scene, actor, or component lifecycle unless explicitly included in the approved scope
- change build settings unless explicitly included in the approved scope
- create, replace, or edit assets unless explicitly included in the approved scope
- perform broad refactors
- edit generated Handoff Supervisor surfaces
- edit `_Docs/Handoff/00_Index.md`
- edit Packet manifests
- edit approval evidence
- claim Packets
- change `delivery_status` or `execution_status`
- mark a Packet `Done` or `Archived`
- create, update, activate, pause, or delete automations
- commit
- push
- wake or control role chats

## Validation Rule

The automation may always run these safety checks:

- `git status --short`
- `git diff --name-only`
- `git diff --check -- <changed files>`

Builds, tests, runtime smoke checks, or project commands may run only if the selected Packet explicitly approves them in `approved_scope_validation`.

When an approved build/test/smoke command fails, the automation must inspect the first relevant failure. If the cause is inside `approved_scope_allowed_paths`, it must apply an in-scope fix, rerun the same validation command, and record the failure, fix, and rerun result. It should write `DeveloperScopeChangeRequest.md` only when the fix requires out-of-scope files, unapproved protected behavior, unapproved validation, or guessing.

If validation is not approved or cannot be run, the worker records the needed manual validation in `DeveloperResult.md` and does not claim that validation passed.

## Stop Decisions

Use these decisions in the run report:

```text
NoCandidate
Implemented
ScopeChangeRequired
Blocked
ValidationDeferred
AlreadyPresent
```

`Implemented` means implementation files were edited inside scope and required result documents were written. It does not mean the Packet is Done.

`ValidationDeferred` means implementation was completed inside scope, but runtime/build/manual validation still needs human evidence.

## Exact Automation Prompt

Use this prompt for the future recurring automation only after separate user approval:

```text
Run the PlayGround Handoff Developer Worker in approved-scope implementation-pilot mode.

Repository root:
C:\Users\kalux\workStation\play-ground

Automation name:
playground-handoff-developer-worker-implementation-pilot

Mode:
approved-scope implementation pilot

Goal:
Select at most one active Developer Packet with an approved execution scope. Implement only the requested work that fits inside approved_scope_allowed_paths. Do not ask for extra approval merely because source files are edited. Stop only when the work leaves the approved scope, requires an unapproved protected change, cannot be validated within the approved plan, or cannot produce a reviewable diff.

Read first:
- AGENTS.md
- _Docs/Handoff/Dashboard.md
- _Docs/Handoff/Queues/Developer.md
- _Docs/Handoff/Violations/Open.md
- _Docs/Handoff/Role_Workers/Developer_Worker_MVP.md
- _Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
- _Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md

Candidate rule:
Select at most one Packet where:
- to_roles includes Developer
- approved_execution_scope.approved is true
- approved_scope_allowed_paths is not empty
- delivery_status is not Done or Archived
- execution_status is not Done, Blocked, or WaitingUserApproval
- the Packet has ImplementationRequest.md or an equivalent implementation request
- Violations/Open.md has no Critical or Major issue for that Packet
- the likely implementation can stay inside approved_scope_allowed_paths
- approved_scope_validation is clear or explicitly allows manual validation deferral

Working tree rule:
- Run git status --short and git diff --name-only before editing.
- Unrelated local changes outside the selected Packet target files do not block the worker; record them in the run report.
- Unrelated local changes in target files block the worker; write DeveloperScopeChangeRequest.md and stop.

Allowed reads:
- target Packet manifest and request/result documents
- files listed in approved_scope_allowed_paths
- nearby source files only when needed to understand approved files
- git status --short
- git diff --name-only
- git diff -- <approved files>
- git diff --check -- <approved files>
- rg and Get-Content for read-only inspection

Allowed writes:
- files listed in approved_scope_allowed_paths
- one timestamped run report under _Docs/Handoff/Role_Workers/Automation/Runs/
- one new or explicitly superseding _Docs/Handoff/Packets/<handoff-id>/Results/DeveloperResult.md
- _Docs/Handoff/Packets/<handoff-id>/Results/DeveloperScopeChangeRequest.md only when stopping for scope expansion or blocking conditions
- one DevLog under _DevLog/FixLog/ or _DevLog/WorkLog/

Forbidden actions:
- do not edit files outside approved_scope_allowed_paths
- do not edit JSON schema unless explicitly included in approved scope
- do not change save/load behavior unless explicitly included in approved scope
- do not change scene, actor, or component lifecycle unless explicitly included in approved scope
- do not change build settings unless explicitly included in approved scope
- do not create, replace, or edit assets unless explicitly included in approved scope
- do not perform broad refactors
- do not edit generated Supervisor surfaces
- do not edit _Docs/Handoff/00_Index.md
- do not edit Packet manifests
- do not edit approval evidence
- do not claim Packets
- do not change delivery_status or execution_status
- do not mark Done or Archived
- do not create, update, activate, pause, or delete automations
- do not commit
- do not push
- do not wake or control role chats

Validation:
- Always run git status --short, git diff --name-only, and git diff --check for changed files.
- Run build/test/runtime commands only if explicitly approved in the selected Packet.
- If an approved build/test/runtime command fails, inspect the first relevant failure.
- If the cause is inside approved_scope_allowed_paths, apply the in-scope fix, rerun the same validation command, and record the failure, fix, and rerun result.
- If the fix requires out-of-scope files, unapproved protected behavior, unapproved validation commands, or guessing, write DeveloperScopeChangeRequest.md and stop.
- If validation is deferred, record exactly what human validation is needed and do not claim validation passed.

Required outputs:
- Always write one timestamped implementation run report.
- If implementation edits were made, write DeveloperResult.md and one DevLog.
- If blocked before or during implementation, write DeveloperScopeChangeRequest.md instead of DeveloperResult.md.
- Never mark the Packet Done.
- Never commit or push.
```

## Implementation Run Report Format

Each run report must use this structure:

```md
# Developer Worker Implementation Run Report

## Automation

Name: playground-handoff-developer-worker-implementation-pilot
Run At:
Mode: approved-scope implementation pilot

## Files Read

-

## Working Tree Before

- Branch:
- Unrelated non-target changes:
- Target file changes before run:

## Queue Summary

| Handoff ID | Delivery | Execution | Scope Approved | Decision | Reason |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Selected Packet

Handoff ID:
Title:
Decision: NoCandidate / Implemented / ScopeChangeRequired / Blocked / ValidationDeferred / AlreadyPresent

## Approved Scope Check

- approved_execution_scope:
- allowed paths:
- forbidden paths:
- non-goals:
- validation plan:

## Implementation Summary

-

## Changed Files

-

## Validation

- Commands run:
- Build/test failure follow-up:
- Results:
- Deferred human validation:

## Forbidden Action Check

- Out-of-scope file edits:
- JSON schema edits:
- Save/load changes:
- Lifecycle changes:
- Build setting edits:
- Asset edits:
- Supervisor surface edits:
- Manifest edits:
- Approval evidence edits:
- Packet status edits:
- Automation edits:
- Commit/push:

## Outputs Written

-

## Human Action Needed

-
```

## Developer Result Format

Use the `DeveloperResult.md` format defined in:

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
```

## Scope Change Request Format

Use the `DeveloperScopeChangeRequest.md` format defined in:

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
```

## Next Step

The implementation-pilot automation was created as `PAUSED` on 2026-05-28.

The next Phase 31A step is to prepare one small approved-scope implementation Packet and temporarily activate the automation for one observed pilot run after user approval.

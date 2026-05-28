# Developer Worker Implementation Mode Contract

## Purpose

This document defines Phase 31A of the Handoff v2 Developer Worker work.

It converts the Developer Worker from dry-run planning toward a narrow approved-scope implementation pilot.

This document does not create, update, activate, or run a recurring automation.

It also does not authorize any specific source change by itself. A source-editing pilot still needs a concrete Handoff Packet with an approved execution scope.

## Core Rule

Implementation mode follows the user's scope-based approval standard:

```text
Source edits inside the approved execution scope are normal Developer work.
They do not require another approval just because they are source edits.
```

The Developer Worker stops only when the work needs to leave the approved scope, changes a protected area that was not included in the scope, or cannot be verified within the approved validation plan.

## Operating Shape

```text
Approved Developer Packet exists
-> Developer Worker checks approved_execution_scope
-> Developer Worker edits only approved_scope_allowed_paths
-> Developer Worker runs only approved validation commands
-> Developer Worker writes DeveloperResult and DevLog
-> Human QA checks runtime behavior
-> Human or manually directed Codex closes Packet and decides commit/push
```

## Candidate Conditions

The Developer Worker may select one Packet only when all conditions are true:

- `to_roles` includes `Developer`.
- `approved_execution_scope.approved` is `true`.
- `approved_scope_allowed_paths` is not empty.
- `delivery_status` is active work, not `Done` or `Archived`.
- `execution_status` is active work, not `Done`, `Blocked`, or `WaitingUserApproval`.
- the Packet has `ImplementationRequest.md` or an equivalent implementation request.
- the Packet has no Critical or Major issue in `_Docs/Handoff/Violations/Open.md`.
- the requested change can reasonably stay inside `approved_scope_allowed_paths`.
- the approved validation plan is clear enough to run or explicitly defer.
- the working tree does not contain unrelated local edits in the target files.

If multiple candidates exist, select at most one.

Preferred order:

1. Explicitly active Developer Packet.
2. Most recently updated approved-scope Developer Packet.
3. Otherwise, no candidate.

## Allowed Reads

Implementation mode may read:

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- target Packet `manifest.yaml`
- target Packet `PlanningBrief.md`
- target Packet `ImplementationRequest.md`
- target Packet `Results/*.md`
- files listed in `approved_scope_allowed_paths`
- nearby source files only when needed to understand an approved file's local context
- `git status`, `git diff --name-only`, and `git diff -- <approved files>` for scope awareness

## Allowed Writes

Implementation mode may write:

- source files listed in `approved_scope_allowed_paths`
- non-schema data files listed in `approved_scope_allowed_paths`, only when the Packet explicitly includes data edits
- one timestamped run report under `_Docs/Handoff/Role_Workers/Automation/Runs/`
- `Results/DeveloperResult.md`
- `Results/DeveloperScopeChangeRequest.md` when the worker must stop
- one DevLog under `_DevLog/FixLog/` or `_DevLog/WorkLog/`

Implementation mode must not overwrite an existing `DeveloperResult.md` unless the Packet explicitly says the previous result is superseded.

## Allowed Validation

Implementation mode may run validation commands only when they are named in the Packet approval scope.

Examples:

- targeted build command
- targeted test command
- read-only parse/check command
- project-local smoke command

If the Packet does not approve validation command execution, the worker may still document the validation that must be performed manually, but it must not claim validation passed.

## Build/Test Self-Fix Loop

When a Packet approves a build, test, parse, or smoke command, the Developer Worker must run the approved command after implementation.

If the approved command fails, the worker must inspect the first relevant failure and decide whether the cause is inside `approved_scope_allowed_paths`.

If the cause is inside the approved scope, the worker should fix it, rerun the same validation command, and record:

- the failing command
- the relevant error
- the in-scope cause
- the fix applied
- the rerun result

The worker must stop and write `Results/DeveloperScopeChangeRequest.md` only when the fix requires an out-of-scope file, an unapproved protected behavior change, an unapproved validation command, or guessing beyond the approved implementation scope.

Build or test failure is not by itself a reason to stop when the cause is clearly inside the approved scope.

## Forbidden Actions

Implementation mode must not:

- edit files outside `approved_scope_allowed_paths`
- edit JSON schema unless explicitly included in the approved scope
- change save/load behavior unless explicitly included in the approved scope
- change scene, actor, or component lifecycle unless explicitly included in the approved scope
- change build settings unless explicitly included in the approved scope
- create, replace, or edit assets unless explicitly included in the approved scope
- perform broad refactors not needed for the approved task
- edit Handoff Supervisor generated surfaces
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

## Stop Conditions

The Developer Worker must stop and write `Results/DeveloperScopeChangeRequest.md` when:

- a required file is outside `approved_scope_allowed_paths`
- the implementation needs a protected change not listed in the approved scope
- the implementation risk is meaningfully different from the approved Packet
- the validation needed is outside the approved validation plan
- a build or test failure cannot be fixed inside the approved scope
- target files contain unrelated local edits
- the Packet has a Critical or Major Handoff violation
- the worker cannot produce a reviewable diff without guessing

Stopping means:

- do not keep editing
- do not mark work complete
- do not commit or push
- record what changed, what was not changed, and the exact human decision needed

## Developer Result Format

`Results/DeveloperResult.md` should contain:

```md
# Developer Result

## Handoff

Handoff ID:
Title:

## Scope Used

- Approved scope summary:
- Files allowed:
- Files changed:
- Files intentionally not changed:

## Implementation Summary

-

## Validation

- Commands run:
- Build/test failure follow-up:
- Results:
- Manual validation still needed:

## Review Notes

-

## Remaining Risks

-

## Next Human Action

-
```

## Scope Change Request Format

`Results/DeveloperScopeChangeRequest.md` should contain:

```md
# Developer Scope Change Request

## Handoff

Handoff ID:
Title:

## Why The Worker Stopped

-

## Needed Scope Change

- Additional files:
- Additional protected behavior:
- Additional validation:

## Current Work State

- Files changed before stopping:
- Files not changed:

## Decision Needed

Approve expanded scope / revise request / cancel implementation.
```

## Pilot Rule

The first implementation-mode pilot should be small, reversible, and already approved through a Handoff Packet.

The pilot should start from a `PAUSED` automation or a manually triggered controlled run, not an always-on implementation worker.

Success criteria for the pilot:

- exactly one Packet is selected
- all edited files are inside `approved_scope_allowed_paths`
- no protected behavior is changed outside the approved scope
- DeveloperResult and DevLog are written
- validation is run only if approved, otherwise clearly deferred
- approved build/test failures are analyzed and fixed in-scope before returning, when possible
- no Packet is marked Done automatically
- no commit or push is performed by the worker

## Non-Goals

Phase 31A does not:

- create implementation-mode recurring automation
- activate implementation-mode recurring automation
- choose a specific gameplay bug fix
- edit source files
- run builds or tests without a Packet-approved validation command
- close Packets
- commit or push

# Handoff Developer Worker Implementation Mode Contract

## Summary

Documented Phase 31A for the Handoff v2 Developer Worker implementation-mode pilot.

This phase defines how a future Developer Worker may perform source edits inside an approved execution scope without asking for a second approval merely because source files are involved.

## Background

The previous Developer Worker phases established:

- Phase 29A: Developer Worker MVP design.
- Phase 29B: dry-run prompt contract.
- Phase 30A: PAUSED dry-run automation creation.
- Phase 30B: no-candidate dry-run validation.
- Phase 30C: positive dry-run plan creation pilot.

The user clarified the desired operating standard:

```text
If planning and execution scope are already approved, source edits inside that scope are normal Developer work.
The worker should stop only when the work leaves the approved scope or changes protected behavior not included in the scope.
```

## Scope

Added:

- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract_KR.md`

Updated:

- `_Docs/Handoff/00_Index.md`

## Implementation Notes

The contract defines:

- candidate Packet conditions
- allowed reads
- allowed writes
- approved validation command handling
- forbidden actions
- stop conditions
- `DeveloperResult.md` format
- `DeveloperScopeChangeRequest.md` format
- first implementation-mode pilot success criteria

The key behavior is scope-based:

```text
Source edits inside approved_scope_allowed_paths are allowed implementation work.
Out-of-scope or protected changes require stopping and writing a scope change request.
```

## Non-Goals

This phase did not:

- create implementation-mode recurring automation
- activate implementation-mode recurring automation
- select a concrete gameplay bug fix
- edit source files
- edit gameplay JSON
- run builds or tests
- change Packet status
- commit or push

## Review Summary

Self-review focus:

- The contract does not reintroduce source-edit approval for every source change.
- The contract still preserves a clear stop point for out-of-scope work.
- Human QA, Packet closure, commit, and push remain outside worker authority.

## Validation Summary

Validation performed:

- Document structure review.
- `git diff --check` for changed Handoff and WorkLog files.

Build/test validation was not run because this phase changes documentation only.

## Remaining Risks

- The actual implementation-mode automation prompt is not created yet.
- The first source-editing pilot still needs a concrete approved Handoff Packet.
- Validation command execution must be decided per Packet.

## Next Tasks

- Continue Phase 31A with an implementation-mode automation prompt and runbook.
- Create the implementation-mode automation as `PAUSED` only after user approval.
- Run a tiny approved-scope implementation pilot after user approval.

## AIWorkflow User Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed.

Reason: this phase documents Handoff Developer Worker implementation-mode boundaries only. It does not change AIWorkflow command names, PC Runner behavior, regular AIWorkflow completion gates, or user intervention points in the AIWorkflow guide.

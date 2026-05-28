# Handoff Developer Worker Implementation Mode Prompt Runbook

## Summary

Continued Phase 31A by documenting the implementation-mode prompt contract and automation runbook for a future Developer Worker implementation pilot.

This work prepares the exact prompt and operating procedure for an automation that may later edit source files inside an approved execution scope.

## Background

Phase 31A first established the implementation-mode contract:

```text
Source edits inside approved_scope_allowed_paths are normal Developer work.
The worker stops only when the work leaves the approved scope or needs unapproved protected behavior.
```

The next required piece was a concrete prompt and runbook so the future automation can be created without ambiguous behavior.

## Scope

Added:

- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract_KR.md`
- `_Docs/Handoff/Role_Workers/Automation/Developer_Worker_Implementation_Mode_Automation_Runbook.md`
- `_Docs/Handoff/Role_Workers/Automation/Developer_Worker_Implementation_Mode_Automation_Runbook_KR.md`

Updated:

- `_Docs/Handoff/00_Index.md`

## Implementation Notes

The prompt contract defines:

- recommended automation name: `playground-handoff-developer-worker-implementation-pilot`
- initial state: `PAUSED`
- candidate Packet rules
- working-tree handling
- allowed reads and writes
- forbidden actions
- validation rules
- stop decisions
- exact automation prompt
- implementation run report format

The runbook defines:

- creation preconditions
- pilot activation procedure
- expected outputs
- forbidden output changes
- first pilot recommendation
- validation review
- human QA boundary
- recovery procedure

## Non-Goals

This work did not:

- create the implementation-mode automation
- activate recurring automation
- edit source files
- edit gameplay JSON
- run build or tests
- update Packet status
- commit or push

## Review Summary

Self-review focus:

- The prompt does not ask for extra approval just because source files are edited.
- The prompt limits edits to `approved_scope_allowed_paths`.
- Unrelated non-target working-tree changes are recorded but do not block execution.
- Target-file local changes block execution.
- Packet status, manifests, approval evidence, commit, and push remain outside automation authority.

## Validation Summary

Validation performed:

- Document structure review.
- `git diff --check` for changed Handoff and WorkLog files.

Build/test validation was not run because this phase changes documentation only.

## Remaining Risks

- The actual implementation-mode automation is still not created.
- The first implementation pilot still needs a concrete approved Handoff Packet.
- Runtime validation must still be provided by human QA or an approved validation source.

## Next Tasks

- Create `playground-handoff-developer-worker-implementation-pilot` as `PAUSED` after user approval.
- Prepare one small approved-scope implementation Packet.
- Temporarily activate the automation for one observed pilot run.

## AIWorkflow User Guide Update Decision

No update to `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` is needed.

Reason: this work documents Handoff Developer Worker prompt and runbook behavior only. It does not change AIWorkflow command names, PC Runner behavior, regular AIWorkflow completion gates, or user intervention points in the AIWorkflow guide.

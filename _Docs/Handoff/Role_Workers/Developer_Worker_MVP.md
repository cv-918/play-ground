# Developer Worker MVP

## Purpose

This document defines Phase 29A of the Handoff v2 automation work.

It designs the first Developer Worker MVP, but it does not create or activate a recurring automation.

## Current Reality

There is no Developer Worker automation yet.

Current operating roles are:

- Handoff Supervisor: scans Packets and refreshes generated status surfaces.
- Low-risk Role Worker: acts like an office assistant that reads queues and drafts safe document-only Packet Results.
- Current Codex chat: may act as Developer when the user explicitly assigns approved implementation work in chat.

The Developer Worker MVP is the next layer after this. It is not the same as the low-risk Role Worker.

## Design Goal

The Developer Worker should reduce manual orchestration for approved implementation work without becoming an unbounded autonomous developer.

The target operating shape is:

```text
approved execution scope exists
-> Developer Worker verifies the scope
-> Developer Worker performs only the in-scope implementation work
-> Developer Worker records evidence and validation
-> human QA and commit decisions remain human-controlled
```

The important rule is:

```text
Source edits are allowed only because the execution scope is already approved.
They are not blocked just because they are source edits.
```

## Relationship To Other Handoff Automation

### Handoff Supervisor

The Supervisor remains the status and consistency observer.

It may:

- scan manifests
- generate Dashboard, Queues, and Violations
- report missing approved scopes
- report possible scope drift

It must not implement work.

### Low-Risk Role Worker

The existing low-risk Role Worker remains the office assistant.

It may:

- read queues
- write run reports
- draft safe document-only Packet Results

It must not edit source, JSON, runtime behavior, assets, build settings, or Packet state.

### Developer Worker

The Developer Worker is the future implementation worker.

It may eventually:

- read approved Developer Packets
- inspect source files inside the approved scope
- edit files inside the approved scope
- run approved validation commands
- write Developer Results and DevLogs

It must stop when the work leaves the approved scope.

## MVP Candidate Conditions

The Developer Worker may consider a Packet only when all conditions are true:

- `to_roles` includes `Developer`.
- `approved_execution_scope.approved` is `true`.
- `approved_scope_allowed_paths` is not empty.
- `delivery_status` and `execution_status` show the Packet is active work, not `Done` or `Archived`.
- `approval_evidence.approved` is `true`, or the approved execution scope records equivalent user approval.
- `Violations/Open.md` has no Critical or Major issue for the Packet.
- Scope drift is absent or explained before execution.
- The requested implementation can stay inside `approved_scope_allowed_paths`.
- The requested implementation does not require protected changes outside the approved scope.

## MVP Allowed Actions

The Developer Worker MVP may be designed to do these actions after separate automation creation approval:

- read `AGENTS.md`
- read Handoff Dashboard, Queues, Violations, and target Packet documents
- read source files inside the approved scope
- read nearby source files only when needed to understand an approved file's local context
- edit source files inside the approved scope
- edit non-schema data files only when explicitly included in the approved scope
- write `Results/DeveloperResult.md`
- write `Results/DeveloperScopeChangeRequest.md` when it must stop
- write a DevLog under `_DevLog/FixLog/` or `_DevLog/WorkLog/`
- run validation commands named in the approved validation plan when they are standard project commands

## MVP Forbidden Actions

The Developer Worker MVP must not:

- create or change JSON schema unless the approved scope explicitly includes schema work
- change save/load behavior unless explicitly approved
- change build settings
- create, replace, or edit assets unless explicitly approved
- perform broad refactors outside the approved scope
- change scene, actor, or runtime lifecycle outside the approved scope
- edit Handoff Supervisor generated surfaces
- edit approval evidence
- mark a Packet `Done` or `Archived` by itself
- commit
- push
- wake, control, or impersonate other role chats
- continue after detecting required out-of-scope work

## Stop Conditions

The Developer Worker must stop and write `Results/DeveloperScopeChangeRequest.md` when:

- a required file is outside `approved_scope_allowed_paths`
- a protected change is needed but not approved
- validation requires a command not listed in the approved validation plan
- the implementation risk becomes meaningfully different from the approved scope
- existing local changes make the target files unsafe to edit
- the Packet has Critical or Major Handoff violations

Stopping means:

- do not edit additional files
- do not mark work complete
- do not commit or push
- record the exact reason and the next human decision needed

## Initial Automation Mode

The first actual Developer Worker automation should start as `PAUSED`.

Recommended first mode:

```text
approved-scope dry run
```

In dry-run mode, the worker may inspect the approved scope and write a proposed implementation plan, but it must not edit source.

After dry-run behavior is validated, a later phase may approve:

```text
approved-scope implementation mode
```

Implementation mode is the first mode that may edit source inside the approved scope.

## Completion And QA

The Developer Worker may write implementation results, but human QA remains separate.

MVP completion flow:

```text
Developer Worker implements within scope
-> Developer Worker runs approved validation
-> Developer Worker writes DeveloperResult and DevLog
-> human QA verifies runtime behavior
-> human or manually directed Codex closes Packet
-> human decides commit and push
```

The Developer Worker must not turn a successful build into automatic completion.

## Recommended Next Phases

### Phase 29B: Developer Worker Prompt Contract

Write the exact recurring automation prompt and run report format, but do not create the automation yet.

### Phase 30A: Developer Worker Dry-Run Automation Creation

Create one PAUSED recurring automation that performs approved-scope dry runs only.

### Phase 30B: Dry-Run Pilot

Run a small approved Packet through dry-run mode and verify that it does not edit source.

### Phase 31A: Approved-Scope Implementation Pilot

Only after dry-run success, approve a narrow implementation-mode pilot.

## Non-Goals

This Phase 29A design does not:

- create a recurring automation
- modify automation prompts
- edit game source
- edit JSON
- run builds or tests
- change Packet status behavior
- grant commit or push authority
- split workers by role

# Role Worker Automation v2 Bundle 2

## Purpose

This document defines the second Handoff v2 implementation bundle:

```text
Phase 23 through Phase 28
```

The bundle extends the existing low-risk Role Worker automation from run-report-only behavior to limited Packet Results draft support.

It does not approve implementation automation.

## Bundle Goal

Give the Role Worker enough authority to reduce user orchestration burden without turning it into an autonomous Developer.

The stable target is:

```text
read Handoff queues
-> identify document-only low-risk candidates
-> write a run report
-> optionally write safe Packet Results drafts
-> never change operational state
```

## Phase List

### Phase 23: Role Worker Automation Scope Lock

Decision:

- Keep one shared Role Worker automation.
- Do not split into Planner, Developer, Artist, Reviewer, and QA automations yet.
- Keep Supervisor and Role Worker responsibilities separate.

Supervisor:

- reads Packet manifests
- refreshes Dashboard, Queues, and Violations
- reports scope and consistency issues

Role Worker:

- reads Dashboard, Queues, Violations, Packets, and role-worker rules
- writes its own run reports
- may write safe Packet Results drafts
- does not change Packet state

### Phase 24: Role Worker Run Contract

Every run must produce one timestamped report under:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
```

The run report must state:

- automation name
- run timestamp
- mode
- roles scanned
- files read
- candidates considered
- files written
- forbidden action check
- stop conditions
- result

### Phase 25: Packet Results Draft Permission

The Role Worker may write new Packet Results drafts only when the candidate is document-only low-risk.

Allowed draft paths:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>LowRiskWorkReport.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>ClarificationRequest.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>BlockerSummary.md
```

The Role Worker must not overwrite existing results.

If the target result exists, the run report records `AlreadyPresent` and skips the output.

### Phase 26: Low-Risk Document Work Pilot

Pilot material:

```text
When resolution changes, the character should remain at the same field/world position instead of shifting to a different field-relative position.
```

The pilot is document-only.

The Role Worker must:

- read the Packet and Queue context
- recognize that real implementation would need source/runtime investigation
- avoid source, JSON, runtime, asset, build, test, commit, and push actions
- write an intake decision/result draft
- record that future implementation needs a separately approved execution scope

### Phase 27: Role Worker Activation And Monitoring

Automation state:

- Keep the Role Worker automation `PAUSED`.
- Keep cadence aligned with Supervisor: 60 minutes.
- Update the automation prompt to allow safe Packet Results drafts.
- Do not activate recurring runs until the human developer explicitly asks.

Monitoring rule:

- First active run after this bundle should be checked for output count, skipped risky candidates, forbidden action compliance, and duplicate thread noise.

### Phase 28: Bundle 2 Finalization

Close Bundle 2 after:

- scope lock is documented
- run contract is documented
- Packet Results draft authority is documented
- a document-only pilot is recorded
- automation prompt is aligned
- the remaining future work is separated from this bundle

## Allowed Reads

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Packets/**`
- `_Docs/Handoff/Role_Workers/**`
- `_Docs/Handoff/Role_Routines/*.md`

## Allowed Writes

- `_Docs/Handoff/Role_Workers/Automation/Runs/*.md`
- new safe Packet Results drafts under `_Docs/Handoff/Packets/<handoff-id>/Results/`

## Forbidden Actions

The Role Worker must not:

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

## Future Work Outside This Bundle

The following remain outside Bundle 2:

- Developer automation that edits source code
- approved-scope implementation automation
- automatic Packet creation helpers
- automatic status changes
- automatic approval evidence
- automatic completion gates
- automatic commit or push

These require separate approval and should be considered as a later bundle.

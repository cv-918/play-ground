# Developer Worker Dry-Run Automation Runbook

## Purpose

This document records Phase 30A: creation of the first Developer Worker dry-run recurring automation.

It is an operational runbook, not permission to expand the automation into source-editing implementation mode.

## Automation

- automation id: `playground-handoff-developer-worker-dry-run`
- status: PAUSED
- cadence: 60-minute interval, aligned with the Handoff Supervisor cadence
- execution environment: local workspace
- workspace: `C:\Users\kalux\workStation\play-ground`

## Mode

```text
approved-scope dry run
```

This automation is a Developer planning worker, not a source-editing implementation worker.

It may inspect approved-scope Developer Packets and prepare a dry-run implementation plan.

It must not edit source, JSON, runtime behavior, assets, build settings, Packet state, approval evidence, or Git state.

## Prompt Source

The automation prompt is based on:

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md
```

The prompt contract remains the reviewable source for:

- candidate selection
- allowed reads
- allowed writes
- forbidden actions
- run report format
- `DeveloperDryRunPlan.md` format

## Allowed Reads

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md`
- target Packet manifest, request documents, and result documents
- source files listed in `approved_scope_allowed_paths`
- nearby source files only when needed to understand the approved files

## Allowed Writes

One timestamped run report under:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
```

One new dry-run plan under a selected Packet:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md
```

The automation must not overwrite an existing `DeveloperDryRunPlan.md`.

## Forbidden Actions

The automation must not:

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

## Run Behavior

When activated later, each run should:

1. Read the required Handoff and Developer Worker contract files.
2. Read the Developer queue and open violations.
3. Select at most one approved-scope Developer Packet.
4. Inspect only approved-scope source files and nearby local context when needed.
5. Write one timestamped run report.
6. Write `DeveloperDryRunPlan.md` only when a safe candidate exists and the target output does not already exist.
7. Stop without editing source, status, manifests, approval evidence, DevLogs, or Git state.

## Activation Rule

The automation is created in `PAUSED` status.

Do not activate it until the human developer explicitly asks for a first dry-run validation.

## First Run Validation

Phase 30B first-run validation was performed on 2026-05-28.

Observed run report:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/2026-05-28_025229_DeveloperWorkerDryRun.md
```

Observed result:

- Run time: 2026-05-28 02:52:39 +09:00
- Selected Packet: none
- Reason: no active approved-scope Developer Packet was available
- Files written: the timestamped run report only
- `DeveloperDryRunPlan.md`: not written
- Source, JSON, non-schema data, assets, build/test, generated Supervisor surfaces, `00_Index.md`, manifests, approval evidence, Packet status, DevLogs, commit, push, and role-chat control: not touched by the automation
- Automation was returned to `PAUSED` after validation

Verdict:

```text
Passed as no-candidate dry-run validation.
```

## Phase 30A Completion

Phase 30A is complete when:

- the recurring automation exists
- it is PAUSED
- it uses the prompt contract from Phase 29B
- this runbook records the creation boundary
- WorkLog records that no dry-run execution was validated yet

## Phase 30C Plan Creation Pilot

Phase 30C was validated on 2026-05-28 using Packet:

```text
_Docs/Handoff/Packets/HANDOFF-20260528-008-developer-worker-dry-run-plan-pilot/
```

Observed first plan-writing run:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/2026-05-28_041145_DeveloperWorkerDryRun.md
```

Observed dry-run plan:

```text
_Docs/Handoff/Packets/HANDOFF-20260528-008-developer-worker-dry-run-plan-pilot/Results/DeveloperDryRunPlan.md
```

Additional repeated runs occurred while the automation stayed active:

```text
2026-05-28_051214_DeveloperWorkerDryRun.md
2026-05-28_061241_DeveloperWorkerDryRun.md
2026-05-28_071422_DeveloperWorkerDryRun.md
2026-05-28_081516_DeveloperWorkerDryRun.md
```

Those repeated runs reported `AlreadyPresent` and did not overwrite `DeveloperDryRunPlan.md`.

The automation was returned to `PAUSED` after validation.

Verdict:

```text
Passed. The positive plan-creation path and no-overwrite repeat-run path were both observed.
```

# Developer Worker Implementation Mode Automation Runbook

## Purpose

This document records the Phase 31A operating runbook for the Developer Worker implementation-mode automation.

It is both a creation record and an operation guide.

As of 2026-05-28, the implementation-mode recurring automation has been created and returned to `PAUSED`.

## Intended Automation

Name:

```text
playground-handoff-developer-worker-implementation-pilot
```

Initial state:

```text
PAUSED
```

Mode:

```text
approved-scope implementation pilot
```

Recommended cadence:

```text
60 minutes, aligned with the Handoff Supervisor cadence.
```

Operational posture:

```text
Keep PAUSED by default.
Temporarily activate only for an explicitly approved pilot Packet.
Return to PAUSED after the first observed run.
```

## Required Source Documents

The automation must be based on:

- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`

The exact prompt is defined in:

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md
```

## Creation Preconditions

Before creating the automation, confirm:

- The user approved creation of the implementation-mode automation.
- The automation is created as `PAUSED`.
- The prompt matches the prompt contract.
- The automation does not grant commit or push authority.
- The automation does not grant Packet status or approval evidence authority.
- The automation is not allowed to control other role chats.

## Creation Record

Created on:

```text
2026-05-28
```

Created automation:

```text
playground-handoff-developer-worker-implementation-pilot
```

Observed status after correction:

```text
PAUSED
```

Notes:

- The automation was requested as `PAUSED`.
- The Codex app initially stored it as `ACTIVE`.
- It was immediately updated back to `PAUSED`.
- No `DeveloperWorkerImplementation` run report was found after creation.
- No implementation Packet was active at creation time.
- No source, JSON, asset, build, approval evidence, commit, or push action was performed.

## Pilot Preconditions

Before temporarily activating the automation, confirm:

- There is exactly one intended pilot Packet, or a clear priority rule selects one.
- The Packet targets `Developer`.
- `approved_execution_scope.approved` is `true`.
- `approved_scope_allowed_paths` contains the exact files the worker may edit.
- Protected changes such as schema, save/load, lifecycle, assets, and build settings are either out of scope or explicitly approved.
- Validation commands are explicitly approved, or manual validation deferral is explicitly allowed.
- If a build/test command is approved, the Packet permits in-scope failure diagnosis, in-scope fix attempts, and rerunning the same command.
- Handoff Supervisor reports no Critical or Major issue for the Packet.
- Target files do not contain unrelated local edits.

## Activation Procedure

1. Refresh Handoff status with the Supervisor.
2. Verify the intended Packet appears in the Developer queue.
3. View the automation and confirm it is `PAUSED`.
4. Temporarily switch the automation to `ACTIVE`.
5. Wait for one run, or trigger the scheduled run only if the Codex app supports that operation.
6. Inspect the timestamped implementation run report.
7. Inspect `Results/DeveloperResult.md` or `Results/DeveloperScopeChangeRequest.md`.
8. Confirm changed files are inside `approved_scope_allowed_paths`.
9. Confirm no forbidden actions occurred.
10. Return the automation to `PAUSED`.

## Expected Outputs

Every run should write:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_DeveloperWorkerImplementation.md
```

If implementation succeeds inside scope, it should also write:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperResult.md
_DevLog/FixLog/<date>_<topic>.md
```

or:

```text
_DevLog/WorkLog/<date>_<topic>.md
```

If the worker must stop, it should write:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperScopeChangeRequest.md
```

## Forbidden Output Changes

The automation must not change:

- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- Packet `manifest.yaml`
- approval evidence
- Packet delivery or execution status
- Git commits
- Git pushes
- recurring automation definitions

## First Pilot Recommendation

The first implementation-mode pilot should be:

- small
- reversible
- visible in gameplay or UI
- limited to one to three source files
- already represented as a Handoff Packet
- already approved by the user as an execution scope
- not dependent on JSON schema, save/load, asset, build setting, or lifecycle changes

Avoid using the first pilot for:

- broad refactors
- architecture migrations
- schema changes
- lifecycle changes
- multi-system behavior changes
- asset pipeline work

## Validation Review

After the first run, check:

- run report exists
- selected Packet is correct
- changed files are only approved files
- no protected behavior was changed outside scope
- `git diff --check` passed for changed files
- approved build/test commands were run, or validation was clearly deferred
- approved build/test failures were diagnosed, fixed in-scope when possible, and rerun before returning
- DeveloperResult or ScopeChangeRequest exists
- DevLog exists if implementation occurred
- automation is back to `PAUSED`
- no commit or push occurred

## Human QA

Human QA remains outside the automation.

The automation may say what QA is needed, but it cannot mark runtime validation passed unless the user or another approved validation source provides evidence.

## Completion Procedure

After human QA:

1. Human or manually directed Codex reviews the diff.
2. Human or manually directed Codex updates Packet status.
3. Human decides whether to commit and push.

The implementation-mode automation itself does not close the Packet.

## Recovery

If the automation edits outside approved scope:

1. Stop the automation.
2. Keep it `PAUSED`.
3. Inspect `git diff --name-only`.
4. Do not commit.
5. Decide manually whether to revert, repair, or expand scope.

If the automation stays `ACTIVE` longer than intended:

1. Pause it immediately.
2. Inspect all run reports since activation.
3. Inspect changed files.
4. Confirm it did not process multiple Packets unintentionally.

## Current State

Current Phase 31A state:

```text
Implementation-mode contract: documented
Implementation-mode prompt contract: documented
Implementation-mode runbook: documented
Implementation-mode automation: created as PAUSED
Implementation-mode pilot: first run observed
Build/test self-fix loop: documented after first build failure follow-up
```

## Next Step

Use the documented build/test self-fix loop in the next approved implementation-mode pilot before expanding the worker's authority or cadence.

# Handoff Supervisor Automation Runbook

## Purpose

This document defines how the Handoff Supervisor may be operated as an automation without expanding into unsafe execution.

It is Phase 9A of the AIWorkflow Handoff Integration.

## Automation Goal

The automation goal is to keep Handoff visibility current.

The Supervisor may:

- scan Packet manifests
- regenerate `Dashboard.md`
- regenerate role Queues
- regenerate `Violations/Open.md`
- report waiting approval, ready work, blocked work, review requests, QA requests, and consistency issues

The Supervisor must not become an implementation worker.

## Automation Modes

### Mode 1: Manual

The human developer or Codex runs:

```bat
tools\aiworkflow\handoff_supervisor.bat status
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

Use this mode while changing Supervisor logic or Packet format.

### Mode 2: Thread Follow-Up

A Codex thread may wake up later and run a Handoff status check for this conversation.

This mode is useful for short follow-ups, but it should not be treated as the durable project automation.

Allowed output:

- chat summary
- optional generated Handoff status surfaces if explicitly approved for that run

### Mode 3: Workspace Cron

A Codex automation may run against the repository workspace on a recurring schedule.

Recommended first schedule:

```text
Every 60 minutes while the automation is ACTIVE
```

Allowed output:

- `Dashboard.md`
- `Queues/<Role>.md`
- `Violations/Open.md`
- a short run summary when issues or approval waits exist

## First Safe Automation Scope

The first recurring automation should do only this:

1. Run `tools\aiworkflow\handoff_supervisor.bat status`.
2. Run `tools\aiworkflow\handoff_supervisor.bat write-docs --execute`.
3. If waiting approvals or consistency issues exist, summarize them.
4. Do not edit any files outside generated Handoff status surfaces.

## Explicitly Forbidden

Automation must not:

- edit game source
- edit gameplay JSON
- change JSON schema
- change runtime behavior
- create or replace assets
- run build or tests
- approve work
- set approval evidence
- claim work on behalf of a role
- mark work `Done`
- commit
- push
- wake or control other role chats

## Human Approval Boundary

Creating a recurring Codex automation is a separate approval step.

The approval should specify:

- schedule
- workspace path
- whether generated Handoff status surfaces may be written
- whether the automation should only report or also regenerate docs
- where summaries should appear

## Approved Initial Automation

The first Supervisor recurring automation was approved by the human developer on 2026-05-27.

Approved settings:

- automation id: `playground-handoff-supervisor`
- schedule: every 60 minutes
- status: `ACTIVE`
- workspace: `C:\Users\kalux\workStation\play-ground`
- generated Handoff status surface updates: allowed

`ACTIVE` means the Codex automation object is enabled and will run on its schedule.

It does not mean the automation becomes a worker between runs.

Each scheduled run should start, inspect Handoff state, refresh allowed generated surfaces, report relevant status, and then stop.

## First Run Validation

The first observed scheduled run was validated on 2026-05-27.

Observed generated surface timestamp:

```text
2026-05-27 14:27:03 +09:00
```

The run refreshed only generated Handoff status surfaces:

- `Dashboard.md`
- `Queues/<Role>.md`
- `Violations/Open.md`

The Handoff status after validation reported 0 waiting approvals, 0 ready work, and 0 consistency issues.

Cron execution may create one visible run/thread per scheduled execution. The human developer decided to keep the 60-minute ACTIVE schedule unchanged for now.

## Recommended Automation Prompt

Use this prompt for the recurring automation after approval:

```text
Run the Handoff Supervisor for the PlayGround repository.

Command order:
1. Run tools\aiworkflow\handoff_supervisor.bat status.
2. Run tools\aiworkflow\handoff_supervisor.bat write-docs --execute.
3. Report the result using the fixed Markdown format in the next section.

Allowed actions:
- Run tools\aiworkflow\handoff_supervisor.bat status.
- Run tools\aiworkflow\handoff_supervisor.bat write-docs --execute.
- Summarize Handoff counts, Waiting User Approval items, and Consistency Issues.

Forbidden actions:
- Do not edit game source, gameplay JSON, assets, build settings, approval evidence, commits, or pushes.
- Do not run builds or tests.
- Do not mark work Done.
- Do not claim Packets.
- Do not wake or control other role chats.
- Do not add, remove, rename, or reorder sections in the report format.
```

## Fixed Supervisor Report Format

Recurring Supervisor runs must use this exact Markdown section order.

If a section has no items, write `None`.

```md
# PlayGround Handoff Supervisor Run

## Status
- Result: OK / WARNING / ERROR
- Generated At: <timestamp from supervisor output if available>
- Automation: playground-handoff-supervisor
- Workspace: C:\Users\kalux\workStation\play-ground

## Counts
- All Packets: <number>
- Active Packets: <number>
- Waiting Approval: <number>
- Ready Work: <number>
- In Progress: <number>
- Review Requested: <number>
- QA Requested: <number>
- Blocked: <number>
- Consistency Issues: <number>

## Waiting User Approval
None

If items exist, replace `None` with a Markdown table:
| Handoff ID | Role | Title | Approval Request | Updated |
| --- | --- | --- | --- | --- |

## Consistency Issues
None

If items exist, replace `None` with a Markdown table:
| Severity | Handoff ID | Issue | Suggested Action |
| --- | --- | --- | --- |

## Generated Files
- Dashboard.md: refreshed / not refreshed
- Queues/*.md: refreshed / not refreshed
- Violations/Open.md: refreshed / not refreshed

## Forbidden Action Check
- Source edits: No
- Gameplay JSON edits: No
- Asset edits: No
- Build/test execution: No
- Approval evidence changes: No
- Packet claim changes: No
- Done/Archived changes: No
- Commit/push: No
- Role-chat wake/control: No

## Human Action Needed
None
```

The automation should not add narrative before or after this report.

## Completion Standard

Phase 9A is complete when:

- automation modes are documented
- first safe recurring scope is documented
- forbidden automation actions are explicit
- the first automation prompt is available for review

Actual role-worker automation remains out of scope.

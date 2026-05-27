# Handoff Supervisor MVP

## Purpose

The Handoff Supervisor MVP is the first observable automation layer for the AI Role Handoff System.

It reads structured Handoff Packets and produces visible work surfaces:

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/<Role>.md`
- `_Docs/Handoff/Violations/Open.md`

The Supervisor exists because role chats should not rely only on hidden chat memory, custom instructions, or repeated manual reminders. The repository file state should show what work exists, who it is for, what needs approval, and what is structurally inconsistent.

## Tool Entry Point

Run from the repository root:

```bat
tools\aiworkflow\handoff_supervisor.bat status
tools\aiworkflow\handoff_supervisor.bat scan --role Developer
tools\aiworkflow\handoff_supervisor.bat status --json
tools\aiworkflow\handoff_supervisor.bat write-docs
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

`write-docs` without `--execute` is a dry-run plan and must not write files.

`write-docs --execute` writes only Handoff documentation surfaces.

## Inputs

The Supervisor may read:

- `_Docs/Handoff/Packets/**/manifest.yaml`
- Packet documents referenced by each manifest
- Standard Packet files such as `ImplementationRequest.md`, `ReviewRequest.md`, `QARequest.md`, and `CompletionNotice.md`
- `_Docs/Handoff/` metadata documents needed to describe the generated surfaces

The MVP does not read game source, gameplay JSON, local config, secrets, or external services.

## Generated Outputs

### Dashboard

`_Docs/Handoff/Dashboard.md` is the human-facing status board.

It shows:

- total Packets
- active Packets
- waiting user approval count
- ready work count
- in-progress work count
- blocked count
- review/QA requested count
- consistency issue count
- waiting approval table
- ready work table
- review requested table
- QA requested table
- blocked table
- role queue links
- recently done Packets
- full Packet index

### Role Queues

`_Docs/Handoff/Queues/<Role>.md` is the visible intake file for each role chat.

Initial role queues:

- Planner
- Developer
- Artist
- Reviewer
- QA

A role chat should look at its queue before asking the human developer to re-explain where work lives.

Each generated role queue includes direct sections for:

- waiting user approval
- ready work
- in progress
- review requested
- QA requested
- blocked
- all role packets

### Violations

`_Docs/Handoff/Violations/Open.md` lists structural problems found by the Supervisor.

Examples:

- missing required manifest fields
- invalid status values
- unknown roles
- Developer target without `ImplementationRequest.md`
- Artist target without `ArtRequest.md`
- Reviewer target without `ReviewRequest.md`
- QA target without `QARequest.md`
- `approval_required: true` without `approval_request_path`
- `WaitingUserApproval` without a linked approval request
- Packet manifest missing from `00_Index.md` Packet Index
- stale `00_Index.md` Packet Index or Waiting User Approval rows
- `Done` without `CompletionNotice.md`

## Safety Boundary

The Supervisor MVP may:

- read Handoff Packet metadata
- check simple consistency rules
- print status to chat or terminal
- output JSON
- generate Dashboard, Queue, and Violation Markdown files when `write-docs --execute` is used

The Supervisor MVP must not:

- edit game source code
- edit gameplay JSON
- change JSON schema
- change runtime behavior
- create or replace assets
- run build or tests
- record human approval
- set approval evidence
- decide validation pass/fail
- mark unverified work done
- commit
- push
- wake or control other role chats

## Relationship To Earlier Phases

Phase 5 defined read-only scanner behavior.

Phase 6 defined document-only status update boundaries.

This MVP combines those ideas into a limited Supervisor:

```text
read Packets
-> classify visible state
-> detect structural issues
-> generate Handoff-only surfaces
```

It still does not perform implementation automation.

## Current Limitations

- The manifest reader is intentionally simple and expects straightforward YAML-like manifest fields.
- It is not a full YAML engine.
- It treats Packet manifests as the source of truth for generated Dashboard and Queue state. `00_Index.md` remains a human-maintained index and audit summary.
- It checks `00_Index.md` against discovered Packet manifests, but it does not automatically fix index rows.
- It does not schedule itself.
- It does not trigger Codex, ChatGPT, Copilot, or other role chats.
- It does not create new Packets.

## Completion Standard

This Supervisor MVP is considered working when:

- `status` reads all current Packets.
- `scan --role <Role>` filters role-visible work.
- `status --json` returns parseable JSON.
- `write-docs` refuses to write without `--execute`.
- `write-docs --execute` updates Dashboard, role queues, and open violations.
- The generated files show approval waits and structural problems without requiring the human developer to inspect every Packet manually.

## Next Expansion

The first Planner to Developer Handoff Packet candidate was rejected by the human developer and removed before commit:

```text
HANDOFF-20260526-001-m001-projectile-attack-pilot
```

The replacement pilot is:

```text
HANDOFF-20260526-002-skill-shortcut-key-labels
```

It validates the intended flow:

```text
Planner-approved direction
-> Packet visible as Ready work
-> DeveloperPlan written
-> Packet visible as WaitingUserApproval
```

Phase 7C is complete for the replacement pilot. After the human developer approved the DeveloperPlan, the implementation stayed within the listed source file scope, Debug x64 build validation passed, user runtime QA passed, and the Packet moved to `Done`.

Phase 7D is complete: the completed Phase 7A through Phase 7C commits were pushed to `origin/main`.

Phase 8A improves operational status surfaces. The Dashboard and role queues now show review and QA routing as direct sections, and `Handoff_Operational_Status_Policy.md` defines the split between manifest, `00_Index.md`, generated Dashboard, generated Queues, and Violations.

Phase 8B adds read-only Index consistency checks. The Supervisor now reports manifest/index mismatches, stale Packet Index rows, stale Waiting User Approval rows, and missing index visibility for approval waits through `Violations/Open.md`.

Phase 9A defines safe Supervisor automation modes in `Handoff_Supervisor_Automation_Runbook.md`. It prepared the approval boundary before recurring automation creation.

Phase 9B created the approved `playground-handoff-supervisor` Codex recurring automation. It runs every 60 minutes while ACTIVE, may refresh generated Handoff status surfaces, and remains forbidden from source edits, approval evidence, Packet claiming, Done marking, commits, pushes, and role-chat wakeups.

Phase 9C validated the first observed Supervisor automation run. The run refreshed only generated Handoff status surfaces and Handoff status remained clean with 0 consistency issues.

Phase 10A defines the role worker intake contract in `_Docs/Handoff/Role_Workers/`. It tells role chats and future role-worker automation how to inspect Queues, write Intake Decisions, and stop before unsafe execution.

Phase 10B adds a role worker contract check harness under `_Docs/Handoff/Role_Workers/Harness/`. It defines contract checks, blind scenarios, run reports, pass/fail criteria, and recovery rules before real work assignment.

Phase 10C runs a Developer harness-readiness pilot and records Contract Check and Blind Scenario reports. It validates that the harness can produce scorable evidence, but it does not prove that a separate external role chat has internalized the contract.

Phase 11A defines low-risk role work boundaries in `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary.md`. It lists future automation candidate categories and explicitly excludes source, JSON, runtime, asset, approval, claim, `Done`, commit, push, and role-chat control actions.

Phase 11B validates a low-risk Developer role-worker pilot with `HANDOFF-20260527-003-low-risk-role-worker-pilot`. The pilot Packet appeared in the generated Developer Queue as Ready Work, and the Developer role produced an Intake Decision plus a Low-Risk Work Report without source, JSON, runtime, asset, build, approval, claim, `Done`, commit, push, or role-chat control actions.

Phase 11C validates repeatability with a QA role pass on the same pilot Packet. QA applied the same document-only boundary and produced a Low-Risk Work Report without expanding scope.

Phase 12A designs the first future Role Worker automation as one low-risk, document-only recurring automation candidate. The design lives in `_Docs/Handoff/Role_Workers/Role_Worker_Automation_Design.md`, defines allowed inputs, allowed outputs, stop rules, idempotency rules, and Phase 12B approval questions, but does not create the automation.

Phase 12B creates the approved `playground-handoff-role-worker-low-risk` Codex recurring automation in PAUSED status. It uses the same 60-minute cadence as the Handoff Supervisor, may write only timestamped run reports under `_Docs/Handoff/Role_Workers/Automation/Runs/` when activated later, and must not write Packet Results drafts, edit operational status, edit manifests, set approval evidence, claim Packets, mark `Done`, commit, push, or control role chats.

Scheduled automation, role-chat wakeups, source edits outside approved scope, JSON schema edits, and Git operations remain out of scope until explicitly approved later.

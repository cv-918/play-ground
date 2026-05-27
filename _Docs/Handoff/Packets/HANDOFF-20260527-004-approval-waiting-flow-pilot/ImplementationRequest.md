# Implementation Request: Approval Waiting Flow Pilot

## Packet

Handoff ID: HANDOFF-20260527-004-approval-waiting-flow-pilot

Manifest: `manifest.yaml`

## Requested Role

Developer

## Request

Do not implement code yet.

Prepare a Developer approval request that asks whether the user wants to allow a future narrow Handoff Supervisor lint rule for incomplete approval request documents.

The approval request must follow:

- `_Docs/Handoff/Approval_Waiting_Flow.md`
- `_Docs/Handoff/Packets/_Approval_Request_Template.md`
- `_Docs/Handoff/Role_Routines/Developer_Routine.md`

## Proposed Future Work

After approval only, the Developer may investigate and potentially update the Handoff Supervisor so that `WaitingUserApproval` Packets are flagged when the linked request document lacks:

- a substantive user-facing change
- expected file or system scope
- non-goals
- risks
- validation plan
- approve/reject/modify-scope decision options
- suggested user response sentences

## Current Phase 13B Work

For Phase 13B, only create and verify the approval waiting surfaces.

Allowed:

- Handoff Packet documents
- Dashboard, Queue, and Violation generated surfaces
- Handoff index row
- Phase 13B WorkLog

Forbidden:

- `tools/aiworkflow/handoff_supervisor.ps1` edits
- game source edits
- gameplay JSON edits
- runtime behavior changes
- asset changes
- build/test execution
- approval evidence changes
- marking this Packet `Done`
- commit or push unless the user explicitly asks

## Completion Criteria

- Approval request document exists.
- Supervisor surfaces show this Packet as waiting for user approval.
- No consistency issue is reported for this Packet.

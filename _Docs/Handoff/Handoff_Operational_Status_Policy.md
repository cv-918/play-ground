# Handoff Operational Status Policy

## Purpose

This document defines how human-maintained Handoff status files and Supervisor-generated status files should be used together.

It is Phase 8A of the AIWorkflow Handoff Integration.

## Status Surfaces

Use these surfaces with distinct responsibilities:

| Surface | Owner | Purpose |
| --- | --- | --- |
| `_Docs/Handoff/Packets/**/manifest.yaml` | Packet owner | Machine-readable Packet state |
| `_Docs/Handoff/00_Index.md` | Human/Codex operator | Durable table of contents and audit-friendly summary |
| `_Docs/Handoff/Dashboard.md` | Handoff Supervisor | Generated current status board |
| `_Docs/Handoff/Queues/<Role>.md` | Handoff Supervisor | Generated role intake queue |
| `_Docs/Handoff/Violations/Open.md` | Handoff Supervisor | Generated consistency issue report |

## Source Of Truth

The Packet `manifest.yaml` is the source of truth for generated Handoff status.

The Supervisor reads manifests and writes:

- `Dashboard.md`
- `Queues/<Role>.md`
- `Violations/Open.md`

`00_Index.md` is still useful, but it should be treated as a human-readable index, not as the generated-state authority.

## Update Rules

When a Packet state changes:

1. Update the Packet `manifest.yaml`.
2. Update the relevant Packet result/request/completion document.
3. Run `tools\aiworkflow\handoff_supervisor.bat write-docs --execute`.
4. Update `00_Index.md` only when a durable index or audit summary should change.

Generated files should not be hand-edited unless the Supervisor output itself is being corrected and regenerated.

## Index Consistency Rule

`00_Index.md` is human-maintained, so the Supervisor must not rewrite it automatically.

The Supervisor may still check it and report inconsistencies in `Violations/Open.md`.

Report a consistency issue when:

- a Packet manifest exists but `00_Index.md` Packet Index does not list it
- `00_Index.md` Packet Index lists a Handoff ID with no discovered manifest
- `00_Index.md` Packet Index references a missing manifest path
- a Packet is waiting for user approval but `00_Index.md` Waiting User Approval does not list it
- `00_Index.md` Waiting User Approval lists a Packet that is not currently waiting for approval

## Queue Visibility Rule

Role queues must show actionable role states directly, not only in `All Role Packets`.

The generated queues should include separate sections for:

- `Waiting User Approval`
- `Ready Work`
- `In Progress`
- `Review Requested`
- `QA Requested`
- `Blocked`
- `All Role Packets`

## Dashboard Visibility Rule

The Dashboard should show the states a human operator is most likely to ask about without opening every Packet.

The generated Dashboard should include separate sections for:

- `Waiting User Approval`
- `Ready Work`
- `Review Requested`
- `QA Requested`
- `Blocked`
- `Consistency Issues`
- `Recently Done`
- `Packet Index`

## Done And Archive Policy

Use `Done` when a Packet completed its requested flow and still has recent operational value.

Use `Archived` only when a Packet should no longer appear as an active or recently useful operational item.

Do not archive a Packet only to hide unfinished work.

## Safety Boundary

Phase 8A does not allow:

- Source code changes outside an explicitly approved implementation Packet
- Gameplay JSON changes
- JSON schema changes
- Runtime behavior changes
- Build setting changes
- Automatic approval
- Automatic `Done`
- Commit or push automation
- Waking or controlling other role chats

Phase 8A improves visibility and status-surface usability only.

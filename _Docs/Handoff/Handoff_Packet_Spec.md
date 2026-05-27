# Handoff Packet Specification

## Purpose

A Handoff Packet is a structured folder under `_Docs/Handoff/Packets/` that contains one role-to-role work transfer.

Use a Packet when the handoff needs more than one small note, such as planning brief, implementation request, approval request, resource notes, review request, QA request, results, and completion notice.

Small one-off handoffs may still use the existing category folders, but new multi-role or approval-sensitive work should use a Packet.

## Packet Folder Name

Use this format:

```text
HANDOFF-YYYYMMDD-###-short-slug
```

Example:

```text
HANDOFF-20260525-001-attribute-node-tree
```

Rules:

- `YYYYMMDD` is the creation date.
- `###` is a three-digit local sequence for that date.
- `short-slug` uses lowercase ASCII words separated by hyphens.
- The folder name must not change after other documents link to it unless the index is updated in the same change.

## Standard Folder Layout

```text
_Docs/Handoff/Packets/
  HANDOFF-YYYYMMDD-###-short-slug/
    manifest.yaml
    PlanningBrief.md
    ImplementationRequest.md
    ArtRequest.md
    ReviewRequest.md
    QARequest.md
    CompletionNotice.md
    ResourceNotes/
      ResourceNotes.md
    Results/
      PlannerResult.md
      DeveloperPlan.md
      DeveloperResult.md
      ArtistDelivery.md
      ReviewResult.md
      QAResult.md
```

Only create the documents that are needed for the Packet.

`manifest.yaml` is required.

`ResourceNotes/` stores links, usage notes, and delivery instructions. Do not place large binary source assets there unless the user explicitly approves it. Real assets should live in the project resource folders or external asset storage.

## Required Manifest

Every Packet must include:

```text
manifest.yaml
```

The manifest is a lightweight machine-readable summary. It is not a replacement for the full request documents.

Use `_Docs/Handoff/Packets/_Manifest_Template.yaml` as the starting point.

## Status Model

Packet status is split into two responsibilities.

```text
delivery_status = where the handoff is in the role-to-role transfer flow
execution_status = where the receiving role is in planning, approval, execution, review, or completion
```

This split prevents `Ready` from being confused with execution approval.

### Delivery Status Values

- `Draft`: Packet is being prepared.
- `Ready`: Packet is ready for the receiving role to inspect.
- `Claimed`: A role has claimed the Packet.
- `ReviewRequested`: Packet is waiting for review.
- `QARequested`: Packet is waiting for QA.
- `Done`: Handoff delivery is complete.
- `Blocked`: Handoff cannot proceed because information or dependency is missing.
- `Archived`: Packet is inactive or superseded.

### Execution Status Values

- `NotStarted`: No receiving-role work has started.
- `Planning`: The receiving role is planning.
- `WaitingUserApproval`: The receiving role is waiting for explicit human approval.
- `InProgress`: Approved or low-risk work is in progress.
- `ReviewRequested`: Review is requested.
- `QARequested`: QA is requested.
- `Done`: The receiving role has completed its scoped work.
- `Blocked`: Execution is blocked.

### Index Display Mapping

Use this mapping when updating `_Docs/Handoff/00_Index.md`.

| Manifest State | Index Status |
| --- | --- |
| `execution_status: WaitingUserApproval` | `Waiting User Approval` |
| `delivery_status: Draft` | `Draft` |
| `delivery_status: Ready` and execution not started | `Ready` |
| `delivery_status: Claimed` or `execution_status: Planning` | `In Progress` |
| `execution_status: ReviewRequested` | `Review Requested` |
| `execution_status: QARequested` | `QA Requested` |
| `delivery_status: Done` and `execution_status: Done` | `Done` |
| any blocked state | `Blocked` |
| `delivery_status: Archived` | `Archived` |

## Approval Fields

High-risk work must use the manifest approval fields and a human-readable approval request document.

Required manifest fields for approval waiting:

```yaml
risk_level: High
approval_required: true
approval_state: Requested
approval_request_path: Results/DeveloperPlan.md
approval_type:
  - FileModification
  - RuntimeBehavior
```

The approval request must follow the substantive approval request rule from `Handoff_System_Principles.md`.

It must explain the actual proposed change, not only the approval gate name.

Use `Approval_Waiting_Flow.md` for the user-facing decision flow.

The request document must include exact decision options and suggested user response sentences for:

- approval
- rejection
- scope modification

The human developer should not need to infer what to type from a gate label alone.

## Approved Execution Scope

v2 uses a scope-based execution contract.

The manifest should record the approved execution scope separately from a waiting approval request.

```yaml
approved_execution_scope:
  approved: true
  summary: "Implement mapped shortcut labels for in-game and out-game skill widgets."
  approved_by: "HumanDeveloper"
  approved_at: "YYYY-MM-DD"
  approval_source: "chat"
  source_document: "Results/DeveloperPlan.md"

approved_scope_allowed_paths:
  - PlayGround/...

approved_scope_forbidden_paths:
  - _Local/
  - _Temp/
  - .env
  - node_modules/

approved_scope_non_goals:
  - No input remapping redesign.

approved_scope_validation:
  - Build Debug x64.
  - Confirm in-game and out-game skill labels.
```

When `approved_execution_scope.approved` is true, normal source code edits and non-schema data edits inside `approved_scope_allowed_paths` are treated as execution inside the approved task, not as a separate approval point.

If implementation needs a file, system, behavior, schema, lifecycle, build, Git, or workflow change outside the approved scope, the role must stop and request scope expansion.

## AIWorkflow Linkage

A Packet may link to AIWorkflow records, but it does not replace them.

Use the `aiworkflow_links` section for:

- task request
- ActiveTask
- proposal
- decision
- work order
- DevLog

If the Packet conflicts with AIWorkflow, stop and report the conflict.

## Allowed And Forbidden Paths

`allowed_paths` and `forbidden_paths` describe the expected work boundary.

They are not automatic approval.

If execution requires a path outside `allowed_paths`, the role must stop and request scope approval before proceeding.

For v2 execution, prefer `approved_scope_allowed_paths` and `approved_scope_forbidden_paths` when the work has an approved execution scope. Keep `allowed_paths` and `forbidden_paths` as general Packet routing boundaries.

## Packet Completion

A Packet can move to `Done` only when:

- Required approvals are recorded.
- Results are written in `Results/` or `CompletionNotice.md`.
- Validation was performed or explicitly deferred.
- Review and QA requirements were handled or explicitly deferred.
- Remaining risks are recorded.
- Related DevLog exists when the work is meaningful.

Do not mark `Done` only because files were edited.

## Phase 2 Scope

This specification is Phase 2 of AIWorkflow Handoff Integration.

Phase 2 defines Packet structure and manifest fields.

Phase 2 does not implement:

- Role-specific routines
- Read-only scanner automation
- Claim/status automation
- Code, JSON, asset, or runtime execution automation
- Commit or push automation

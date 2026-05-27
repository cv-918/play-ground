# Handoff Status Update Boundaries

## Purpose

This document defines Phase 6 boundaries for document-only Handoff status updates.

Phase 6 answers this question:

```text
If a future assistant is allowed to update Handoff documents, what exactly may it update, and what remains forbidden?
```

This document is a boundary definition. It does not implement automation scripts, scheduled jobs, background watchers, or execution tools.

## Phase 6 Boundary

Phase 6 may allow document-only updates inside `_Docs/Handoff/` when the human developer explicitly asks for that update or when a later approved routine grants that exact permission.

Phase 6 does not allow:

- Source code changes
- Gameplay JSON changes
- JSON schema changes
- Runtime behavior changes
- Build setting changes
- Asset creation or replacement
- Build or test execution
- External service calls
- Git commit or push
- Automatic approval
- Automatic `Done` for unverified work
- Background scheduling

## Allowed Update Categories

Only these document-only Handoff updates may be considered in Phase 6.

### Index Sync

Allowed:

- Add a Packet row to `_Docs/Handoff/00_Index.md`.
- Update a Packet row when the manifest already shows the same state.
- Add or remove an item from `Waiting User Approval` based on the manifest.
- Add a recent done notice when `CompletionNotice.md` exists.

Not allowed:

- Invent status not recorded in the Packet.
- Hide approval waiting work.
- Remove blocked work without evidence.

### Claim Metadata

Allowed:

- Set `current_owner`.
- Set `claimed_by`.
- Set `claimed_at`.
- Set `delivery_status: Claimed`.
- Set `execution_status: Planning`.

Only allowed when:

- The role is listed in `to_roles`, or the human developer explicitly assigns it.
- The Packet is not already claimed by someone else, unless the human developer approves reassignment.

### Planning And Result Document Creation

Allowed:

- Create `Results/DeveloperPlan.md`.
- Create role result documents such as `DeveloperResult.md`, `ArtistDelivery.md`, `ReviewResult.md`, or `QAResult.md`.
- Create an approval request document.
- Create `CompletionNotice.md` only after completion criteria are satisfied or explicitly deferred.

Not allowed:

- Claim validation passed without evidence.
- Mark implementation complete when only a plan exists.

### Approval Waiting Update

Allowed:

- Set `risk_level: High`.
- Set `approval_required: true`.
- Set `approval_state: Requested`.
- Set `execution_status: WaitingUserApproval`.
- Set `approval_request_path`.
- Add the Packet to `Waiting User Approval` in `00_Index.md`.

Only allowed when:

- A substantive approval request exists or is created in the same document-only update.
- The request follows `Approval_Waiting_Flow.md` and includes exact user decision options.

Not allowed:

- Set `approval_state: Approved`.
- Fill `approval_evidence`.
- Treat a planning approval as execution approval.

### Review And QA Routing

Allowed:

- Set `execution_status: ReviewRequested` when a review request exists.
- Set `execution_status: QARequested` when a QA request exists.
- Update `delivery_status` to `ReviewRequested` or `QARequested`.

Not allowed:

- Mark review passed without `ReviewResult.md`.
- Mark QA passed without `QAResult.md`.

### Done Or Archived Update

Allowed:

- Set `delivery_status: Done` and `execution_status: Done` only when completion criteria are met or explicitly deferred.
- Add a recent done notice to `00_Index.md`.
- Set `delivery_status: Archived` only when the Packet is superseded or inactive and the reason is recorded.

Not allowed:

- Mark `Done` when approval, review, QA, validation, or remaining-risk records are missing.
- Archive active approval waiting work.

## Required Update Record

Any non-trivial document/status update should record:

- What changed
- Why it changed
- Which Packet was affected
- Whether approval was required
- Whether approval was recorded
- What was not changed
- Remaining risks

Use `_Docs/Handoff/Status_Updates/_Status_Update_Record_Template.md` as the record format.

For small same-document corrections, the update can be described in the Packet result or DevLog instead.

## Human Approval Rules

Phase 6 does not remove approval requirements.

Human approval is still required before:

- Source code implementation
- JSON schema changes
- Runtime behavior changes
- Build/test execution
- Commit or push
- Workflow rule changes outside the approved Phase 6 scope

Approval must be explicit and scoped.

## Scanner Relationship

Phase 5 scanner reports may recommend updates.

Phase 6 status update behavior may apply updates only when:

- The human developer asks for the update, or
- A later approved routine explicitly grants that exact document-only update permission.

Scanner reports alone are not permission to write files.

## Phase 6 Completion Standard

Phase 6 is complete when:

- Status update boundaries are documented.
- Allowed and forbidden updates are clear.
- Update record templates exist.
- Handoff guide and index link to the boundary document.

Phase 6 is not complete if it adds actual automation scripts or expands execution permissions.

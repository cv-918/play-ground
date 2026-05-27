# Planning Brief: Approval Waiting Flow Pilot

## Packet

Handoff ID: HANDOFF-20260527-004-approval-waiting-flow-pilot

Manifest: `manifest.yaml`

## Document Type

PlanningBrief

## From

Role: Planner

## To

Role: Developer

## Summary

Validate Phase 13A by creating a real `WaitingUserApproval` Packet that the Handoff Dashboard, Index, manifest, and approval request document can all point to.

The proposed future work is useful but not yet approved:

```text
Add a narrow Handoff Supervisor consistency check for incomplete approval request documents.
```

This Packet must not implement that future work. It exists to verify that approval waiting is visible and actionable.

## Scope

- Create a Packet with `execution_status: WaitingUserApproval`.
- Link a substantive approval request at `Results/DeveloperPlan.md`.
- Make the request explain the real proposed future change.
- Give the user approve, reject, and scope-modification choices.
- Regenerate Supervisor surfaces so the waiting approval appears in Dashboard and role Queue output.

## Non-Goals

- No Supervisor tool code changes.
- No game source changes.
- No gameplay JSON changes.
- No runtime behavior changes.
- No asset changes.
- No build or runtime validation.
- No automatic approval evidence.
- No automatic `Done`.
- No commit or push for Phase 13B unless the user explicitly asks.

## Acceptance Criteria

- `_Docs/Handoff/Dashboard.md` lists this Packet under `Waiting User Approval`.
- `_Docs/Handoff/00_Index.md` lists this Packet under `Waiting User Approval`.
- `manifest.yaml` records `approval_required: true`, `approval_state: Requested`, and `approval_request_path`.
- `Results/DeveloperPlan.md` follows `Approval_Waiting_Flow.md`.
- Supervisor reports zero consistency issues for this Packet.

## Next Actions

- Developer does not implement.
- User reviews `Results/DeveloperPlan.md`.
- User chooses approve, reject, or modify scope for the proposed future Supervisor lint work.

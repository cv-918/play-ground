# Role Worker Intake Decision

## Role


## Handoff ID


## Queue Section

Waiting User Approval / Ready Work / In Progress / Review Requested / QA Requested / Blocked

## Packet Status

- Delivery Status:
- Execution Status:
- Approval Required:
- Approval State:

## Documents Read

- `Dashboard.md`
- `Queues/<Role>.md`
- `Packets/<handoff-id>/manifest.yaml`
- Additional role-specific document:

## Target Role Check

Is this role a valid target, owner, reviewer, or QA role for this Packet?

Result:

## Approval Check

Is additional human approval required before execution?

Result:

## Allowed Next Action


## Forbidden Actions

- Source code edits:
- Gameplay JSON edits:
- Runtime behavior changes:
- Asset edits:
- Build/test execution:
- Approval evidence changes:
- Packet claim:
- Done marking:
- Commit/push:

## Stop Condition


## Decision

Proceed to planning / Wait for user approval / Report blocker / Ignore as not my role / Request correction

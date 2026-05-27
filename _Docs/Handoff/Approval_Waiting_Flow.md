# Handoff Approval Waiting Flow

## Purpose

This document defines the Phase 13A user-facing approval waiting flow for the AI Role Handoff System.

The goal is simple:

```text
When a Packet waits for approval, the human developer should be able to tell what decision is needed without reading every Handoff file.
```

## Approval Visibility Path

Approval waits must be visible in this order:

1. `_Docs/Handoff/Dashboard.md`
2. `_Docs/Handoff/00_Index.md`
3. The Packet `manifest.yaml`
4. The linked approval request document, usually under `Results/`

The Dashboard and Index are navigation surfaces.

The approval request document is the decision surface.

## Required Waiting State

A Packet waiting for human approval must have:

```yaml
execution_status: WaitingUserApproval
approval_required: true
approval_state: Requested
approval_request_path: Results/<Role>Plan.md
approval_type:
  - FileModification
  - RuntimeBehavior
```

The exact approval types may differ by task.

## Dashboard And Index Rule

The waiting row must show:

- Handoff ID
- responsible role
- title
- approval request path
- last updated date

If the row does not tell the human developer where to read the request, the approval wait is incomplete.

## Approval Request Document Rule

The approval request document must be readable as a decision memo.

It must include:

- what will actually change
- why the change is needed
- what the player, workflow, data, or repository will experience differently
- expected files or paths
- files or paths not allowed
- data/schema impact
- runtime impact
- validation plan
- risks
- exact decision options
- example approval sentence

Do not ask for approval with only:

```text
Code change approval required.
Runtime behavior approval required.
```

Those are gate labels, not decision content.

## Decision Options

The human developer has three normal choices:

### Approve

Use when the proposed change and scope are acceptable.

Recommended sentence:

```text
<Handoff ID> <Request Document> 승인. 제안된 범위와 검증 계획대로 진행해.
```

### Reject

Use when the proposed change should not proceed.

Recommended sentence:

```text
<Handoff ID> <Request Document> 거절. 이 변경은 진행하지 마.
```

### Modify Scope

Use when the idea is acceptable but the scope must change.

Recommended sentence:

```text
<Handoff ID> <Request Document> 범위 수정. <허용할 것>만 진행하고 <금지할 것>은 하지 마.
```

## Approval Scope Rule

Approval applies only to the described scope.

If implementation discovers a needed file, behavior, schema, asset, build step, or validation action outside the approved scope, the role must stop and request expanded approval.

## Approval Evidence Rule

Only an explicit human decision can become approval evidence.

A planning approval is not implementation approval.

A `Ready` Packet is not implementation approval.

An automation run report is not implementation approval.

## Supervisor Lint Rule

Phase 13C adds a narrow Supervisor lint for approval request documents.

When a Packet waits for user approval, Supervisor may report a consistency issue if the linked request document is missing required Phase 13A sections or the approve/reject/modify-scope decision options.

This lint checks structure and obvious omissions. It does not judge writing style or automatically approve, reject, complete, or modify the Packet.

## User Action Summary

When the human developer asks what to do with a waiting approval, the assistant should answer in this order:

1. say what the change would do
2. say what files or systems are in scope
3. say what is explicitly out of scope
4. say the risks
5. give the three decision options
6. provide a copyable approval, rejection, or scope-modification sentence

## Completion Standard

Phase 13A is complete when:

- the approval visibility path is documented
- required waiting state is documented
- approval request templates include user decision guidance
- role routines point to this flow
- the user-facing guide records Phase 13A completion

# Approval Request: Title

## Packet

Handoff ID:

Manifest:

## Approval Required

Yes

## Approval Type

- FileModification
- RuntimeBehavior

## User-Facing Change

Describe what will change from the human developer, player, game, workflow, data, or repository point of view.

## Intent

Explain why this change is needed.

## Proposed Behavior

Describe the behavior or workflow that will exist after the change.

## Data Changes

-

## Code Changes

-

## Files Expected To Change

-

## Files Not Allowed To Touch

-

## Non-Goals

-

## Risks

-

## Validation Plan

-

## Decision Needed

Choose one:

- Approve
- Reject
- Modify Scope

## Suggested User Response

Approve:

```text
<Handoff ID> <Request Document> 승인. 제안된 범위와 검증 계획대로 진행해.
```

Reject:

```text
<Handoff ID> <Request Document> 거절. 이 변경은 진행하지 마.
```

Modify Scope:

```text
<Handoff ID> <Request Document> 범위 수정. <허용할 것>만 진행하고 <금지할 것>은 하지 마.
```

## Approval Scope

Approval applies only to the proposed scope in this document.

If additional files, data/schema changes, runtime behavior, assets, build steps, validation actions, commit, or push become necessary, stop and request expanded approval.

## Approved Execution Scope To Record

If approved, record the scope in `manifest.yaml`:

```yaml
approved_execution_scope:
  approved: true
  summary: ""
  approved_by: "HumanDeveloper"
  approved_at: "YYYY-MM-DD"
  approval_source: "chat"
  source_document: "Results/<Role>Plan.md"

approved_scope_allowed_paths:
  -

approved_scope_forbidden_paths:
  -

approved_scope_non_goals:
  -

approved_scope_validation:
  -
```

## Before Approval I Will Not

- Modify source code.
- Modify gameplay JSON or schema.
- Change runtime behavior.
- Change assets.
- Run build/test as completion evidence.
- Set approval evidence.
- Claim approval from planning approval.
- Mark work `Done`.
- Commit or push.

## Stop Rule

If approval is not explicit, stop. Do not modify source code, JSON schema, runtime behavior, build settings, or Git state.

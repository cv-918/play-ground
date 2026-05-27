# Approval Request: Add Supervisor Lint For Incomplete Approval Requests

## Packet

Handoff ID: HANDOFF-20260527-004-approval-waiting-flow-pilot

Manifest: `manifest.yaml`

## Approval Required

Yes.

## Approval Type

- FileModification
- ToolBehavior
- WorkflowRule

## User-Facing Change

The Handoff Supervisor would warn when an approval-waiting Packet does not give the user enough information to decide.

In practice, a future Dashboard or Violations report could say:

```text
This Packet is waiting for approval, but its request document is missing decision options or suggested user response sentences.
```

## Intent

Phase 13A made approval requests clearer on paper.

The proposed future change would make Supervisor check that rule so unclear approval requests are not silently accepted as valid Handoff state.

## Proposed Behavior

After approval, the Developer may add a narrow check to the Handoff Supervisor.

When a Packet has:

```yaml
execution_status: WaitingUserApproval
approval_required: true
approval_state: Requested
```

Supervisor should inspect the linked `approval_request_path` document and report a consistency issue if the document is missing core decision content.

The check should stay conservative. It should identify clearly incomplete requests, not judge writing style.

## Data Changes

None.

No gameplay JSON, save/load data, or schema files are in scope.

## Code Changes

Potentially in scope after approval:

- `tools/aiworkflow/handoff_supervisor.ps1`

Potential documentation updates after approval:

- `_Docs/Handoff/Handoff_Supervisor_MVP.md`
- `_Docs/Handoff/Handoff_Supervisor_MVP_KR.md`
- `_DevLog/WorkLog/`

## Files Expected To Change

- `tools/aiworkflow/handoff_supervisor.ps1`
- `_Docs/Handoff/Handoff_Supervisor_MVP.md`
- `_Docs/Handoff/Handoff_Supervisor_MVP_KR.md`
- `_DevLog/WorkLog/<date>_Handoff_Phase13C_Approval_Request_Lint.md`

## Files Not Allowed To Touch

- `PlayGround/`
- gameplay JSON files
- asset/resource files
- `_Docs/AIWorkflow/`
- `_Local/`
- `_Temp/`
- `.env`
- `node_modules/`

## Non-Goals

- No game behavior changes.
- No gameplay data changes.
- No build setting changes.
- No automatic approval.
- No approval evidence writing.
- No automatic `Done` or `Archived` status.
- No role chat control.
- No commit or push automation.

## Risks

- A too-strict lint check could create noisy false positives.
- A too-loose check would not catch unclear approval requests.
- The implementation must not read or modify files outside the Handoff approval request path except for the Supervisor-generated surfaces.

## Validation Plan

After approval and implementation only:

- Run `tools\aiworkflow\handoff_supervisor.bat status`.
- Run `tools\aiworkflow\handoff_supervisor.bat write-docs --execute`.
- Confirm this valid approval request does not create a false violation.
- Create or use a document-only incomplete approval request fixture if needed, then confirm Supervisor reports it as a consistency issue.
- Run `git diff --check` on touched files.

No game build or runtime validation is expected for this workflow-tool change.

## Decision Needed

Choose one:

- Approve
- Reject
- Modify Scope

## Suggested User Response

Approve:

```text
HANDOFF-20260527-004-approval-waiting-flow-pilot Results/DeveloperPlan.md 승인. 제안된 범위와 검증 계획대로 진행해.
```

Reject:

```text
HANDOFF-20260527-004-approval-waiting-flow-pilot Results/DeveloperPlan.md 거절. 이 변경은 진행하지 마.
```

Modify Scope:

```text
HANDOFF-20260527-004-approval-waiting-flow-pilot Results/DeveloperPlan.md 범위 수정. <허용할 것>만 진행하고 <금지할 것>은 하지 마.
```

## Approval Scope

Approval applies only to the future Supervisor lint scope described in this document.

If additional files, workflow rules, automation behavior, build/test actions, commit, or push become necessary, stop and request expanded approval.

## Before Approval I Will Not

- Edit `tools/aiworkflow/handoff_supervisor.ps1`.
- Modify source code under `PlayGround/`.
- Modify gameplay JSON or schema.
- Change runtime behavior.
- Change assets.
- Run build/test as completion evidence.
- Set approval evidence.
- Treat planning approval as implementation approval.
- Mark this Packet `Done`.
- Commit or push.

## Stop Rule

If approval is not explicit, stop. Do not modify Supervisor code, source code, JSON schema, runtime behavior, build settings, approval evidence, or Git state.

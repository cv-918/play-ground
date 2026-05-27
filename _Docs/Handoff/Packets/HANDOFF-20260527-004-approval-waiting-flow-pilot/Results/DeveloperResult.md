# Developer Result: Approval Request Lint

## Packet

Handoff ID: HANDOFF-20260527-004-approval-waiting-flow-pilot

Manifest: `../manifest.yaml`

## Summary

Implemented a narrow Handoff Supervisor lint for incomplete approval request documents.

The lint runs only for Packets that are waiting for approval:

```yaml
execution_status: WaitingUserApproval
```

or:

```yaml
approval_state: Requested
```

## Files Changed

- `tools/aiworkflow/handoff_supervisor.ps1`
- `_Docs/Handoff/Handoff_Supervisor_MVP.md`
- `_Docs/Handoff/Handoff_Supervisor_MVP_KR.md`
- `_Docs/Handoff/Approval_Waiting_Flow.md`
- `_Docs/Handoff/Approval_Waiting_Flow_KR.md`
- `_Docs/Handoff/Guide/Handoff_System_User_Guide_KR.html`
- `_Docs/Handoff/Packets/HANDOFF-20260527-004-approval-waiting-flow-pilot/`
- `_DevLog/WorkLog/2026-05-27_Handoff_Phase13C_Approval_Request_Lint.md`

## Behavior

When a waiting approval has a linked `approval_request_path`, Supervisor now checks that the linked request document includes the standard Phase 13A decision sections:

- `User-Facing Change`
- `Proposed Behavior`
- `Files Expected To Change`
- `Files Not Allowed To Touch`
- `Non-Goals`
- `Risks`
- `Validation Plan`
- `Decision Needed`
- `Suggested User Response`
- `Before Approval I Will Not`

Supervisor also checks that the request document shows all three user decision options:

- approve
- reject
- modify scope

## Validation

Validated with:

```bat
tools\aiworkflow\handoff_supervisor.bat status
tools\aiworkflow\handoff_supervisor.bat scan --role Developer
```

The valid `DeveloperPlan.md` did not create a false positive.

An isolated temporary validation fixture with an intentionally incomplete approval request produced two expected consistency issues:

- missing required Phase 13A sections
- missing approve/reject/modify-scope decision options

## Boundaries

No game source, gameplay JSON, runtime behavior, assets, build settings, AIWorkflow docs, automatic approval, role-chat control, commit, or push behavior was changed.

## Remaining Risk

The lint is intentionally narrow. It catches clearly incomplete approval requests, but it does not judge the quality of every sentence.

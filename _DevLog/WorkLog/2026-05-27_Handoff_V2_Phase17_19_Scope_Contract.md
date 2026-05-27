# Handoff v2 Phase 17/19 Scope Contract

## Summary

Defined the v2 approved execution scope contract for Handoff Packets and updated Developer/Role Worker routines to use scope-based execution instead of per-file source approval.

## Phase Coverage

- Phase 17: Scope Contract
- Phase 19: Developer Execution Routine v2

## Scope

Documentation and templates only.

No game source, gameplay JSON, assets, build settings, automation status, commits, or pushes were changed by this phase work.

## Files Changed

- `AGENTS.md`
- `_Docs/Handoff/Packets/_Manifest_Template.yaml`
- `_Docs/Handoff/Packets/_Approval_Request_Template.md`
- `_Docs/Handoff/Packets/_Approval_Request_Template_KR.md`
- `_Docs/Handoff/Handoff_Packet_Spec.md`
- `_Docs/Handoff/Handoff_Packet_Spec_KR.md`
- `_Docs/Handoff/Handoff_System_Principles.md`
- `_Docs/Handoff/Handoff_System_Principles_KR.md`
- `_Docs/Handoff/Handoff_V2_Scope_Based_Execution_Principle.md`
- `_Docs/Handoff/Handoff_V2_Scope_Based_Execution_Principle_KR.md`
- `_Docs/Handoff/Role_Routines/Developer_Routine.md`
- `_Docs/Handoff/Role_Routines/Role_Routine_Overview.md`
- `_Docs/Handoff/Role_Workers/Role_Worker_Intake_Contract.md`
- `_Docs/Handoff/Role_Workers/Role_Worker_Intake_Contract_KR.md`
- `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary.md`
- `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary_KR.md`
- `_Docs/Handoff/Role_Workers/Harness/_Contract_Check_Template.md`
- `_Docs/Handoff/Role_Workers/Harness/_Contract_Check_Template_KR.md`
- `_Docs/Handoff/Role_Workers/Harness/_Blind_Scenario_Template.md`
- `_Docs/Handoff/Role_Workers/Harness/_Blind_Scenario_Template_KR.md`

## Contract

New manifest fields:

```yaml
approved_execution_scope:
  approved: false
  summary: ""
  approved_by: ""
  approved_at: ""
  approval_source: ""
  source_document: ""

approved_scope_allowed_paths: []
approved_scope_forbidden_paths: []
approved_scope_non_goals: []
approved_scope_validation: []
```

If `approved_execution_scope.approved` is true, normal source code edits and non-schema data edits inside `approved_scope_allowed_paths` are part of execution.

## Validation

Commands run:

- `tools\aiworkflow\handoff_supervisor.bat status`
- `tools\aiworkflow\handoff_supervisor.bat scan --role Developer`
- `tools\aiworkflow\handoff_supervisor.bat status --json`
- `git diff --check -- AGENTS.md _Docs\Handoff tools\aiworkflow\handoff_supervisor.ps1 _DevLog\WorkLog\2026-05-27_Handoff_V2_Scope_Based_Execution_Principle.md _DevLog\WorkLog\2026-05-27_Handoff_V2_Phase17_19_Scope_Contract.md _DevLog\WorkLog\2026-05-27_Handoff_V2_Phase18_20_Supervisor_Scope_Checks.md`

Results:

- Supervisor read 4 Packets.
- Active Packets: 0.
- Waiting Approval: 0.
- Consistency Issues: 0.
- JSON status output included approved scope, missing scope, and scope drift counts.
- `git diff --check` reported no whitespace errors. Git printed normal CRLF conversion warnings only.

# Handoff v2 Phase 18/20 Supervisor Scope Checks

## Summary

Updated the Handoff Supervisor to understand approved execution scope state and to report suspected scope drift from Git changed-file paths.

## Phase Coverage

- Phase 18: Scope-Aware Supervisor
- Phase 20: Scope Drift Check

## Scope

Changed the Handoff Supervisor script, generated Handoff surfaces, and Supervisor documentation.

No game source, gameplay JSON, assets, build settings, approval evidence, commits, or pushes are changed by Supervisor execution.

The existing `playground-handoff-supervisor` recurring automation prompt was updated in Codex app settings so its fixed report format includes approved scope, missing scope, and scope drift counts.

## Implementation Notes

The Supervisor now reads:

- `approved_execution_scope.approved`
- `approved_execution_scope.summary`
- `approved_execution_scope.source_document`
- `approved_scope_allowed_paths`
- `approved_scope_forbidden_paths`

It reports:

- `Scope Status`
- approved execution scope count
- missing execution scope count
- scope drift issue count
- suspected changed files outside active approved scope
- suspected changed files under forbidden paths

The drift check reads changed-file paths from Git but does not inspect or edit file contents.

## Files Changed

- `tools/aiworkflow/handoff_supervisor.ps1`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Handoff_Supervisor_MVP.md`
- `_Docs/Handoff/Handoff_Supervisor_MVP_KR.md`
- `_Docs/Handoff/Handoff_Supervisor_Automation_Runbook.md`
- `_Docs/Handoff/Handoff_Supervisor_Automation_Runbook_KR.md`
- `_Docs/Handoff/Handoff_Operations_Checklist_KR.md`
- `_Docs/Handoff/Guide/Handoff_System_User_Guide_KR.html`

## Validation

Commands run:

- `tools\aiworkflow\handoff_supervisor.bat status`
- `tools\aiworkflow\handoff_supervisor.bat scan --role Developer`
- `tools\aiworkflow\handoff_supervisor.bat status --json`
- `tools\aiworkflow\handoff_supervisor.bat write-docs --execute`
- `git diff --check -- AGENTS.md _Docs\Handoff tools\aiworkflow\handoff_supervisor.ps1 _DevLog\WorkLog\2026-05-27_Handoff_V2_Scope_Based_Execution_Principle.md _DevLog\WorkLog\2026-05-27_Handoff_V2_Phase17_19_Scope_Contract.md _DevLog\WorkLog\2026-05-27_Handoff_V2_Phase18_20_Supervisor_Scope_Checks.md`

Results:

- Supervisor read 4 Packets.
- Active Packets: 0.
- Waiting Approval: 0.
- Approved Scopes: 0.
- Missing Scopes: 0.
- Scope Drift Issues: 0.
- Consistency Issues: 0.
- `write-docs --execute` regenerated Dashboard, Queues, and Open Violations with scope status columns/counts.
- `git diff --check` reported no whitespace errors. Git printed normal CRLF conversion warnings only.

## Remaining Risk

No active approved Packet existed during validation, so the scope drift branch was validated for safe no-false-positive behavior, not with a live drift fixture.

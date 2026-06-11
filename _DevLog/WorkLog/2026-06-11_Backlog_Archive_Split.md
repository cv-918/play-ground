# Active Backlog / Archive Split

Date: 2026-06-11
Status: completed

## Summary

Split the large workflow Backlog into:

```text
_Docs/AIWorkflow/Backlog.md         active/open + parked/deferred rows
_Docs/AIWorkflow/BacklogArchive.md  completed/done row history
```

This preserves completed task evidence while making day-to-day planning readable.

## Behavior

`Backlog.md` now contains:

```text
Active Backlog Items: todo / in_progress / other non-done and non-deferred rows
Parked / Deferred Items: deferred rows
Archive Location: pointer to BacklogArchive.md
```

`BacklogArchive.md` contains:

```text
Archived Done Items: all done rows moved out of active Backlog
```

At split time:

```text
active rows: 5
deferred rows: 5
archived done rows: 125
combined rows: 135
```

## Tooling Added

Added consistency check:

```bat
tools\aiworkflow\backlog_archive_consistency_check.bat
```

The check validates:

```text
- Backlog.md has Active Backlog Items and Parked / Deferred Items sections
- Backlog.md points to BacklogArchive.md
- BacklogArchive.md has Archived Done Items
- no done rows remain in active Backlog.md
- no non-done rows are archived
- task IDs are unique across Backlog + Archive
- ActiveTask task_id, if set, exists in Backlog or Archive
- Backlog.md still has active and deferred rows
```

## Additional Fix Found During Verification

While validating the split, `role_router_status.bat` misread empty YAML scalars in `ActiveTask.md` because the regex used `\s`, which can consume newlines in .NET regex.

Fix:

```text
role_router_status.ps1 Get-Scalar now matches only spaces/tabs around `key:`.
```

Before:

```text
ID: title:
Title: status:
Status: workflow_path:
```

After:

```text
ID:
Title:
Status:
Workflow Path:
```

## Docs Updated

Updated references to the state-source contract:

```text
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/09_Operational_Playbook.md
_Docs/AIWorkflow/Workflow_Document_Authority_Map.md
_Docs/AIWorkflow/State_Tool_Schema_Map.md
_Docs/AIWorkflow/ProjectStatus.md
tools/aiworkflow/README.md
```

## Validation

Commands run:

```bat
tools\aiworkflow\backlog_archive_consistency_check.bat
tools\aiworkflow\workflow_status.bat
tools\aiworkflow\workflow_status.bat --json
tools\aiworkflow\role_router_status.bat
git diff --check
```

Results:

```text
PASS backlog split structure
PASS active/archive status partition
PASS combined task id integrity
PASS active task reference integrity
PASS active backlog row availability
Rows: active=5, deferred=5, archived=125, combined=135
```

`workflow_status` now reports 5 open rows from the active Backlog. `role_router_status` no longer misparses empty ActiveTask metadata.

`git diff --check` passed with line-ending warnings only.

## Notes

This change intentionally does not delete completed task history. It only moves done rows to the archive.

Historical tools that need current task selection should continue reading `Backlog.md`. Completed task lookup for human review should use `BacklogArchive.md`.

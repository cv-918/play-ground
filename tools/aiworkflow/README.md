# AIWorkflow Local Scripts v1

## Purpose

This folder contains local helper scripts for the AI Orchestrator workflow.

These scripts are designed for safe, human-supervised operation.

They do not edit source code.
They do not commit.
They do not push.
They do not run Copilot.
They do not decide validation pass/fail.

---

## Scripts

```text
status.bat
capture_diff.bat
json_smoke_check.bat
run_result_semantics_check.bat
workflow_status.bat
role_router_status.bat
project_profile_status.bat
active_project_status.bat
task_workspace_manager.bat
session_supervisor.bat
```

---

## status.bat

Read-only repository/workflow status.

```bat
tools\aiworkflow\status.bat
```

---

## capture_diff.bat

Captures review-ready diff files under `_Temp\AIWorkflowDiffs\`.

```bat
tools\aiworkflow\capture_diff.bat
tools\aiworkflow\capture_diff.bat --include-untracked
tools\aiworkflow\capture_diff.bat --staged
```

Use `--include-untracked` when newly created files must appear in the diff.

---

## json_smoke_check.bat

Parses JSON files under `PlayGround\Data`.

```bat
tools\aiworkflow\json_smoke_check.bat
```

Reports are written under `_Temp\AIWorkflowReports\`.

---

## run_result_semantics_check.bat

Validates reduced-scope GAME-002 run result semantics without booting the game runtime and without reading or writing `PlayGround\Data\UserData.json`.

```bat
tools\aiworkflow\run_result_semantics_check.bat
```

Expected output includes PASS lines for `TimeExpired`, `PlayerDied`, `StageProgressed`, `Abandoned`, duplicate apply guard, stage progression conditions, and reward/save eligibility.

---

## workflow_status.bat

Summarizes workflow state from:

```text
_Docs\AIWorkflow\ProjectStatus.md
_Docs\AIWorkflow\Backlog.md
_Docs\AIWorkflow\ActiveTask.md
git status
```

Human-readable output:

```bat
tools\aiworkflow\workflow_status.bat
```

JSON output for future Discord integration:

```bat
tools\aiworkflow\workflow_status.bat --json
```

---

## role_router_status.bat

Reads `_Docs\AIWorkflow\ActiveTask.md`, the matching `Backlog.md` row when
available, and the durable AIWorkflow policy documents. It prints a read-only
role routing recommendation for the current active task.

Human-readable output:

```bat
tools\aiworkflow\role_router_status.bat
```

JSON output for future Discord/manual integration:

```bat
tools\aiworkflow\role_router_status.bat --json
```

Output includes the active task summary, recommended roles, role rationale,
human decision gates, required validation checks, suggested execution route,
verdict format reminder, and next manual action.

This command does not execute agents, approve tasks, mark tasks done, modify
source files, change Discord command behavior, commit, push, or write local
configuration.

---

## project_profile_status.bat

Reads project profile JSON files from:

```text
_Docs\AIWorkflow\ProjectProfiles\
```

Default behavior now resolves the selected profile from:

```text
_Docs\AIWorkflow\ActiveProject.json
```

List available profiles:

```bat
tools\aiworkflow\project_profile_status.bat --list
```

Active project profile summary:

```bat
tools\aiworkflow\project_profile_status.bat
```

Specific project profile:

```bat
tools\aiworkflow\project_profile_status.bat --project unity_project_template
```

JSON output:

```bat
tools\aiworkflow\project_profile_status.bat --json
tools\aiworkflow\project_profile_status.bat --project unity_project_template --json
```

---

## active_project_status.bat

Reads and validates:

```text
_Docs\AIWorkflow\ActiveProject.json
```

Human-readable output:

```bat
tools\aiworkflow\active_project_status.bat
```

JSON output:

```bat
tools\aiworkflow\active_project_status.bat --json
```

This confirms whether the active project selector points to an existing project profile and whether the profile's `project_id` matches `active_project_id`.

---

## task_workspace_manager.bat

Creates and inspects task-scoped runtime workspace records under:

```text
_Temp\AIWorkflowRuntime\tasks\<task_id>\
```

Commands:

```bat
tools\aiworkflow\task_workspace_manager.bat status [task_id] [--json]
tools\aiworkflow\task_workspace_manager.bat create task_id [--json]
tools\aiworkflow\task_workspace_manager.bat read task_id [--json]
```

The manager links runtime workspace state to the existing task lifecycle layer
with `task_id`. It does not execute Codex, run build/test commands, migrate
task state, approve tasks, mark tasks done, commit, or push.

---

## session_supervisor.bat

Creates, reads, updates, and heartbeats SessionState records inside a WF-202
task workspace.

Commands:

```bat
tools\aiworkflow\session_supervisor.bat status task_id [session_id] [--json]
tools\aiworkflow\session_supervisor.bat create task_id [session_id] [--executor value] [--activity text] [--json]
tools\aiworkflow\session_supervisor.bat read task_id session_id [--json]
tools\aiworkflow\session_supervisor.bat update task_id session_id --status value [--activity text] [--json]
tools\aiworkflow\session_supervisor.bat heartbeat task_id session_id [--status value] [--activity text] [--json]
```

The supervisor records runtime session metadata only. It does not execute
Codex, spawn processes, run build/test commands, collect evidence, verify
results, approve tasks, mark tasks done, commit, or push.

---

## Recommended Check

From repository root:

```bat
tools\aiworkflow\status.bat
tools\aiworkflow\workflow_status.bat
tools\aiworkflow\role_router_status.bat
tools\aiworkflow\role_router_status.bat --json
tools\aiworkflow\active_project_status.bat
tools\aiworkflow\active_project_status.bat --json
tools\aiworkflow\project_profile_status.bat
tools\aiworkflow\project_profile_status.bat --json
tools\aiworkflow\task_workspace_manager.bat status
tools\aiworkflow\task_workspace_manager.bat status --json
tools\aiworkflow\session_supervisor.bat status WF-20260508-101245 --json
tools\aiworkflow\capture_diff.bat --include-untracked
tools\aiworkflow\json_smoke_check.bat
tools\aiworkflow\run_result_semantics_check.bat
```

Do not commit generated `_Temp` outputs.

Recommended `.gitignore` entry:

```text
_Temp/
```

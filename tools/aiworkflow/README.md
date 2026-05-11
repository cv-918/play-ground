# AIWorkflow Local Scripts v1

## Purpose

This folder contains local helper scripts for the AI Orchestrator workflow.

These scripts are designed for safe, human-supervised operation.

They do not edit source code.
They do not commit.
They do not push.
They do not run Copilot.
They do not decide validation pass/fail.

`codex_cli_adapter.bat` is the exception that can run Codex CLI when local
config explicitly enables it and the operator passes `run --execute`.
`local_cli_adapter.bat` is the exception that can run allowlisted local
commands by `command_id` when local config explicitly enables it and the
operator passes `run --execute`.

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
evidence_collector.bat
codex_cli_adapter.bat
local_cli_adapter.bat
file_watcher.bat
runtime_control_adapter.bat
result_collector.bat
diff_analyzer.bat
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

JSON `status` output includes task-level `runtime_summary` data for
`/tasks`-style displays. JSON `read` output includes `session_detail` data and
recent ProgressEventLog entries for `/task`-style displays. Idle/stalled state
is computed for display only; it does not control execution.

---

## evidence_collector.bat

Creates, reads, updates, and lists EvidenceRecord runtime artifacts linked to a
WF-203 session.

Commands:

```bat
tools\aiworkflow\evidence_collector.bat status task_id session_id [--json]
tools\aiworkflow\evidence_collector.bat create task_id session_id [evidence_id] [--executor value] [--command-line text] [--working-directory path] [--started-at iso] [--ended-at iso] [--exit-code n] [--stdout-log path] [--stderr-log path] [--changed-files "a;b"] [--diff-snapshot path] [--json]
tools\aiworkflow\evidence_collector.bat read task_id session_id evidence_id [--json]
tools\aiworkflow\evidence_collector.bat update task_id session_id evidence_id [--executor value] [--command-line text] [--working-directory path] [--started-at iso] [--ended-at iso] [--exit-code n] [--stdout-log path] [--stderr-log path] [--changed-files "a;b"] [--diff-snapshot path] [--json]
```

`--changed-files` accepts semicolon- or comma-separated repository-relative
path references.

The collector stores evidence metadata only. It does not execute Codex, spawn
processes, run build/test commands, verify results, decide pass/fail, approve
tasks, mark tasks done, commit, or push.

---

## codex_cli_adapter.bat

Runs a configured Codex CLI command as a guarded runtime session.

Tracked example config:

```text
tools\aiworkflow\codex_cli_adapter.example.json
```

Recommended local config:

```text
_Local\AIWorkflow\codex_cli_adapter.local.json
```

Commands:

```bat
tools\aiworkflow\codex_cli_adapter.bat status task_id [--config path] [--prompt-file path] [--json]
tools\aiworkflow\codex_cli_adapter.bat dry-run task_id [--config path] [--prompt-file path] [--json]
tools\aiworkflow\codex_cli_adapter.bat run task_id --execute [--config path] [--prompt-file path] [--session-id id] [--evidence-id id] [--json]
```

Real execution requires both `run --execute` and config `enabled: true`. The
adapter records SessionState and EvidenceRecord runtime artifacts, but it does
not verify results, decide pass/fail, approve tasks, mark tasks done, commit,
or push.

---

## local_cli_adapter.bat

Runs a configured local command by allowlisted `command_id` as a guarded
runtime session.

Tracked example config:

```text
tools\aiworkflow\local_cli_adapter.example.json
```

Recommended local config:

```text
_Local\AIWorkflow\local_cli_adapter.local.json
```

Commands:

```bat
tools\aiworkflow\local_cli_adapter.bat status task_id command_id [--config path] [--json]
tools\aiworkflow\local_cli_adapter.bat dry-run task_id command_id [--config path] [--json]
tools\aiworkflow\local_cli_adapter.bat run task_id command_id --execute [--config path] [--session-id id] [--evidence-id id] [--json]
```

Real execution requires `run --execute`, config `enabled: true`, and an enabled
allowlisted command entry. The adapter does not accept arbitrary shell command
strings, verify results, decide pass/fail, approve tasks, mark tasks done,
commit, or push.

---

## file_watcher.bat

Observes changed files, writes git diff snapshots, and links the observation to
EvidenceRecord and ProgressEventLog runtime artifacts.

Tracked example config:

```text
tools\aiworkflow\file_watcher.example.json
```

Recommended local config:

```text
_Local\AIWorkflow\file_watcher.local.json
```

Commands:

```bat
tools\aiworkflow\file_watcher.bat status task_id [session_id] [--config path] [--json]
tools\aiworkflow\file_watcher.bat snapshot task_id session_id [evidence_id] [--config path] [--json]
tools\aiworkflow\file_watcher.bat watch task_id session_id [--config path] [--interval-seconds n] [--duration-seconds n] [--max-snapshots n] [--snapshot-on-start] [--json]
```

`snapshot` records changed files and a diff snapshot under
`_Temp\AIWorkflowRuntime\`, then uses the Evidence Collector to store metadata.
When `include_untracked` is enabled, small untracked text files are also copied
into a separate snapshot section so new-file evidence is reviewable.
`watch` is bounded polling and records snapshots when the changed-file set is
present or changes.

The watcher records observation/evidence only. It does not verify diffs, decide
pass/fail, pause, stop, retry, replan, approve tasks, mark tasks done, commit,
or push.

---

## runtime_control_adapter.bat

Records and applies human-approved runtime controls for task execution sessions.

Commands:

```bat
tools\aiworkflow\runtime_control_adapter.bat status task_id [session_id] [--json]
tools\aiworkflow\runtime_control_adapter.bat read task_id [control_id] [--json]
tools\aiworkflow\runtime_control_adapter.bat request task_id action [session_id] --reason text [--json]
tools\aiworkflow\runtime_control_adapter.bat approve task_id control_id [--note text] [--json]
tools\aiworkflow\runtime_control_adapter.bat reject task_id control_id [--note text] [--json]
tools\aiworkflow\runtime_control_adapter.bat apply task_id control_id [--note text] [--json]
```

Supported actions:

```text
pause
resume
stop
retry
replan
scope_reduce
executor_change
manual_escalation
```

All actions follow:

```text
request -> approve/reject -> apply
```

`pause`, `resume`, and `stop` require a `session_id`. Process-level control is
only attempted against a fresh PID recorded in SessionState by an execution
adapter. Retry, replan, scope reduction, executor change, and manual escalation
are recorded as handoff controls for a later PC Runner layer; they do not run a
new command automatically.

The adapter writes runtime history under `_Temp\AIWorkflowRuntime\`. It does
not approve tasks, mark tasks done, verify results, run arbitrary shell
commands, commit, or push.

---

## result_collector.bat

Aggregates existing task runtime artifacts into ExecutionResult records.

Commands:

```bat
tools\aiworkflow\result_collector.bat status task_id [--json]
tools\aiworkflow\result_collector.bat collect task_id [session_id] [result_id] [--json]
tools\aiworkflow\result_collector.bat read task_id [result_id] [--json]
```

`collect` reads SessionState, EvidenceRecord, ProgressEventLog, and
RuntimeControlHistory artifacts and writes a result under:

```text
_Temp\AIWorkflowRuntime\tasks\<task_id>\evidence\reports\results\
```

The collector summarizes observed exit codes, changed-file references, diff
snapshot references, logs, runtime controls, and recent progress events. It
does not run commands, verify results, decide pass/fail, create
CompletionReport, approve tasks, mark tasks done, commit, or push.

---

## diff_analyzer.bat

Analyzes existing ExecutionResult diff snapshot references into DiffAnalysis
records for later VerificationReport use.

Commands:

```bat
tools\aiworkflow\diff_analyzer.bat status task_id [--json]
tools\aiworkflow\diff_analyzer.bat analyze task_id [result_id] [analysis_id] [--json]
tools\aiworkflow\diff_analyzer.bat read task_id [analysis_id] [--json]
```

`analyze` reads the latest ExecutionResult by default, or the provided
`result_id`, then parses referenced unified diff snapshot files. It summarizes
changed files, additions, deletions, change types, categories, and attention
signals. It does not run commands, verify results, decide pass/fail, create
CompletionReport, approve tasks, mark tasks done, commit, or push.

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
tools\aiworkflow\evidence_collector.bat status WF-20260508-103845 session-evidence-validation-001 --json
tools\aiworkflow\codex_cli_adapter.bat dry-run WF-20260508-142029 --config tools\aiworkflow\codex_cli_adapter.example.json --json
tools\aiworkflow\local_cli_adapter.bat dry-run WF-20260508-150424 node_version --config tools\aiworkflow\local_cli_adapter.example.json --json
tools\aiworkflow\file_watcher.bat status WF-20260508-172728 --json
tools\aiworkflow\runtime_control_adapter.bat status WF-20260511-182549 --json
tools\aiworkflow\result_collector.bat status WF-301 --json
tools\aiworkflow\diff_analyzer.bat status WF-302 --json
tools\aiworkflow\capture_diff.bat --include-untracked
tools\aiworkflow\json_smoke_check.bat
tools\aiworkflow\run_result_semantics_check.bat
```

Do not commit generated `_Temp` outputs.

Recommended `.gitignore` entry:

```text
_Temp/
```

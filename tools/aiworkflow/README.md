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
studio_registry_status.bat
studio_workorder_planner.bat
studio_decision_store.bat
studio_memory_store.bat
studio_meeting_runtime.bat
studio_context_builder.bat
studio_staff_prompt_exporter.bat
studio_staff_executor.bat
studio_handoff_router.bat
studio_staff_runtime.bat
studio_output_materializer.bat
studio_materialization_review.bat
studio_dashboard_export.bat
studio_review_packet_exporter.bat
studio_tool_registry_status.bat
studio_tool_run_planner.bat
studio_conditional_automation.bat
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
build_test_runner.bat
verification_report.bat
completion_report.bat
completion_card.bat
finalization_log.bat
pc_runner.bat
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

## studio_registry_status.bat

Reads the AIWorkflow Studio department and staff registries from:

```text
_Docs\AIWorkflow\Studio\Registries\
```

Human-readable status:

```bat
tools\aiworkflow\studio_registry_status.bat
tools\aiworkflow\studio_registry_status.bat status
```

Validate registry references:

```bat
tools\aiworkflow\studio_registry_status.bat validate
tools\aiworkflow\studio_registry_status.bat validate --json
```

Validation also parses Studio example fixtures and checks known cross-references
between context packets, RoleRun outputs, meetings, WorkOrders, task bindings,
proposals, decisions, and memory records.

Inspect departments and staff agents:

```bat
tools\aiworkflow\studio_registry_status.bat departments
tools\aiworkflow\studio_registry_status.bat department narrative
tools\aiworkflow\studio_registry_status.bat staff
tools\aiworkflow\studio_registry_status.bat staff scenario_director
```

This command is read-only. It does not execute staff agents, call LLMs, approve
tasks, change task lifecycle state, modify source files, commit, or push.

The Studio WorkOrder-to-Task bridge is documented in:

```text
_Docs\AIWorkflow\Studio\WorkOrder_Task_Bridge.md
```

---

## studio_workorder_planner.bat

Stores, reads, lists, and converts Studio WorkOrder JSON files into AIWorkflow
TaskDraft and Backlog row previews. It can also create the Backlog task when
the operator explicitly passes `create --execute`.

Example:

```bat
tools\aiworkflow\studio_workorder_planner.bat status
tools\aiworkflow\studio_workorder_planner.bat list
tools\aiworkflow\studio_workorder_planner.bat read WO-20260518-143000-scenario-pitch
tools\aiworkflow\studio_workorder_planner.bat store _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_workorder_planner.bat store _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
tools\aiworkflow\studio_workorder_planner.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_workorder_planner.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --json
tools\aiworkflow\studio_workorder_planner.bat create _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_workorder_planner.bat create _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
```

`store` without `--execute` is a dry-run preview. `store --execute` writes one
WorkOrder record to `_Docs\AIWorkflow\Studio\WorkOrders\` by default.

`create` without `--execute` is a dry-run preview. `create --execute` appends
one Backlog row and writes a Backlog backup under `_Temp\AIWorkflowStudio\`.
It does not set ActiveTask, approve work, start PC Runner, modify source files,
commit, or push.

For validation smoke tests, `--store-path` may override the WorkOrder store
only under `_Temp\`.

---

## studio_decision_store.bat

Stores, reads, lists, validates, and plans follow-up for Studio `Proposal` and
`Decision` JSON files. It preserves the boundary that a proposal is not a
decision, and a decision is not canon memory until a separate MemoryRecord is
created through the memory store.

Examples:

```bat
tools\aiworkflow\studio_decision_store.bat status
tools\aiworkflow\studio_decision_store.bat validate
tools\aiworkflow\studio_decision_store.bat list-proposals
tools\aiworkflow\studio_decision_store.bat list-decisions
tools\aiworkflow\studio_decision_store.bat create-proposal _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_proposal.example.json
tools\aiworkflow\studio_decision_store.bat create-proposal _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_proposal.example.json --execute
tools\aiworkflow\studio_decision_store.bat create-decision _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_decision.example.json --execute
tools\aiworkflow\studio_decision_store.bat canon-plan DEC-20260518-153500-motivation
```

`create-proposal` and `create-decision` without `--execute` are dry-run
previews. With `--execute`, they write only Proposal or Decision JSON files.

For validation smoke tests, `--store-root` may override both stores only under
`_Temp\`.

`canon-plan` explains what MemoryRecord status should be created next
(`canon`, `approved`, or `rejected`) but does not write memory or canon. The
command does not call LLMs, create WorkOrders, create tasks, approve
implementation, start PC Runner, modify source files, commit, or push.

---

## studio_memory_store.bat

Inspects, validates, and explicitly creates AIWorkflow Studio `MemoryRecord`
JSON files. The default durable store is:

```text
_Docs\AIWorkflow\Studio\MemoryRecords\
```

Examples:

```bat
tools\aiworkflow\studio_memory_store.bat status
tools\aiworkflow\studio_memory_store.bat validate
tools\aiworkflow\studio_memory_store.bat list
tools\aiworkflow\studio_memory_store.bat list --status canon
tools\aiworkflow\studio_memory_store.bat canon
tools\aiworkflow\studio_memory_store.bat query protagonist
tools\aiworkflow\studio_memory_store.bat query protagonist --status canon
tools\aiworkflow\studio_memory_store.bat read MEM-20260518-154000-motivation
tools\aiworkflow\studio_memory_store.bat create _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_canon_memory.example.json
tools\aiworkflow\studio_memory_store.bat create _Docs\AIWorkflow\Studio\Examples\protagonist_motivation_canon_memory.example.json --execute
```

`create` without `--execute` is a dry-run preview. `create --execute` writes one
MemoryRecord JSON file. The tool enforces the first governance checks for
durable memory:

- `canon` memory must cite a `DEC-*` decision reference.
- `rejected` memory must include `rejection_reason`.
- `superseded` memory must include `replacement_ref`.
- duplicate `memory_id` values are rejected.
- `canon` and `query` provide read-only retrieval with explicit use guidance:
  canon is official, proposal is not canon, rejected memory is negative memory,
  and evidence is not approval.

For validation smoke tests, `--store-path` may override the store only under
`_Temp\`. The command does not create tasks, approve work, start PC Runner,
modify source files, commit, or push.

---

## studio_meeting_runtime.bat

Inspects, validates, summarizes, and explicitly creates AIWorkflow Studio
`MeetingSession` JSON files. The default durable store is:

```text
_Docs\AIWorkflow\Studio\MeetingSessions\
```

Examples:

```bat
tools\aiworkflow\studio_meeting_runtime.bat status
tools\aiworkflow\studio_meeting_runtime.bat validate
tools\aiworkflow\studio_meeting_runtime.bat list
tools\aiworkflow\studio_meeting_runtime.bat inspect _Docs\AIWorkflow\Studio\Examples\creative_meeting_session.example.json
tools\aiworkflow\studio_meeting_runtime.bat handoff _Docs\AIWorkflow\Studio\Examples\creative_meeting_session.example.json
tools\aiworkflow\studio_meeting_runtime.bat create _Docs\AIWorkflow\Studio\Examples\creative_meeting_session.example.json
tools\aiworkflow\studio_meeting_runtime.bat create _Docs\AIWorkflow\Studio\Examples\creative_meeting_session.example.json --execute
tools\aiworkflow\studio_meeting_runtime.bat start MEET-20260518-151000-scenario --execute
tools\aiworkflow\studio_meeting_runtime.bat add-turn MEET-20260518-151000-scenario scenario_director synthesis "Summarize current direction." --execute
tools\aiworkflow\studio_meeting_runtime.bat finalize MEET-20260518-151000-scenario --execute
```

`create` without `--execute` is a dry-run preview. `handoff` explains accepted
directions, rejected directions, unresolved questions, and follow-up WorkOrder
ids, but it does not create WorkOrders or tasks. Meeting consensus is not
approval, and proposals are not canon.

`start`, `add-turn`, `transition`, and `finalize` update only the stored
MeetingSession record and require `--execute`. `finalize` stops at
`director_decision_needed` when unresolved questions remain without a director
decision.

For validation smoke tests, `--store-path` may override the store only under
`_Temp\`. The command does not create WorkOrders, create tasks, approve work,
start PC Runner, modify source files, commit, or push.

---

## studio_context_builder.bat

Builds governed `StaffContextPacket` JSON files from a concrete StaffAgent and
a WorkOrder. This removes manual context copy/paste before a RoleRun.

Examples:

```bat
tools\aiworkflow\studio_context_builder.bat status
tools\aiworkflow\studio_context_builder.bat validate
tools\aiworkflow\studio_context_builder.bat plan scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_context_builder.bat create scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_context_builder.bat create scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json --execute
```

`plan` and `create` do not call an LLM or run the staff agent. `create`
without `--execute` is a dry-run preview. `create --execute` writes one sealed
StaffContextPacket record under `_Docs\AIWorkflow\Studio\ContextPackets\` by
default.

For validation smoke tests, `--store-path` may override the ContextPacket
store only under `_Temp\`. Use `--memory-query <text>` to include matching
MemoryRecord refs in the context packet.

The command does not create RoleRuns, call LLMs, call tools, create tasks,
approve work, write memory, write canon, modify source files, commit, or push.

---

## studio_staff_prompt_exporter.bat

Exports a governed staff execution prompt from a sealed `StaffContextPacket`.
It prepares input for the signed-in Codex App/CLI route without calling any
model.

Examples:

```bat
tools\aiworkflow\studio_staff_prompt_exporter.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_prompt_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
```

The exported prompt tells the staff agent to return only `RoleRunOutput` JSON
and keeps source edits, task creation, approvals, canon writes, commits, and
pushes forbidden.

Prompt output is written under `_Temp\AIWorkflowStudio\staff_prompts\` by
default. `--output` may override the path only under `_Temp\`.

The command does not call LLMs, execute staff agents, call tools, create tasks,
approve work, write memory, write canon, modify source files, commit, or push.

---

## studio_staff_executor.bat

Plans or runs a StaffContextPacket through the signed-in Codex App/CLI route.

Examples:

```bat
tools\aiworkflow\studio_staff_executor.bat status
tools\aiworkflow\studio_staff_executor.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_executor.bat run _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_executor.bat run _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json --execute
```

`run --execute` calls local `codex exec -` with the generated prompt through
stdin, using the signed-in Codex route. The default model is `gpt-5.5` with
`high` reasoning and a read-only sandbox. This path is not OpenAI API billing.

Outputs are stored under `_Temp\AIWorkflowStudio\staff_runs\`. The executor
captures stdout/stderr and writes `role_run_output.json` only when Codex stdout
contains parseable `RoleRunOutput` JSON.

The command does not create tasks, approve work, write canon, modify source
files, commit, or push.

---

## studio_handoff_router.bat

Validates governed Handoff records and converts them into sealed target-agent
StaffContextPacket records.

Examples:

```bat
tools\aiworkflow\studio_handoff_router.bat status
tools\aiworkflow\studio_handoff_router.bat validate
tools\aiworkflow\studio_handoff_router.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json
tools\aiworkflow\studio_handoff_router.bat create-context _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json
tools\aiworkflow\studio_handoff_router.bat create-context _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json --execute
```

`plan` verifies source/target StaffAgent identity and source-to-target handoff
permission. `create-context --execute` writes one StaffContextPacket for the
target agent. When a handoff references a `RoleRunOutput` evidence id such as
`RRO-...`, the router attempts to include short evidence summaries in the
target context packet so the next staff agent does not receive only opaque
artifact ids. The router does not execute the target agent, approve work, write
canon, create tasks, modify source files, commit, or push.

For validation smoke tests, `--handoff-store-path` and `--context-store-path`
may override stores only under `_Temp\`. `--evidence-search-root` may point
under `_Temp\` or `_Docs\AIWorkflow\Studio\`.

---

## studio_staff_runtime.bat

Plans governed AIWorkflow Studio `RoleRun` envelopes from `StaffContextPacket`
JSON files and inspects `RoleRunOutput` JSON files. The default durable store
is:

```text
_Docs\AIWorkflow\Studio\RoleRuns\
```

Examples:

```bat
tools\aiworkflow\studio_staff_runtime.bat status
tools\aiworkflow\studio_staff_runtime.bat validate
tools\aiworkflow\studio_staff_runtime.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_runtime.bat create _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_runtime.bat create _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json --execute
tools\aiworkflow\studio_staff_runtime.bat inspect-output _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_staff_runtime.bat handoff-output _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_staff_runtime.bat route-output _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
```

The default provider policy is `codex_cli_signed_in` with `gpt-5.5`, so the
Studio path assumes Codex App/CLI signed-in subscription execution first, not
OpenAI API billing.

`plan` and `create` do not call an LLM. `create` without `--execute` is a
dry-run preview. `create --execute` writes one RoleRun envelope. RoleRunOutput
inspection rejects staff output that claims it directly changed source files,
created tasks, approved work, changed canon, committed, or pushed.
`route-output` groups RoleRunOutput into deterministic next-route buckets:
questions, approval items, staff handoffs, WorkOrder candidates, and memory
candidates.

For validation smoke tests, `--store-path` may override the store only under
`_Temp\`. The command does not call LLMs, call tools, create WorkOrders, create
tasks, approve work, start PC Runner, modify source files, commit, or push.

---

## studio_review_packet_exporter.bat

Exports a Human Director-readable HTML review packet from a `RoleRunOutput`.

Example:

```bat
tools\aiworkflow\studio_review_packet_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
```

The exported packet shows summary, questions, approval items, objections,
proposals, handoff requests, WorkOrder candidates, memory candidates, evidence
refs, and safety flags with Korean labels. It writes only `_Temp` HTML and
does not approve, materialize, execute staff, create tasks, write canon, modify
source files, commit, or push.

---

## studio_output_materializer.bat

Plans or materializes governed draft records from a `RoleRunOutput`.

Examples:

```bat
tools\aiworkflow\studio_output_materializer.bat status
tools\aiworkflow\studio_output_materializer.bat validate
tools\aiworkflow\studio_output_materializer.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat materialize _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_output_materializer.bat materialize _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json --execute
```

The materializer can create Proposal drafts, Memory drafts or proposed memory,
WorkOrder drafts, Handoff proposals, and one materialization manifest. It does
not approve those records. It also does not create Backlog tasks, write canon,
call LLMs, execute staff, modify source files, commit, or push.

For validation smoke tests, `--store-root` may override the Studio store only
under `_Temp\`.

---

## studio_materialization_review.bat

Plans or records Human Director decisions for materialized Studio draft
records.

Examples:

```bat
tools\aiworkflow\studio_materialization_review.bat status
tools\aiworkflow\studio_materialization_review.bat list
tools\aiworkflow\studio_materialization_review.bat read MAT-20260518-150000-scenario
tools\aiworkflow\studio_materialization_review.bat plan MAT-20260518-150000-scenario --decision approve --target all
tools\aiworkflow\studio_materialization_review.bat record MAT-20260518-150000-scenario --decision approve --target all --execute
```

The review tool writes only `Decision` records when `--execute` is explicit.
It does not update the accepted draft records, create Backlog tasks, write
canon, run implementation, call LLMs, commit, or push.

For validation smoke tests, `--store-root` may override the Studio store only
under `_Temp\`.

---

## studio_dashboard_export.bat

Exports a read-only AIWorkflow Studio dashboard HTML snapshot under `_Temp`.

Example:

```bat
tools\aiworkflow\studio_dashboard_export.bat
tools\aiworkflow\studio_dashboard_export.bat --json
tools\aiworkflow\studio_dashboard_export.bat --output _Temp\AIWorkflowStudio\dashboard\studio_dashboard.html
```

The dashboard summarizes departments, staff agents, durable WorkOrders,
MemoryRecords, MeetingSessions, RoleRuns, tool adapters, review packet links,
the Director flow, a read-only Director Inbox, and safety rules. It is a
static snapshot and does not start a server.

`--output` is restricted to `_Temp\`. The command does not call LLMs, call
tools, create memory, create WorkOrders, create tasks, approve work, start PC
Runner, modify source files, commit, or push.

---

## studio_tool_registry_status.bat

Reads and validates the AIWorkflow Studio tool adapter registry:

```text
_Docs\AIWorkflow\Studio\Registries\tool_adapters.initial.json
```

Examples:

```bat
tools\aiworkflow\studio_tool_registry_status.bat status
tools\aiworkflow\studio_tool_registry_status.bat validate
tools\aiworkflow\studio_tool_registry_status.bat list
tools\aiworkflow\studio_tool_registry_status.bat adapter codex_cli_signed_in
tools\aiworkflow\studio_tool_registry_status.bat adapter codex_image_generation
```

The registry records which adapters can modify files, call external systems,
incur cost, require Human Director approval, and what evidence they must
produce. It also records the current provider policy: use Codex App/CLI
signed-in routes first and do not require OpenAI API billing by default.

This command is read-only. It does not execute adapters, call LLMs, create
memory, create WorkOrders, create tasks, approve work, modify source files,
commit, or push.

---

## studio_tool_run_planner.bat

Plans, reads, lists, validates, and explicitly stores governed Studio
ToolRunRequest JSON files. It evaluates a request against the ToolAdapter
registry before any adapter is allowed to run.

Examples:

```bat
tools\aiworkflow\studio_tool_run_planner.bat status
tools\aiworkflow\studio_tool_run_planner.bat validate
tools\aiworkflow\studio_tool_run_planner.bat list
tools\aiworkflow\studio_tool_run_planner.bat read TRQ-20260518-180000-codex-scenario-review
tools\aiworkflow\studio_tool_run_planner.bat plan _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json
tools\aiworkflow\studio_tool_run_planner.bat create _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json
tools\aiworkflow\studio_tool_run_planner.bat create _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json --execute
```

`plan` and `create` do not execute the requested adapter. `create` without
`--execute` is a dry-run preview. `create --execute` writes one
ToolRunRequest record under `_Docs\AIWorkflow\Studio\ToolRuns\` by default.

For validation smoke tests, `--store-path` may override the ToolRunRequest
store only under `_Temp\`.

The planner reports whether the request is allowed without execution, needs
Human Director approval, is ready for a separate execution gate, or is blocked.
It does not call LLMs, create tasks, approve work, start PC Runner, write
canon, modify source files, commit, or push.

---

## studio_conditional_automation.bat

Evaluates, tests, replays, and repair-plans Studio conditional automation
policy decisions.

Examples:

```bat
tools\aiworkflow\studio_conditional_automation.bat status
tools\aiworkflow\studio_conditional_automation.bat validate
tools\aiworkflow\studio_conditional_automation.bat test
tools\aiworkflow\studio_conditional_automation.bat test --execute
tools\aiworkflow\studio_conditional_automation.bat replay _Temp\AIWorkflowStudio\conditional_automation\conditional-automation-test-YYYYMMDD-HHMMSS-fff.json
tools\aiworkflow\studio_conditional_automation.bat repair-plan _Temp\AIWorkflowStudio\conditional_automation\conditional-automation-test-YYYYMMDD-HHMMSS-fff.json
```

`test` is read-only. `test --execute` writes a replayable evaluation JSON under
`_Temp\AIWorkflowStudio\conditional_automation\`. Replay recomputes decisions
from the recorded input, and repair-plan explains what must change before a
blocked or human-gated action can safely proceed.

This command does not call LLMs, create tasks, approve work, start PC Runner,
write memory, write canon, modify source files, commit, or push.

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

For `codex exec`, use `prompt_input_mode: "stdin_text"` with `args` ending in
`"-"` so the generated runner prompt file is sent through stdin instead of
being treated as a literal prompt path.

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

## pc_runner.bat

Coordinates existing AIWorkflow primitives through one controlled runner
entrypoint.

Commands:

```bat
tools\aiworkflow\pc_runner.bat status task_id [--json]
tools\aiworkflow\pc_runner.bat plan task_id [--profile auto|validation|build|implementation|documentation] [--executor local_cli|codex_cli] [--json]
tools\aiworkflow\pc_runner.bat start task_id [--profile auto|validation|build|implementation|documentation] [--executor local_cli|codex_cli] [--json]
tools\aiworkflow\pc_runner.bat continue task_id [--runner-run-id id] [--json]
tools\aiworkflow\pc_runner.bat stop task_id [--runner-run-id id] [--json]
tools\aiworkflow\pc_runner.bat read task_id [--runner-run-id id] [--json]
```

The runner writes plan, run, and checkpoint artifacts under:

```text
_Temp\AIWorkflowRuntime\tasks\<task_id>\runner\
```

It can advance approved work through safe automated substeps and stops at
Human Director gates. If `--profile` is omitted, the runner uses `auto` routing:
implementation/data/game/refactoring/maintenance tasks route to
`implementation/codex_cli`, documentation tasks route to
`documentation/codex_cli`, build validation tasks route to `build/local_cli`,
and other validation tasks route to `validation/local_cli`. The `validation`
profile uses allowlisted local workflow
commands. The `build` profile routes build-validation requests to allowlisted
`build_test_runner` commands such as `debug_visual_studio_build`. The
`documentation` and `implementation` profiles use `codex_cli_adapter.bat` and
will not execute unless `_Local\AIWorkflow\codex_cli_adapter.local.json` exists
and is explicitly enabled. The runner does not approve tasks, create Backlog
tasks, run arbitrary shell commands, commit, or push. A task is marked done
only through an explicit Human Director command path such as Discord
`/ai runner accept-completion ... mark-done:true` or `/ai task done`.

For implementation runs, the generated prompt separates executor-owned tracked
edits from PC Runner-owned runtime validation. The runner also records a
`text_encoding_guard` artifact after Codex CLI execution and before completion
artifacts. If the guard finds probable mojibake in executor stdout or
adapter-reported/tracked changed text files, the runner stops at
`text_encoding_guard_failed` for human review instead of generating
VerificationReport/CompletionReport artifacts. Stderr findings are recorded as
warning-only evidence because stderr often contains shell command echoes or
tool output.

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

## build_test_runner.bat

Runs only allowlisted build/test/validation command entries from a local config
and records BuildTestResult artifacts.

Commands:

```bat
tools\aiworkflow\build_test_runner.bat status task_id [--config path] [--json]
tools\aiworkflow\build_test_runner.bat list task_id [--config path] [--json]
tools\aiworkflow\build_test_runner.bat dry-run task_id command_id [--config path] [--json]
tools\aiworkflow\build_test_runner.bat run task_id command_id --execute [--approved] [--build-test-id id] [--config path] [--json]
tools\aiworkflow\build_test_runner.bat read task_id [build_test_id] [--config path] [--json]
```

Real execution is default-deny. It requires an enabled config, an allowlisted
`command_id`, `--execute`, an allowed task status, and `--approved` when the
command has `approval_level: approval_required`. It records stdout, stderr,
timing, timeout, spawn, and exit-code observations, but it does not decide
pass/fail, approve tasks, mark tasks done, commit, or push.

---

## verification_report.bat

Generates VerificationReport artifacts from existing ExecutionResult,
DiffAnalysis, and BuildTestResult evidence.

Commands:

```bat
tools\aiworkflow\verification_report.bat status task_id [--json]
tools\aiworkflow\verification_report.bat generate task_id [--result-id id] [--analysis-id id] [--build-test-id id] [--report-id id] [--json]
tools\aiworkflow\verification_report.bat read task_id [report_id] [--json]
```

`generate` uses the latest available WF-301/WF-302/WF-303 artifacts by default,
or the explicitly provided source IDs. It writes reports under
`_Temp\AIWorkflowRuntime\`, updates only the TaskRunState verification
projection, and appends a display-only progress event.

The report may produce `PASS`, `PASS_WITH_NOTES`, `CONCERNS`, `BLOCKED`, or
`FAIL`. It does not create CompletionReport, approve tasks, mark tasks done,
commit, push, release, deploy, or run shell commands.

---

## completion_report.bat

Generates CompletionReport artifacts from an existing VerificationReport.

Commands:

```bat
tools\aiworkflow\completion_report.bat status task_id [--json]
tools\aiworkflow\completion_report.bat generate task_id [verification_report_id] [completion_report_id] [--json]
tools\aiworkflow\completion_report.bat read task_id [completion_report_id] [--json]
```

`generate` uses the latest VerificationReport by default. The report summarizes
completion readiness, verification verdict, remaining risks, required human
decisions, and next manual commands. It writes artifacts under `_Temp`, updates
only the TaskRunState completion-report projection, and appends a display-only
progress event.

It does not approve tasks, mark tasks done, write FinalizationLog, create an
Auto Approval Policy result, commit, push, release, deploy, or run shell
commands.

---

## completion_card.bat

Generates compact Completion Card artifacts from an existing CompletionReport.

Commands:

```bat
tools\aiworkflow\completion_card.bat status task_id [--json]
tools\aiworkflow\completion_card.bat generate task_id [completion_report_id] [completion_card_id] [--json]
tools\aiworkflow\completion_card.bat read task_id [completion_card_id] [--json]
```

`generate` uses the latest CompletionReport by default. The card is a
presentation artifact for Discord-style review. It keeps the completion
decision human-owned and does not change Backlog, ActiveTask, approval,
done/finalization, commit, push, release, or deploy state.

---

## finalization_log.bat

Records ApprovalHistory and FinalizationLog artifacts from explicit Human
Director completion decisions.

Commands:

```bat
tools\aiworkflow\finalization_log.bat status task_id [--json]
tools\aiworkflow\finalization_log.bat record task_id decision [completion_report_id] [approval_record_id] [finalization_log_id] [actor] [--json]
tools\aiworkflow\finalization_log.bat read task_id [finalization_log_id] [--json]
```

Allowed decisions:

```text
accept_completion
accept_with_concerns
reject_completion
request_changes
defer_completion
```

`accept_completion` requires a CompletionReport that is ready for manual done
review. `accept_with_concerns` is an explicit reviewed-concern acceptance for a
`CONCERNS` CompletionReport in `needs_human_decision` state, and is allowed only
when blockers and failed checks are absent. Other decisions can be recorded
against blocked or incomplete evidence so the rejection, requested changes, or
deferral remains auditable.

The command writes runtime artifacts under `_Temp`, updates only TaskRunState
approval/finalization projection fields, and appends a display-only progress
event. It does not mark tasks done, update Backlog/ActiveTask lifecycle state,
apply Auto Approval Policy, create follow-up tasks, commit, push, release, or
deploy.

---

## Recommended Check

From repository root:

```bat
tools\aiworkflow\status.bat
tools\aiworkflow\workflow_status.bat
tools\aiworkflow\role_router_status.bat
tools\aiworkflow\role_router_status.bat --json
tools\aiworkflow\studio_registry_status.bat validate
tools\aiworkflow\studio_tool_registry_status.bat validate
tools\aiworkflow\studio_tool_run_planner.bat plan _Docs\AIWorkflow\Studio\Examples\tool_run_request_codex_staff.example.json
tools\aiworkflow\studio_decision_store.bat validate
tools\aiworkflow\studio_context_builder.bat plan scenario_director _Docs\AIWorkflow\Studio\Examples\scenario_pitch_work_order.example.json
tools\aiworkflow\studio_staff_prompt_exporter.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_context_packet.example.json
tools\aiworkflow\studio_staff_executor.bat status
tools\aiworkflow\studio_handoff_router.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_to_game_designer_handoff.example.json
tools\aiworkflow\studio_output_materializer.bat plan _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_materialization_review.bat status
tools\aiworkflow\studio_review_packet_exporter.bat export _Docs\AIWorkflow\Studio\Examples\scenario_director_role_run_output.example.json
tools\aiworkflow\studio_conditional_automation.bat test
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
tools\aiworkflow\build_test_runner.bat status WF-303 --json
tools\aiworkflow\verification_report.bat status WF-304 --json
tools\aiworkflow\completion_report.bat status WF-305-306 --json
tools\aiworkflow\completion_card.bat status WF-305-306 --json
tools\aiworkflow\finalization_log.bat status WF-307 --json
tools\aiworkflow\capture_diff.bat --include-untracked
tools\aiworkflow\json_smoke_check.bat
tools\aiworkflow\run_result_semantics_check.bat
```

Do not commit generated `_Temp` outputs.

Recommended `.gitignore` entry:

```text
_Temp/
```

# WF-209/210 Runtime Control Adapter and Controls

## Summary

Implemented the WF-209/210 Runtime Control Adapter layer for AIWorkflow runtime
sessions.

The change adds structured runtime control records for pause, resume, stop,
retry, replan, scope reduction, executor change, and manual escalation. It also
extends Session Supervisor and the Codex CLI / Local CLI execution adapters so
runtime sessions can record process metadata that safe controls can target.

## Background

WF-207 added progress and heartbeat display state. WF-208 added file watching
and diff snapshot evidence. WF-209/210 adds the control surface that lets the
PC Runner record and apply human-approved runtime interventions without
collapsing task lifecycle state, execution state, evidence, and verification
into one layer.

## Scope

Included:

- `tools/aiworkflow/runtime_control_adapter.bat`
- `tools/aiworkflow/runtime_control_adapter.ps1`
- RuntimeControlHistory append-only JSONL records
- `status`, `read`, `request`, `approve`, `reject`, and `apply` commands
- explicit approval before apply
- TaskRunState control projection updates
- ProgressEventLog runtime-control events
- safe stop for fresh recorded session PIDs
- pause/resume for fresh recorded session PIDs on Windows
- session-state fallback when no fresh PID is available
- retry, replan, scope reduction, executor change, and manual escalation
  handoff records
- Session Supervisor process metadata fields
- Codex CLI and Local CLI process metadata updates
- cancelled-session preservation when executor final status races after stop
- runtime control blueprint documentation
- local script README updates

Excluded:

- VerificationReport
- CompletionReport or Completion Card
- automatic approval policy
- automatic task approval
- automatic task done
- arbitrary user shell execution
- build/test runner integration
- game source or data changes
- commit, push, release, or deploy

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Runtime_Control_Adapter.md`
- `tools/aiworkflow/README.md`
- `tools/aiworkflow/runtime_control_adapter.bat`
- `tools/aiworkflow/runtime_control_adapter.ps1`
- `tools/aiworkflow/session_supervisor.ps1`
- `tools/aiworkflow/local_cli_adapter.ps1`
- `tools/aiworkflow/codex_cli_adapter.ps1`

## Architecture Notes

WF-209/210 keeps these responsibilities separated:

- Runtime Control records intent, human decision, and apply result.
- Execution adapters start and record concrete executor processes.
- Session Supervisor stores session status, heartbeat, progress, and process
  metadata.
- Evidence Collector stores execution logs and evidence references.
- Verification and completion remain later layers.

All controls follow:

```text
request -> approve/reject -> apply
```

The adapter records that task lifecycle state is unchanged in command output.
It does not update Backlog or ActiveTask, mark tasks done, verify results,
commit, or push.

## Implementation Notes

`runtime_control_adapter.ps1` writes append-only records to:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/runtime_control_history.jsonl
```

`pause`, `resume`, and `stop` require a `session_id`. Process-level control is
attempted only when the SessionState process record contains a fresh PID with
no `ended_at` value. `stop` refuses to target the Runtime Control process
itself.

`retry`, `replan`, `scope_reduce`, `executor_change`, and `manual_escalation`
are handoff-only controls. They record approved runtime intent for a future PC
Runner layer but do not start new execution automatically.

`apply` is idempotent for already-applied controls: it resynchronizes the
TaskRunState control projection from history instead of applying process side
effects again.

`session_supervisor.ps1` now accepts and exposes process metadata:

```text
process.pid
process.started_at
process.ended_at
process.exit_code
executor.command_line
executor.working_directory
```

The Codex CLI and Local CLI adapters update those fields after child-process
start and after process completion.

## Review Summary

During validation, the first runtime control scenarios exposed several issues:

- PowerShell `$PID` is read-only, so local variable names had to avoid
  colliding with the automatic variable.
- The batch wrapper initially used `shift /1`, which was not compatible with
  preserving parsed arguments after `%0` handling. It now stores `SCRIPT_DIR`
  before shifting and uses plain `shift`.
- A stopped Local CLI session could be overwritten as `failed` when the
  executor later wrote its final process status. Session Supervisor now
  preserves `cancelled` when an executor attempts a final `completed` or
  `failed` update after stop.
- Parallel validation of handoff controls exposed a short file-lock window on
  `task_run_state.json`. Runtime Control writes now retry briefly, and applied
  controls can resynchronize projection state idempotently.
- Controls created in the same second needed deterministic latest-control
  sorting beyond `created_at`, so status projection now sorts by timestamp,
  control id, and record id.

All identified issues were fixed before the final validation pass.

## Validation Summary

Executed:

- `git status --short`
- PowerShell parser checks for:
  - `tools/aiworkflow/runtime_control_adapter.ps1`
  - `tools/aiworkflow/session_supervisor.ps1`
  - `tools/aiworkflow/local_cli_adapter.ps1`
  - `tools/aiworkflow/codex_cli_adapter.ps1`
- `tools\aiworkflow\task_workspace_manager.bat create WF-20260511-182549 --json`
- `tools\aiworkflow\session_supervisor.bat create WF-20260511-182549 session-runtime-control-validation-001 --executor runtime_control_adapter --activity "WF-209 runtime control validation session." --json`
- `tools\aiworkflow\runtime_control_adapter.bat status WF-20260511-182549 --json`
- Runtime Control `request`, `approve`, `reject`, `apply`, `read`, and
  `status` scenarios
- Local CLI sleep command validation through a temporary `_Temp` allowlist
  config
- pause/resume/stop against a running recorded Local CLI session process
- retry and replan handoff controls
- scope reduction and manual escalation handoff controls
- executor change rejection
- already-applied control resynchronization

Observed:

- Pause suspended a fresh recorded session process and marked the session
  `paused`.
- Resume resumed that process and returned the session to `running`.
- Stop terminated a fresh recorded session process and preserved final
  `cancelled` state even after the Local CLI adapter attempted a final failed
  status write.
- Retry, replan, scope reduction, executor change, and manual escalation were
  represented as control records or explicit rejection without automatic
  execution.
- Runtime Control output kept `task_lifecycle_unchanged = true`.
- Runtime artifacts were written under `_Temp/AIWorkflowRuntime/`.

Final checks:

- `git diff --check` passed with line-ending normalization warnings only.
- `git diff --stat` reviewed for tracked changes.
- `git status --short -- PlayGround\Project PlayGround\Data` reported no
  game source or data changes.
- `git status --short -- _Temp _Local .env node_modules tools\discord-orchestrator\discord_bot.local.json`
  reported no private/local tracked changes.
- `git ls-files _Temp _Local .env node_modules tools\discord-orchestrator\discord_bot.local.json`
  reported no tracked private/local files.

## Remaining Risks

- Runtime Control is available as a local script layer. Discord command
  integration for runtime control cards and buttons is still a follow-up task.
- Retry/replan/scope/executor/manual escalation are intentionally handoff-only
  until the PC Runner routing layer consumes them.
- Result aggregation, VerificationReport, CompletionReport, Completion Card,
  and automatic approval policy remain Phase 3 responsibilities.

## Next Tasks

- WF-301 Implement Result Collector.
- Add Discord-facing runtime control commands or cards after the local PC
  Runner control layer is stable enough to expose.

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-209/210
scope. Runtime artifacts and temporary validation config were generated under
`_Temp/` and are not intended to be committed.

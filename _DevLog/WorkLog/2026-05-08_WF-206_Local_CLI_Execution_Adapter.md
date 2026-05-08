# WF-206 Local CLI Execution Adapter

## Summary

Implemented the reduced-scope Local CLI Execution Adapter for WF Final
Blueprint v7.

The adapter runs only allowlisted `command_id` entries from config and records
runtime SessionState and EvidenceRecord artifacts.

## Background

WF-202 created task workspaces, WF-203 created session supervision, WF-204
created evidence storage, and WF-205 connected the same pattern to Codex CLI.
WF-206 adds a separate Local CLI adapter for allowlisted local commands.

## Scope

Included:

- command catalog and allowlist config
- command_id-based execution only
- arbitrary shell command blocking
- workspace and approved task guards
- explicit `run --execute` guard
- disabled config and disabled command guards
- Session Supervisor integration
- stdout/stderr log capture
- exit code capture
- timeout/nonzero/spawn failure evidence path
- changed file and diff snapshot evidence linkage
- WF-207 handoff documentation

Excluded:

- Verification Gate
- Completion Card
- automatic approval policy
- pass/fail judgment
- git commit or push
- arbitrary user shell command execution
- Codex App, Copilot, OpenClaw, or Hermes adapters
- large command refactoring

## Files Changed

- `tools/aiworkflow/local_cli_adapter.ps1`
- `tools/aiworkflow/local_cli_adapter.bat`
- `tools/aiworkflow/local_cli_adapter.example.json`
- `tools/aiworkflow/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Local_CLI_Execution_Adapter.md`
- `_DevLog/WorkLog/2026-05-08_WF-206_Local_CLI_Execution_Adapter.md`

## Architecture Notes

The adapter does not modify task lifecycle state. It writes only runtime
session/evidence artifacts under `_Temp/AIWorkflowRuntime/`.

Real local command execution requires both:

```text
run --execute
enabled: true
```

The tracked example config is disabled to prevent accidental execution.

## Implementation Notes

The local API is:

```bat
tools\aiworkflow\local_cli_adapter.bat status task_id command_id [--config path] [--json]
tools\aiworkflow\local_cli_adapter.bat dry-run task_id command_id [--config path] [--json]
tools\aiworkflow\local_cli_adapter.bat run task_id command_id --execute [--config path] [--session-id id] [--evidence-id id] [--json]
```

## Review Summary

Reviewed the adapter boundaries after smoke validation.

- `status` and `dry-run` inspect only and do not execute local commands.
- `run` requires both `--execute` and an enabled config.
- command selection is by allowlisted `command_id`; arbitrary shell command text
  is not accepted by the CLI surface.
- SessionState and EvidenceRecord artifacts are linked by `task_id`,
  `session_id`, and `evidence_id`.
- Evidence records intentionally keep `pass_fail` and `verdict` unset.

## Validation Summary

Validation run on 2026-05-08:

- PowerShell syntax check for `tools/aiworkflow/local_cli_adapter.ps1`: passed.
- `task_workspace_manager.bat create WF-20260508-150424 --json`: passed and
  created a runtime workspace under `_Temp/AIWorkflowRuntime/`.
- `local_cli_adapter.bat status ... node_version --config
  tools\aiworkflow\local_cli_adapter.example.json --json`: passed with
  `external_execution_performed=false`.
- `local_cli_adapter.bat dry-run ... node_version --config
  tools\aiworkflow\local_cli_adapter.example.json --json`: passed with
  `external_execution_performed=false`.
- `local_cli_adapter.bat run ... node_version --config
  tools\aiworkflow\local_cli_adapter.example.json --json`: rejected because
  `--execute` was missing.
- `local_cli_adapter.bat run ... node_version --execute --config
  tools\aiworkflow\local_cli_adapter.example.json --json`: rejected because
  the tracked example config is disabled; failed evidence was recorded.
- `local_cli_adapter.bat run ... node_version --execute --config
  _Temp\AIWorkflowRuntime\local_cli_adapter.validation.json --json`: executed
  allowlisted `node --version`, recorded stdout/stderr logs, exit_code `0`,
  changed files, and a diff snapshot.
- `local_cli_adapter.bat dry-run ... arbitrary_shell --config
  tools\aiworkflow\local_cli_adapter.example.json --json`: rejected because
  the command_id was not allowlisted.
- `local_cli_adapter.bat run ... missing_executable --execute --config
  _Temp\AIWorkflowRuntime\local_cli_adapter.spawn_failure.json --json`:
  recorded failed evidence with exit_code `-1`.
- `local_cli_adapter.bat run ... node_exit_7 --execute --config
  _Temp\AIWorkflowRuntime\local_cli_adapter.nonzero.json --json`: recorded
  nonzero evidence with exit_code `7`.

During validation, early smoke runs exposed and fixed Windows PowerShell
compatibility issues in process argument handling, stdout/stderr capture, and
git warning capture. Temporary failed sessions from those pre-fix smoke runs
were closed under `_Temp/AIWorkflowRuntime/`.

## Remaining Risks

- Real local command execution should use a reviewed local config under
  `_Local/AIWorkflow/`.
- Evidence records are not validation verdicts.

## Next Tasks

- WF-207 progress and heartbeat collection

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-206
reduced scope.

# WF-205 Codex CLI Execution Adapter

## Summary

Implemented the reduced-scope Codex CLI Execution Adapter for WF Final
Blueprint v7.

The adapter adds a guarded execution path that links Codex CLI execution
attempts to WF-202 workspaces, WF-203 sessions, and WF-204 evidence records.

## Background

WF-202 created task workspaces, WF-203 created session supervision, and WF-204
created evidence storage. WF-205 connects those layers to a config-based Codex
CLI command path.

## Scope

Included:

- config-based Codex CLI command/path/args
- task approval and workspace execution guard
- explicit `run --execute` guard
- Session Supervisor integration
- stdout/stderr log path capture
- exit code capture
- changed file and diff snapshot evidence linkage
- guard failure evidence recording
- WF-206 handoff documentation

Excluded:

- Local CLI Execution Adapter
- build/test runner
- Verification Gate
- Completion Card
- automatic approval policy
- pass/fail judgment
- git commit or push
- broad Discord task command refactoring

## Files Changed

- `tools/aiworkflow/codex_cli_adapter.ps1`
- `tools/aiworkflow/codex_cli_adapter.bat`
- `tools/aiworkflow/codex_cli_adapter.example.json`
- `tools/aiworkflow/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Codex_CLI_Execution_Adapter.md`
- `_DevLog/WorkLog/2026-05-08_WF-205_Codex_CLI_Execution_Adapter.md`

## Architecture Notes

The adapter does not modify task lifecycle state. It writes only runtime
session/evidence artifacts under `_Temp/AIWorkflowRuntime/`.

Real Codex CLI execution requires both:

```text
run --execute
enabled: true
```

The tracked example config is disabled to prevent accidental execution.

## Implementation Notes

The local API is:

```bat
tools\aiworkflow\codex_cli_adapter.bat status task_id [--config path] [--prompt-file path] [--json]
tools\aiworkflow\codex_cli_adapter.bat dry-run task_id [--config path] [--prompt-file path] [--json]
tools\aiworkflow\codex_cli_adapter.bat run task_id --execute [--config path] [--prompt-file path] [--session-id id] [--evidence-id id] [--json]
```

## Review Summary

Self-review checked that the implementation stays in the WF-205 reduced scope:

- task lifecycle state is not written
- runtime state is written only under `_Temp/AIWorkflowRuntime/`
- real execution requires both `run --execute` and config `enabled: true`
- `status` and `dry-run` do not execute external tools
- disabled config guard records failed session/evidence without launching Codex
- stdout/stderr capture uses asynchronous process output readers for the real
  execution path
- no Local CLI adapter, build/test runner, Verification Gate, Completion Card,
  automatic approval policy, pass/fail judgment, commit, or push was added

## Validation Summary

Initial validation performed:

- PowerShell parse check for `codex_cli_adapter.ps1`: passed
- WF-205 task workspace creation through `task_workspace_manager.bat`: passed
- `codex_cli_adapter.bat status WF-20260508-142029 --config tools\aiworkflow\codex_cli_adapter.example.json --json`: passed
- `codex_cli_adapter.bat dry-run WF-20260508-142029 --config tools\aiworkflow\codex_cli_adapter.example.json --json`: passed
- `codex_cli_adapter.bat run ...` without `--execute`: rejected as expected
- `codex_cli_adapter.bat run ... --execute` with disabled config: rejected as
  expected, with failed session/evidence recorded
- failed SessionState readback through `session_supervisor.bat`: passed
- failed EvidenceRecord readback through `evidence_collector.bat`: passed
- stderr guard-failure log readback: passed

Actual Codex CLI execution was not performed during validation.

Final repository validation is recorded in the Codex completion response.

## Remaining Risks

- Real Codex CLI execution was not performed during validation.
- Local machine config under `_Local/AIWorkflow/` is required before real use.
- The adapter records evidence but does not validate or judge it.

## Next Tasks

- WF-206 Local CLI Execution Adapter

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-205
reduced scope.

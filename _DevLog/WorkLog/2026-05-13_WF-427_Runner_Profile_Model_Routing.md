# WF-427 Runner Profile Model Routing WorkLog

## Summary

Added PC Runner Codex profile routing so Codex-backed runner profiles can use
different model, reasoning, and ephemeral settings without changing slash
commands or approval policy.

## Background

Intake already supports model routes, and the Codex CLI adapter already accepts
structured `model`, `reasoning_effort`, and `ephemeral` fields. The missing
piece was making PC Runner select a profile-specific adapter config instead of
using one global Codex adapter runtime for every Codex-backed profile.

## Scope

- Generate a task-scoped Codex adapter config under the runner config directory.
- Start from `_Local/AIWorkflow/codex_cli_adapter.local.json`.
- Apply `runner_profiles.<profile>` overrides when present.
- Default `documentation` profile to `gpt-5.4-mini`, `low`, and
  `ephemeral=true` when no explicit documentation override exists.
- Keep `implementation` on the base local config unless explicitly overridden.
- Pass the generated config to both `codex_cli_adapter dry-run` and
  `codex_cli_adapter run`.
- Record selected config/model/reasoning/ephemeral metadata in runner
  progress/checkpoint artifacts.
- Update English and Korean model-routing docs and the local config example.

## Files Changed

- `tools/aiworkflow/pc_runner.ps1`
- `tools/aiworkflow/codex_cli_adapter.example.json`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Codex_Model_Routing_And_Ephemeral.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Codex_Model_Routing_And_Ephemeral_KR.md`
- `_DevLog/WorkLog/2026-05-13_WF-427_Runner_Profile_Model_Routing.md`

## Validation Summary

Performed validation:

- PowerShell parser check for `tools/aiworkflow/pc_runner.ps1`
- JSON parse check for `tools/aiworkflow/codex_cli_adapter.example.json`
- PC Runner dry-run/plan smoke showing profile config metadata

Observed PC Runner smoke:

```text
profile: documentation
stop_reason: executor_not_ready
codex_config_path: _Temp/AIWorkflowRuntime/tasks/WF-SMOKE/runner/config/codex_cli_adapter.documentation.pc_runner.json
model: gpt-5.4-mini
reasoning_effort: low
ephemeral: true
external Codex execution: no
```

- `git diff --check`
- forbidden/private path tracking check

`git diff --check` passed with line-ending warnings only. No tracked `_Local`,
`_Temp`, `node_modules`, `.env`, or `*.local.json` changes were present.

## Remaining Risks

- This changes Codex-backed runner configuration selection only. It does not
  auto-approve risky work, mark tasks done, finalize completion, commit, push,
  release, deploy, or change Discord command schemas.

## AI Assistance

Codex implemented and validated this workflow harness change.

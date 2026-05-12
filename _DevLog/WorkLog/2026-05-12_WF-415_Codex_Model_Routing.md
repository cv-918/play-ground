# WF-415 Codex Model Routing and Ephemeral Runs

## Summary

Implemented the first configurable model/reasoning routing layer for Codex CLI
intake and added structured Codex CLI adapter fields for model, reasoning
effort, and ephemeral runs.

## Scope

Changed:

- Discord orchestrator config parsing for `llm_intake.reasoning_effort`,
  `llm_intake.ephemeral`, and `llm_intake.model_routes`
- Codex CLI intake argument generation and metadata
- intake Discord response metadata
- Codex CLI adapter structured config handling
- config examples
- workflow docs

Not changed:

- Discord command schema
- approval policy
- task done behavior
- finalization behavior
- commit/push behavior
- game source or data

## Implementation Notes

`/ai intake` now selects a runtime model profile from the rule-based baseline
before invoking Codex CLI. The default remains `gpt-5.5`; a low-risk DOC/VAL
route can use `gpt-5.4-mini`, low reasoning, and `--ephemeral`.

The Codex CLI adapter now accepts:

- `model`
- `reasoning_effort`
- `ephemeral`

These fields are converted to Codex CLI arguments unless equivalent arguments
already exist in `args`.

## Validation Summary

Performed validation:

- Node syntax checks passed for changed Discord orchestrator JS files.
- PowerShell syntax check passed for `codex_cli_adapter.ps1`.
- Codex CLI adapter dry-run with a temp config showed structured
  `model`/`reasoning_effort`/`ephemeral` fields become planned Codex args.
- `codex-mini-latest` live smoke failed because the local ChatGPT account-backed
  Codex CLI does not support that model.
- `gpt-5.4-mini` live smoke passed with `model_reasoning_effort="low"`.
- Local config intake route smoke passed with `gpt-5.4-mini`, low reasoning,
  ephemeral mode, and no rule-based cross-check blocker.
- `git diff --check` passed with line-ending warnings only.

## Remaining Risks

The first attempted candidate, `codex-mini-latest`, was rejected by the local
ChatGPT account-backed Codex CLI. `gpt-5.4-mini` succeeded in a short smoke and
is the current fast candidate. If it becomes unavailable, disable or edit the
local route without changing workflow policy.

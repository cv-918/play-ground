# WF Codex Model Routing and Ephemeral Runs

## Purpose

This document defines the first speed-oriented Codex CLI routing layer for the
Discord-first AIWorkflow harness.

The goal is to reduce latency for low-risk intake and runner work without
weakening approval gates, task state rules, evidence collection, or commit
authority.

---

## Scope

This layer applies to:

- Codex CLI-assisted `/ai intake`
- PC Runner Codex CLI adapter configuration

It does not change Discord slash command schemas, task lifecycle states,
approval policy, completion review gates, task done behavior, commit, push, or
deployment behavior.

---

## Intake Model Routing

`/ai intake` still defaults to `gpt-5.5`.

The local config may define `llm_intake.model_routes`. Each route can match the
rule-based baseline fields produced before the LLM call:

- `categories`
- `kinds`
- `risks`
- `priorities`
- `workflow_paths`

When a route matches, intake uses the route's:

- `model`
- `reasoning_effort`
- `ephemeral`

Example:

```json
{
  "llm_intake": {
    "model": "gpt-5.5",
    "reasoning_effort": "medium",
    "ephemeral": true,
    "model_routes": [
      {
        "id": "fast_low_risk_intake",
        "enabled": true,
        "categories": ["DOC", "VAL"],
        "kinds": ["documentation", "validation"],
        "risks": ["low"],
        "priorities": ["P2", "P3"],
        "model": "gpt-5.4-mini",
        "reasoning_effort": "low",
        "ephemeral": true
      }
    ]
  }
}
```

The selected model, reasoning effort, route id, and ephemeral flag are recorded
in the intake run metadata and displayed in the Discord response.

---

## Codex CLI Adapter Fields

`tools/aiworkflow/codex_cli_adapter.ps1` now supports structured fields in the
local adapter config:

```json
{
  "model": "gpt-5.5",
  "reasoning_effort": "high",
  "ephemeral": false
}
```

The adapter converts these fields into Codex CLI arguments while preserving the
existing `args` field. Existing local configs that already put `--model`, `-m`,
`-c`, or `--ephemeral` in `args` continue to work; the adapter does not add
duplicates.

`ephemeral` maps to Codex CLI `exec --ephemeral`, which avoids persisting Codex
session files for short, repeatable runs. Runtime evidence under `_Temp` is
still collected by AIWorkflow.

## PC Runner Profile Routing

The PC Runner now creates a task-scoped Codex adapter config under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/runner/config/
```

For Codex-backed runner profiles, `pc_runner` passes that generated config to
both `codex_cli_adapter dry-run` and `codex_cli_adapter run` with `--config`.

The generated config starts from:

```text
_Local/AIWorkflow/codex_cli_adapter.local.json
```

Then it applies profile-specific overrides from `runner_profiles` when present:

```json
{
  "runner_profiles": {
    "documentation": {
      "model": "gpt-5.4-mini",
      "reasoning_effort": "low",
      "ephemeral": true
    },
    "implementation": {
      "model": "gpt-5.5",
      "reasoning_effort": "high",
      "ephemeral": false
    }
  }
}
```

When `runner_profiles.documentation` is omitted, the runner still applies the
safe default `gpt-5.4-mini` / `low` / `ephemeral=true` for documentation runs.
Implementation runs keep the base local config unless an explicit
`runner_profiles.implementation` override is provided.

The selected generated config path, model, reasoning effort, and ephemeral flag
are recorded in runner progress/checkpoint artifacts.

---

## Fast Model Candidate

The first fast candidate is:

```text
gpt-5.4-mini
```

It is intended only for low-risk documentation or validation intake
classification unless a later task explicitly expands the routing policy.

Local smoke on this machine confirmed `gpt-5.4-mini` works with the ChatGPT
account-backed Codex CLI. It replaced the earlier `codex-mini-latest`
candidate because the CLI reported that `codex-mini-latest` is not supported
for ChatGPT account usage.

If the local Codex CLI account cannot use the candidate model, the route should
be disabled or changed in `_Local/AIWorkflow/discord_bot.local.json`. The
default `gpt-5.5` path remains available.

---

## Safety Boundaries

Model routing must not:

- bypass Human Director approval
- approve medium/high-risk tasks
- approve P0/P1 tasks
- mark tasks done
- record finalization
- commit, push, release, or deploy
- disable evidence collection
- hide selected model/reasoning metadata from review

The model is an execution detail. Deterministic workflow policy remains the
authority.

---

## Validation

Required validation:

- `node --check tools/discord-orchestrator/src/config.js`
- `node --check tools/discord-orchestrator/src/services/codexCliIntakeService.js`
- `node --check tools/discord-orchestrator/src/services/taskIntakeService.js`
- `node --check tools/discord-orchestrator/src/services/responseFormatter.js`
- PowerShell syntax check for `tools/aiworkflow/codex_cli_adapter.ps1`
- PowerShell syntax check for `tools/aiworkflow/pc_runner.ps1`
- adapter dry-run with a temp config showing structured model/reasoning fields
  become planned Codex arguments
- PC Runner plan/start smoke showing the generated profile config path and
  profile-selected model/reasoning metadata
- intake smoke showing low-risk DOC/VAL route metadata
- `git diff --check`

Live fast-model smoke is allowed when the Human Director wants to confirm local
Codex account/model availability.

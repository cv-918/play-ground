# WF Intake Auto-Handoff

## Purpose

This document defines the first production rule for automatically continuing
from Discord intake into the PC Runner path.

The goal is to reduce repeated manual commands after `/ai intake` without
bypassing Human Director authority for risky work.

---

## Scope

Intake auto-handoff is allowed only after `/ai intake` successfully creates a
validated LLM-assisted TaskDraft and writes one Backlog task.

The handoff may then perform these deterministic steps:

1. set the created task as ActiveTask
2. approve the task with a deterministic low-risk policy note
3. start PC Runner with the selected safe profile/executor

This is not a general auto-approval system.

---

## Eligibility Policy

A task is eligible only when all conditions are true:

- priority is `P2` or `P3`
- suggested risk is `low`
- category is `DOC` or `VAL`, kind is `documentation` or `validation`, or
  category is `WF` with kind `documentation` or `maintenance`
- the TaskDraft has no clarifying questions
- the rule-based cross-check does not require human review
- a supported PC Runner profile/executor can be selected
- `intake_auto_handoff.enabled` is not disabled
- `intake_auto_handoff.auto_start_low_risk` is not disabled

Current profile mapping:

| Task type | Runner profile | Executor |
|---|---|---|
| `DOC` or `documentation` | `documentation` | `codex_cli` |
| `VAL` or `validation` | `validation` | `local_cli` |
| `WF` + `maintenance` | `implementation` | `codex_cli` |

`WF` + `documentation` follows the `documentation/codex_cli` route.

For stable classification, intake text may start with an explicit category
marker such as `DOC task:`, `VAL task:`, `WF task:`, `GAME task:`, or
`UNITY task:`. The rule-based cross-check treats this marker as the strongest
classification hint before scanning ordinary keywords. This prevents phrases
such as "no document changes" from accidentally overriding a validation smoke
request.

---

## Stop Conditions

The task must remain in human approval flow when any condition is true:

- priority is `P0` or `P1`
- suggested risk is `medium` or `high`
- category is `GAME`, `UNITY`, or another non-allowlisted category
- category is `WF` with any kind other than `documentation` or `maintenance`
- kind is source implementation, game data, refactoring, release, or another
  non-allowlisted kind
- clarifying questions exist
- rule-based cross-check asks for human review
- the selected runner profile/executor is unavailable
- any handoff step fails

When auto-handoff is blocked, `/ai intake` still creates the Backlog task and
the Discord response must show why manual approval is needed.

---

## Safety Boundaries

Auto-handoff must not:

- approve P0/P1 or medium/high-risk work
- approve game source, game data, schema, lifecycle, save/load, build setting,
  or workflow command behavior changes
- approve workflow command behavior changes even when the request is otherwise
  classified as WF maintenance
- mark a task done
- record finalization
- apply auto approval
- create follow-up Backlog tasks
- commit, push, release, or deploy

The runner still stops at normal Human Director gates such as
`completion_review_required` and `done_or_commit_decision`.

---

## Discord Response Requirements

`/ai intake` must show:

- whether auto-handoff was evaluated
- decision: `auto_start_allowed`, `runner_started`, `runner_blocked`,
  `blocked`, or `needs_human_approval`
- selected runner profile/executor
- reason or blockers
- which automatic actions ran
- PC Runner ID when a runner run starts
- next command or next review point
- safety flags for Backlog, ActiveTask, approval, PC Runner, and Codex execution

PC Runner responses must show stop-reason-based next commands so the Human
Director does not need to search separate documents during normal operation.

---

## Configuration

Local config:

```json
{
  "intake_auto_handoff": {
    "enabled": true,
    "auto_start_low_risk": true
  }
}
```

Both fields default to enabled when omitted.

Disable `enabled` to prevent all intake auto-handoff.

Disable `auto_start_low_risk` to keep policy evaluation visible while requiring
manual runner start.

---

## Validation

Required validation:

- `node --check tools/discord-orchestrator/src/config.js`
- `node --check tools/discord-orchestrator/src/services/intakeTaskCreationService.js`
- `node --check tools/discord-orchestrator/src/services/taskIntakeService.js`
- `node --check tools/discord-orchestrator/src/services/intakeAutoHandoffService.js`
- `node --check tools/discord-orchestrator/src/services/responseFormatter.js`
- policy smoke: explicit `VAL task:` stays `VAL/validation` even when the text
  says no source or document changes
- policy smoke: low-risk DOC is eligible
- policy smoke: low-risk WF documentation and WF maintenance are eligible
- policy smoke: P1/WF automation and workflow command behavior changes are
  blocked
- formatter smoke: runner stop reasons produce next commands
- Discord smoke: `/ai intake` creates a low-risk DOC, VAL, or allowlisted WF
  task and reaches PC Runner without manual `set-active`, `approve`, or
  `runner start`

Discord smoke may be performed by the Human Director because it uses the live
Discord bot.

---

## Completion Criteria

This layer is complete when:

- low-risk DOC/VAL and allowlisted low-risk WF intake can auto-handoff to PC
  Runner
- higher-risk tasks remain behind human approval
- Discord response explains automatic actions and next review point
- PC Runner response includes next commands for common stop reasons
- docs describe the policy and configuration
- no automatic done, finalization, commit, push, release, or deploy is added

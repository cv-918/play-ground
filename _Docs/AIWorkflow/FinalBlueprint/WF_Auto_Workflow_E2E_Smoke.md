# WF Auto Workflow E2E Smoke

## Purpose

This smoke verifies that the Discord-first automatic workflow path can advance
through the current normal low-risk validation route without requiring manual
Codex prompt copy/paste.

It exercises the same service path used by Discord commands, but runs inside a
temporary repository copy under the OS temp directory so the real Backlog and
ActiveTask files are not modified by the smoke itself. Only the final smoke
summary is written under repository `_Temp`.

The temporary repository includes the workflow documents, `tools/aiworkflow`,
and `PlayGround/Data` so the current validation runner can execute its JSON
smoke check without touching the real repository.

## Covered Flow

```text
intake request
-> LLM-assisted TaskDraft
-> Backlog task creation in temp repo
-> deterministic auto-handoff policy
-> set-active in temp repo
-> approve in temp repo
-> PC Runner validation/local_cli background start
-> status polling until runner artifacts exist
-> completion_review_required
-> runner accept-completion shortcut
-> FinalizationLog in temp repo
-> PC Runner continue
-> done_or_commit_decision
```

## Local Command

Run from repository root:

```bat
npm --prefix tools\discord-orchestrator run smoke:auto-workflow
```

The smoke writes runtime evidence under:

```text
%TEMP%/AIWorkflowDiscordBotSmoke/
```

It writes a report summary under:

```text
_Temp/AIWorkflowDiscordBot/smoke/
```

The expected final report contains:

```text
ok: true
runner_start_stop_reason: completion_review_required
runner_start_detached: true
final_stop_reason: done_or_commit_decision
real_repo_state_modified: false
```

## Latest Local Evidence

2026-05-13 local run:

```text
task_id: VAL-20260513-205738
intake_decision: runner_started
runner_start_detached: true
runner_start_stop_reason: completion_review_required
final_stop_reason: done_or_commit_decision
real_repo_state_modified: false
```

## Safety Boundaries

The smoke must not:

- modify the real `_Docs/AIWorkflow/Backlog.md`
- modify the real `_Docs/AIWorkflow/ActiveTask.md`
- mark a real task done
- commit or push
- write tracked `_Local`, `_Temp`, `node_modules`, `.env`, or local config files
- execute arbitrary user-provided shell commands

The smoke does call local Codex CLI for intake TaskDraft generation and local PC
Runner primitives in the temp repo.

## Discord Equivalence

This is not a Discord UI click test. It is a service-path E2E smoke for the
logic behind:

```text
/ai intake
/ai runner accept-completion
```

After this passes, the remaining Discord-only check is that the registered slash
command surface exposes the expected commands.

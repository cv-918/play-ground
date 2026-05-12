# Active Task

## Purpose

This file represents the current active AI Orchestrator workflow task.

There should be only one active task represented here at a time.

---

## Active Task Metadata

```yaml
task_id: WF-411
title: Harden implementation runner prompt boundaries and UTF-8 output guard
status: done
workflow_path: discord_task_management
priority: P1
risk_level: medium
requested_by: human_director
requested_at: 2026-05-12
last_updated: 2026-05-12
```

---

## Goal

Harden the controlled PC Runner `implementation` profile based on WF-410 smoke
friction.

The executor-facing prompt must clearly separate Codex executor responsibilities
from PC Runner-owned runtime validation. The runner must also detect likely
mojibake in Codex CLI output or changed text files and stop before completion
artifacts if the guard finds probable encoding corruption.

---

## Tool Route

```yaml
discord: target user-facing control surface
pc_runner: implementation profile orchestration and encoding guard
codex_cli_adapter: guarded Codex CLI execution
codex_app: implementation, review, validation, and commit/push if safe
human: final authority if new approval-sensitive behavior appears
validation: required
```

---

## Files In Scope

```text
tools/aiworkflow/pc_runner.ps1
tools/aiworkflow/README.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile.md
_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile_KR.md
_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Runner_Prompt_And_UTF8_Guard.md
_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Runner_Prompt_And_UTF8_Guard_KR.md
_DevLog/WorkLog/2026-05-12_WF-411_Implementation_Runner_Prompt_UTF8_Guard.md
```

Local-only, not tracked:

```text
_Temp/AIWorkflowRuntime/tasks/WF-411/
```

---

## Human Action Required

```text
No additional approval is required unless implementation expands beyond runner prompt boundary hardening, text encoding guard, documentation, and validation.
```

---

## Validation Plan

```text
PowerShell parser check for pc_runner.ps1
pc_runner plan WF-411 profile:implementation
Prompt artifact inspection for executor/runtime boundary wording
Text encoding guard pass smoke with clean text
Text encoding guard stop smoke with synthetic mojibake text
git diff --check
forbidden tracked path check for _Temp, _Local, node_modules, .env, and local config files
private/local tracked-file check
```

---

## Latest Status Note

```text
status: done
note: WF-411 implemented and validated. PC Runner implementation prompts now separate executor-owned tracked edits from runner-owned runtime validation, and implementation runs include a text encoding guard before completion artifacts. Full runner execution reached completion_review_required with no blocking text guard findings. The remaining completion-card concern was an expected large-diff attention signal; current finalization policy cannot accept a needs_human_decision CompletionReport, so that friction is tracked as the next workflow candidate.
updated_at: 2026-05-12
source: Codex App
```

---

## Next Recommended Task

```text
Proceed to WF-412: add a reviewed-concern finalization path so expected completion concerns can be explicitly accepted without bypassing audit records.
```

---

## Completion Criteria

```text
[x] Task scope reviewed
[x] Required approvals recorded
[x] Implementation completed within approved scope
[x] Review completed
[x] Validation completed or explicitly deferred
[x] Dev Log created for meaningful work
[x] Commit/push completed if no additional approval is required
```

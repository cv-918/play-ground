# WF-407 Unified PC Runner Implementation Report

## Summary

WF-407 implemented the unified PC Runner orchestration entrypoint defined by
WF-406.

The runner is now available as a single local command surface:

```text
tools\aiworkflow\pc_runner.bat <command> <task_id> [options]
```

It coordinates existing AIWorkflow runtime primitives, records runner-owned
artifacts under `_Temp`, exposes a Discord `/ai runner` command group, and stops
at Human Director gates instead of approving, marking done, committing, or
pushing automatically.

## Implemented Command Surface

Local commands:

```text
pc_runner.bat status <task_id> [--json]
pc_runner.bat plan <task_id> [--profile validation] [--executor local_cli] [--json]
pc_runner.bat start <task_id> [--profile validation] [--executor local_cli] [--json]
pc_runner.bat continue <task_id> [--runner-run-id <id>] [--json]
pc_runner.bat stop <task_id> [--runner-run-id <id>] [--json]
pc_runner.bat read <task_id> [--runner-run-id <id>] [--json]
```

Discord commands:

```text
/ai runner status
/ai runner plan
/ai runner start
/ai runner continue
/ai runner stop
/ai runner read
```

## Behavior Model

`pc_runner start` performs preflight checks before execution:

- the task must exist in Backlog
- the active task must match
- P0/P1/high-risk work must be explicitly approved
- runner artifacts are written only under `_Temp/AIWorkflowRuntime`
- the normal validation profile uses only existing allowlisted primitives

The validation profile currently coordinates:

1. Task Workspace Manager
2. Session Supervisor
3. Local CLI Adapter
4. Evidence Collector
5. File Watcher
6. Result Collector
7. Diff Analyzer
8. Build/Test Runner JSON smoke
9. VerificationReport
10. CompletionReport
11. Completion Card

It then stops at `completion_review_required`.

`pc_runner continue` requires a recorded FinalizationLog before it proceeds. If
finalization exists, it generates:

- AutoApprovalPolicy evaluation
- FollowUpPlan

It then stops at `done_or_commit_decision`.

## Authority Boundaries

The runner does not:

- approve tasks
- mark tasks done
- create Backlog tasks
- commit
- push
- run arbitrary user-provided shell commands
- modify game source or game data
- write tracked local config

Task lifecycle state and runtime execution state remain separate. The runner
only reads Backlog/ActiveTask for preflight and writes runtime execution
artifacts under `_Temp`.

## Validation Evidence

Commands exercised during WF-407:

```text
node --check tools\discord-orchestrator\src\commands\ai.js
node --check tools\discord-orchestrator\src\services\pcRunnerService.js
node --check tools\discord-orchestrator\src\services\responseFormatter.js
PowerShell parser check for tools\aiworkflow\pc_runner.ps1
tools\aiworkflow\pc_runner.bat status WF-407 --json
tools\aiworkflow\pc_runner.bat plan WF-407 --profile validation --json
tools\aiworkflow\pc_runner.bat start WF-407 --profile validation --json
tools\aiworkflow\pc_runner.bat read WF-407 --runner-run-id runner-run-wf-407-20260512-115750-240 --json
tools\aiworkflow\pc_runner.bat continue WF-407 --runner-run-id runner-run-wf-407-20260512-115750-240 --json
tools\aiworkflow\pc_runner.bat start WF-408 --profile validation --json
Discord slash command builder smoke for /ai runner commands
pcRunnerService status/plan smoke through Node import
JSON parse check for generated WF-407 runner artifacts
```

Observed evidence:

- WF-407 runner validation run reached `completion_review_required`.
- Finalization-gated `continue` refused to proceed before FinalizationLog.
- After FinalizationLog, `continue` produced AutoApprovalPolicy and FollowUpPlan.
- WF-408 unapproved P1 start refused with `approval_required`.
- Generated WF-407 runner JSON artifacts parsed successfully.
- `/ai runner` command group registered six subcommands and remained within
  Discord command option limits.

## Remaining Human Decisions

WF-408 should decide which legacy/bootstrap/manual-escalation commands remain
visible, deprecated, renamed, hidden, or removed now that the runner entrypoint
exists.

## Next Task

```text
WF-408 Apply approved workflow cleanup
```

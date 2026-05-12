# WF Workflow Audit and Pruning Report

## Purpose

This report audits the current AIWorkflow operating surface after WF-309 and
identifies workflow simplification, documentation, command consolidation, and
deprecation candidates.

This is an audit only. It does not remove commands, change workflow behavior,
change approval policy, or modify source/game data.

## Current Regular Path

The current practical path is:

```text
1. /ai intake text:<request>
2. /ai task set-active id:<task_id>
3. /ai task approve id:<task_id> note:<scope>
4. /ai prepare goal id:<task_id> mode:<mode> context:<context>
5. Execute through the approved current path
6. /ai result audit id:<task_id> result:<summary>
7. Review/validate evidence
8. /ai completion report
9. /ai completion card
10. /ai finalization accept/accept-concerns/request-changes/reject/defer
11. /ai task done id:<task_id> evidence:<evidence>
12. Manual commit decision
```

The final target path is shorter for the Human Director:

```text
1. Give a task goal.
2. Approve work only when policy requires human approval.
3. Optionally check progress.
4. Review completion evidence.
5. Approve commit or finalization only when policy requires it.
```

The gap between these two paths is the Phase 4 work.

## Command Surface Inventory

### Primary Task Commands

These commands are part of normal task state operation:

- `/ai intake`
- `/ai task set-active`
- `/ai task approve`
- `/ai task done`
- `/ai completion report`
- `/ai completion card`
- `/ai finalization accept`
- `/ai finalization accept-concerns`
- `/ai finalization request-changes`
- `/ai finalization reject`
- `/ai finalization defer`

### Primary Future Runtime Commands

These are implemented as local primitives, but are not yet unified behind one
normal Discord-first runner path:

- `task_workspace_manager.bat`
- `session_supervisor.bat`
- `evidence_collector.bat`
- `codex_cli_adapter.bat`
- `local_cli_adapter.bat`
- `file_watcher.bat`
- `runtime_control_adapter.bat`
- `result_collector.bat`
- `diff_analyzer.bat`
- `build_test_runner.bat`
- `verification_report.bat`
- `completion_report.bat`
- `completion_card.bat`
- `finalization_log.bat`
- `auto_approval_policy.bat`
- `follow_up_task_generator.bat`

### Optional, Diagnostic, or Admin Commands

These commands are useful but should not be presented as required regular-path
steps:

- `/ai status`
- `/ai active`
- `/ai backlog`
- `/ai next`
- `/ai blockers`
- `/ai docs`
- `/ai project list`
- `/ai project profile`
- `/ai role status`
- `/ai task current`
- `/ai task list`
- `/ai task review-intake`
- `/ai intake-engine status`
- `/ai bot status`
- `/ai bot restart`
- `/ai run workflow-status`
- `/ai run active-project`
- `/ai run project-profile`
- `/ai run json-smoke`
- `/ai run capture-diff`

### Bootstrap or Manual-Escalation Commands

These commands should remain available, but should be documented as fallback
paths rather than the final architecture:

- `/ai prepare codex`
- `/ai prepare goal`
- `/ai result audit`
- `/ai intake-preview`
- `/ai intake-test`
- `/ai task create`
- `/ai intake-create`

## Pruning and Consolidation Candidates

| Candidate | Current role | Recommendation |
| --- | --- | --- |
| `/ai intake-create` | Compatibility alias for `/ai intake`. | Keep temporarily, then hide/deprecate after WF-402 approval. |
| `/ai prepare codex` | Legacy Codex App prompt package path. | Keep as manual escalation; remove from regular guide. |
| `/ai prepare goal` | Manual Codex CLI goal request generation. | Keep as bootstrap/manual escalation until WF-407 runner is available. |
| `/ai result audit` | Audits pasted manual execution summaries. | Keep for manual escalation; later make it secondary to ExecutionResult/VerificationReport. |
| `/ai role status` | Detailed role routing diagnostics. | Keep diagnostic; do not require in regular path. |
| `/ai task review-intake` | Read-only intake-created task readiness review. | Keep diagnostic; consider folding key readiness into intake/set-active cards. |
| `/ai run capture-diff` | Manual diff capture fallback. | Keep fallback; future regular path should rely on file watcher/diff snapshots. |
| `tools/aiworkflow/status.bat` | Broad local diagnostic status. | Keep local diagnostic; do not expose as normal product flow. |
| `run_result_semantics_check.bat` | Game-specific validation helper. | Keep as project validation helper, not core workflow command. |

## Documentation Drift

The following drift should be fixed in WF-403/WF-404 or WF-408:

- `tools/discord-orchestrator/README.md` regular path still says "Run Codex
  manually outside Discord" as the normal path. That is now a bootstrap/manual
  escalation path, not the target architecture.
- `tools/discord-orchestrator/README.md` supported-command list does not include
  the newer `/ai auto-approval ...` and `/ai follow-up ...` commands.
- `tools/discord-orchestrator/README.md` validation checklist still contains
  stale intake expectations such as `/ai intake` not modifying Backlog, even
  though current `/ai intake` creates one Backlog task after TaskDraft
  validation.
- `tools/aiworkflow/README.md` does not yet document
  `auto_approval_policy.bat` and `follow_up_task_generator.bat` in the script
  list, detailed command sections, or recommended check list.
- `_Docs/AIWorkflow/README.md` and `09_Operational_Playbook.md` describe the
  current bootstrap path, but the post-WF-309 Phase 4 target path still needs a
  dedicated technical workflow document.

## User Intervention Audit

The Human Director should remain responsible for:

- initial goal submission
- approval when a task is high-risk, P0/P1, structural, policy-changing, or
  outside an established auto-approval rule
- runtime control decisions such as stop, retry, replan, scope reduction, or
  manual escalation when policy requires human review
- completion review and finalization decision
- commit or push decision
- destructive cleanup such as command removal or behavior change

The harness should automate or prepare:

- TaskDraft generation
- Backlog task creation from validated intake
- task workspace preparation
- executor selection and guarded execution
- session heartbeat and progress display
- file watching and diff snapshots
- evidence collection
- result collection
- diff analysis
- build/test command execution through allowlisted command IDs
- VerificationReport generation
- CompletionReport and Completion Card generation
- FinalizationLog recording after explicit human decision
- Auto Approval Policy evaluation only
- Follow-up task candidate generation only

## Workflow Paths to Document Next

WF-403 should document at least these paths:

- new task intake path
- existing Backlog task path
- manual escalation path
- PC Runner execution path
- runtime control path
- completion/finalization path
- follow-up candidate path
- diagnostic/admin path
- commit decision path

## Recommended Next Work

1. WF-402 should define the command surface categories and deprecation plan.
2. WF-403 should write the full technical workflow specification and
   visualization.
3. WF-404 should write the Korean Human Director operation guide.
4. WF-406/WF-407 should introduce a unified PC Runner orchestration entrypoint
   so normal work no longer depends on manual Codex result paste/audit.

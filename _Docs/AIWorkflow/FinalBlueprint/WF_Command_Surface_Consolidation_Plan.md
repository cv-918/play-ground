# WF Command Surface Consolidation Plan

## Purpose

This document defines the WF-402 command surface consolidation and deprecation
plan after the WF-401 workflow audit.

This is a plan only. It does not remove commands, rename commands, change
command behavior, change slash command metadata, or alter approval authority.

## Command Categories

### Category A. Regular Human Director Path

These commands belong in the normal user-facing workflow guide after the
unified PC Runner entrypoint is available:

- `/ai intake`
- `/ai task set-active`
- `/ai task approve`
- `/ai runner plan`
- `/ai runner start`
- `/ai runner continue`
- `/ai completion card`
- `/ai finalization accept`
- `/ai finalization accept-concerns`
- `/ai finalization request-changes`
- `/ai finalization reject`
- `/ai finalization defer`
- `/ai task done`

### Category B. Future Runner-Owned Path

These local primitives are internal steps behind the unified PC Runner
orchestration command where possible:

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

They should stay callable locally for diagnostics and recovery, but the normal
Human Director workflow should not require running them one by one.

### Category C. Diagnostic and Admin Surface

These commands should remain available, but documentation should label them as
inspection, troubleshooting, or admin commands:

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

### Category D. Compatibility or Manual Escalation Surface

These commands should remain available for now, but should not be presented as
the final product path:

- `/ai intake-create`
- `/ai intake-preview`
- `/ai intake-test`
- `/ai task create`
- `/ai prepare codex`
- `/ai prepare goal`
- `/ai result audit`

## Deprecation Plan

| Command or path | Current status | WF-402 decision | Later action |
| --- | --- | --- | --- |
| `/ai intake-create` | Compatibility alias for `/ai intake`. | Mark as compatibility alias. | After guide/docs update, change copy to "use /ai intake"; removal only with explicit approval. |
| `/ai prepare codex` | Legacy Codex App prompt package. | Keep as manual escalation. | Remove from regular guide; keep in troubleshooting/admin docs. |
| `/ai prepare goal` | Manual Codex CLI goal request. | Keep as manual escalation. | Remove from regular guide; keep in troubleshooting/admin docs. |
| `/ai result audit` | Manual result paste audit. | Keep as manual escalation audit. | Use only when runner evidence collection is unavailable or bypassed. |
| `/ai task review-intake` | Detailed intake activation review. | Keep diagnostic. | Fold essential readiness summary into intake/set-active cards later. |
| `/ai run capture-diff` | Manual diff capture. | Keep fallback. | Normal path should use file watcher/diff snapshots after WF-407. |
| `capture_diff.bat` | Local diff capture helper. | Keep fallback. | Keep for manual review and emergency audit. |
| `run_result_semantics_check.bat` | Project-specific game validation helper. | Keep project helper. | Do not present as core workflow command. |

## Documentation Cleanup Plan

WF-403/WF-404 should use this command taxonomy.

WF-408 should update:

- `tools/discord-orchestrator/README.md`
- `tools/aiworkflow/README.md`
- `_Docs/AIWorkflow/09_Operational_Playbook.md`
- `_Docs/AIWorkflow/README.md`
- slash command descriptions only if the Human Director approves metadata copy
  changes

## Removal Rules

Commands must not be removed simply because they are not part of the regular
path. A command can be removed only when all of these are true:

1. It has a replacement or is proven unused.
2. It is not required for manual escalation, diagnostics, recovery, or audit.
3. The documentation no longer depends on it.
4. The Human Director explicitly approves removal.
5. Validation confirms command registration and workflow docs remain coherent.

## Recommended User-Facing Language

The final guide should avoid telling the Human Director to run every primitive.
Use categories instead:

```text
Normal workflow: use these commands.
Progress/review: use these when you want to inspect.
Manual escalation: use these only when the runner path is unavailable or a human override is needed.
Admin/diagnostic: use these for bot, engine, or state troubleshooting.
```

## Decisions Needed Before WF-408

WF-408 applies these non-destructive decisions:

1. Keep `/ai intake-create` registered, but label it as a compatibility alias.
2. Keep `/ai prepare codex` and `/ai prepare goal` registered as manual
   escalation commands.
3. Keep `/ai result audit` registered as a manual escalation audit command.
4. Keep diagnostic/admin commands registered, but label them as diagnostic or
   recovery surfaces.
5. Do not remove commands in WF-408.

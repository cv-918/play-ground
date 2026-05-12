# WF-406 Unified PC Runner Design

## Summary

Designed the unified PC Runner orchestration entrypoint that should replace the
manual primitive-by-primitive bootstrap path.

## Scope

- Define runner command surface.
- Define runner authority boundaries.
- Define runtime runner artifacts.
- Define phases, stop gates, ID policy, runtime control integration, and WF-407
  acceptance criteria.
- Incorporate WF-405 smoke findings.

## Non-Goals

- No runner implementation.
- No command removal or slash metadata change.
- No automatic task approval, done, commit, push, release, or deploy.
- No game source/data changes.

## Files Changed

- `_Docs/AIWorkflow/FinalBlueprint/WF_Unified_PC_Runner_Orchestration_Entrypoint.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Unified_PC_Runner_Orchestration_Entrypoint_KR.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap_KR.md`
- `_DevLog/WorkLog/2026-05-12_WF-406_Unified_PC_Runner_Design.md`

## Design Notes

The runner is designed as a controlled coordinator, not a new authority layer.
It may execute approved substeps and write runtime artifacts, but it must stop
at human approval, completion, done, and commit/push gates.

WF-405 findings were included:

- central ID generation must hide `bt-` and other artifact prefix rules
- named PowerShell invocation is safer than brittle `.bat` positional calls for
  complex child commands
- progress should be exposed as one compact runner status/card

## Validation

Documentation validation only. Script implementation validation is deferred to
WF-407 because this task does not add runner code.

# Post-WF-309 Workflow Stabilization Roadmap

## Summary

Defined the Phase 4 follow-up task sequence after WF-309. The new sequence
turns the completed runtime primitives into a practical Discord-first workflow
through audit, command surface consolidation, technical documentation, user
operation guidance, end-to-end smoke validation, PC Runner orchestration, and
approved cleanup.

## Background

WF-201 through WF-309 completed the main execution, monitoring, evidence,
verification, completion, finalization, policy, and follow-up primitives. The
Human Director requested a new follow-up list that includes full workflow audit,
unnecessary step and command review, obsolete path review, full technical
workflow documentation, workflow visualization, step-by-step user intervention
markers, workflow path explanation, and a workflow-based operation guide.

## Scope

In scope:

- Add a post-WF-309 stabilization roadmap.
- Add WF-400 through WF-408 task sequence to Backlog.
- Update the implementation roadmap and README document map.
- Update ActiveTask to record WF-400 completion.

Out of scope:

- Command removal.
- Workflow behavior changes.
- PC Runner orchestration implementation.
- Automatic approval, done, commit, or push.
- Game source or game data changes.

## Files Changed

- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Roadmap.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_DevLog/WorkLog/2026-05-12_Post_309_Workflow_Stabilization_Roadmap.md`

## Architecture Notes

The new Phase 4 sequence preserves the separation between Task Lifecycle State,
Runtime Execution State, evidence collection, verification reporting,
completion/finalization, policy evaluation, and follow-up candidate generation.

Cleanup is intentionally placed after audit and command-surface planning so no
command or workflow path is removed without a reviewed inventory and explicit
approval.

## Validation Summary

Completed validation:

- Reviewed the roadmap and Backlog diff.
- Ran `git diff --check` on the changed workflow documentation set; it passed
  with line-ending warnings only.
- Confirmed that this task changed only workflow documentation and DevLog files.
- Confirmed that the next recommended workflow task is WF-401.

Known working-tree note:

- `PlayGround/Data/UserData.json` was already modified outside this
  documentation task and was left untouched.

## Remaining Risks

- The actual command surface may contain obsolete or overlapping commands that
  should not be changed until WF-401/WF-402 inventory and approval.
- End-to-end workflow usability is not proven by this roadmap alone; WF-405 is
  required for representative smoke evidence.

## Next Tasks

1. WF-401 Audit full workflow and pruning candidates.
2. WF-402 Define command surface consolidation and deprecation plan.
3. WF-403 Write end-to-end workflow technical specification.

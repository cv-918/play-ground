# WF-403 End-to-End Workflow Technical Specification

## Summary

Created the source-of-truth technical workflow specification for the
post-WF-309 Discord-first PC Runner-based AIWorkflow harness.

## Background

WF-400 defined the Phase 4 stabilization roadmap, WF-401 audited the workflow
surface, and WF-402 classified the command surface. WF-403 turns those findings
into a technical workflow document that can guide WF-404 user documentation and
WF-406/WF-407 PC Runner orchestration design.

## Scope

In scope:

- End-to-end workflow technical specification.
- Mermaid workflow visualization.
- User intervention matrix.
- Durable workflow state paths.
- Discord bot working artifact paths.
- Runtime workspace and report artifact paths.
- Workflow path variants.
- Approval and stop rules.
- WF-404 handoff.
- Backlog, ActiveTask, README, roadmap, and DevLog updates.

Out of scope:

- Command removal.
- Command metadata changes.
- PC Runner orchestration implementation.
- Automatic approval, done, commit, or push.
- Game source or game data changes.

## Files Changed

- `_Docs/AIWorkflow/FinalBlueprint/WF_End_To_End_Workflow_Technical_Spec.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_DevLog/WorkLog/2026-05-12_WF-403_End_To_End_Workflow_Technical_Spec.md`

## Review Summary

The specification keeps Human Director authority over approvals, completion,
done state, command removal, and commit/push decisions. It treats manual
Codex/Codex CLI prompt preparation as bootstrap or manual escalation, not the
final architecture.

## Validation Summary

Completed validation:

- Reviewed technical specification content and Backlog/ActiveTask updates.
- Ran `git diff --check` on the changed workflow documentation set; it passed
  with line-ending warnings only.
- Confirmed no command removal, metadata change, or behavior change was made by
  this task.
- Confirmed no game source/data changes were made by this task.

## Remaining Risks

- The document is a technical source of truth, not a user guide. WF-404 is still
  needed to produce the practical Korean Human Director guide.
- No live Discord or PC Runner smoke execution was performed for this
  documentation task. WF-405 should cover representative smoke validation.

## Next Tasks

1. WF-404 Write Human Director workflow operation guide.
2. WF-405 Run end-to-end workflow smoke and validation pack.
3. WF-406 Design unified PC Runner orchestration entrypoint.

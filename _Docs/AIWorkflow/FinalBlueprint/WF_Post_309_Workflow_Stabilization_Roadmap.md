# WF Post-309 Workflow Stabilization Roadmap

## Purpose

WF-201 through WF-309 created the runtime execution, monitoring, evidence,
verification, completion, finalization, policy, and follow-up primitives.

The next product phase is not another isolated primitive. The next phase turns
those primitives into a stable Discord-first operating workflow that the Human
Director can use with minimal intervention while preserving approval authority.

This roadmap incorporates the post-WF-309 follow-up requirements:

- audit the full workflow
- identify unnecessary steps
- identify unnecessary or obsolete commands
- identify deprecated workflow paths
- collect improvement items
- write the full technical workflow documentation
- visualize the end-to-end workflow
- explain every step with user intervention markers
- explain the included workflow paths
- write a practical workflow-based operation guide

## Operating Target

The target user role is:

```text
1. Give a task goal.
2. Approve work only when policy requires human approval.
3. Optionally check progress while execution is running.
4. Review the completed work and evidence.
5. Approve commit or finalization only when policy requires it.
```

The PC Runner and workflow harness should own structured state, execution
routing, session supervision, evidence collection, verification report
generation, completion reporting, finalization records, policy evaluation, and
follow-up candidate generation.

## Non-Goals

This phase must not silently change the authority model.

Non-goals unless a later task explicitly approves them:

- automatic task approval
- automatic task done
- automatic commit or push
- command removal before audit and approval
- game source or game data changes
- merging Task Lifecycle State with Runtime Execution State
- letting an LLM become the final approval authority

## Phase 4 Task Sequence

| ID | Title | Goal | Human intervention |
| --- | --- | --- | --- |
| WF-400 | Define post-WF-309 workflow stabilization roadmap | Record this Phase 4 task sequence in the roadmap, Backlog, ActiveTask, and DevLog. | Review only unless concerns are found. |
| WF-401 | Audit full workflow and pruning candidates | Inventory current workflow paths, required steps, stale steps, unnecessary steps, command surface, deprecated commands, and improvement candidates. | Review audit findings before removal or behavior changes. |
| WF-402 | Define command surface consolidation and deprecation plan | Classify Discord/local commands as primary, admin, diagnostic, bootstrap/manual escalation, deprecated, or removal candidates. | Approve deprecation/removal plan. |
| WF-403 | Write end-to-end workflow technical specification | Produce the technical source-of-truth workflow document with visualization, step details, user intervention markers, state paths, runtime paths, evidence/report paths, and path variants. | Review document accuracy. |
| WF-404 | Write Human Director workflow operation guide | Produce a practical Korean guide for requesting work, approving work, monitoring progress, reviewing completion, handling follow-ups, and deciding commits. | Review guide usability. |
| WF-405 | Run end-to-end workflow smoke and validation pack | Exercise a representative low-risk task through intake, approval, workspace, execution, evidence, result, verification, completion, finalization, and follow-up reporting. | Review evidence and decide whether the workflow is usable. |
| WF-406 | Design unified PC Runner orchestration entrypoint | Define how one controlled runner command should chain the existing primitives while preserving approval gates, runtime state boundaries, and evidence/report handoffs. | Approve the orchestration authority model. |
| WF-407 | Implement unified PC Runner orchestration entrypoint | Implement the approved orchestration command and Discord surface that advances a task through safe automated substeps and stops at human gates. | Approve any policy-sensitive behavior before enabling it. |
| WF-408 | Apply approved workflow cleanup | Remove, hide, rename, or deprecate obsolete steps and commands according to the approved audit and command-surface plan. | Approve destructive command removal or behavior changes. |

## Recommended Order

```text
WF-400 done
-> WF-401 audit done
-> WF-402 command surface plan done
-> WF-403 technical workflow specification done
-> WF-404 Human Director operation guide done
-> WF-405 end-to-end smoke validation done
-> WF-406 orchestration entrypoint design done
-> WF-407 orchestration entrypoint implementation done
-> WF-408 approved cleanup
```

WF-401 and WF-402 come before cleanup because command removal or workflow
simplification must be based on a reviewed inventory. WF-403 and WF-404 come
before the final cleanup implementation so the current and target operating
models remain visible during review.

## Completion Target

Phase 4 is complete when:

- the current workflow is audited
- obsolete or unnecessary steps are explicitly classified
- the end-to-end workflow technical document exists
- the Human Director operation guide exists
- at least one representative end-to-end smoke scenario has evidence
- the PC Runner has a unified orchestration path for normal work
- deprecated command cleanup is either completed or explicitly deferred with a reason

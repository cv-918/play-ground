# Super Bot Stage 1 Templates

Status: Active index
Scope: Super Bot Stage 1 operational templates under `_Docs/AIWorkflow/Studio/Templates/`

Path note: despite the `Studio` path segment, this directory is an AIWorkflow / Super Bot operating artifact area, not the source of truth for current Studio product direction. Current Studio product-direction documents live under `_Docs/Studio/`.

## Purpose

This directory contains practical templates for running Super Bot Stage 1 work in a consistent, evidence-backed, scope-controlled way.

Use these templates to turn a user request into a bounded task flow:

1. intake
2. design / plan
3. progress record
4. completion record and design-vs-completion gap analysis

The templates are operating aids. They do not replace the primary operating rules.

## Template Use Order

1. `SuperBot_Intake_Template.md`
   - Use first to classify the request, define goal/scope/non-goals, identify ambiguity, set permission boundaries, and choose the next action.
2. `SuperBot_Design_Plan_Template.md`
   - Use after intake and before meaningful implementation, document changes, workflow changes, or tool execution with side effects.
3. `SuperBot_Progress_Record_Template.md`
   - Use during work to record timeline, tools, decisions, changed files, blockers, scope-change signals, next actions, and verification status.
4. `SuperBot_Completion_Gap_Template.md`
   - Use after execution, verification, and self-review to record completion, risks, human decisions, commit recommendation, and design-vs-completion gap analysis.

## Template Roles

| Template | Role | Default output area |
| --- | --- | --- |
| `SuperBot_Intake_Template.md` | Request intake and permission-boundary classification. | Chat, WorkOrder preface, or task record as appropriate. |
| `SuperBot_Design_Plan_Template.md` | Pre-execution design and plan review. | `_Docs/AIWorkflow/Studio/WorkOrders/` unless a task-specific packet says otherwise. |
| `SuperBot_Progress_Record_Template.md` | In-progress state, tool, file, blocker, and scope-change tracking. | `_Docs/AIWorkflow/Studio/RoleRuns/` unless a task-specific packet says otherwise. |
| `SuperBot_Completion_Gap_Template.md` | Completion evidence, unexecuted verification, remaining risks, human decisions, and design-vs-completion gap analysis. | `_Docs/AIWorkflow/Studio/ResultReviews/` unless a task-specific packet says otherwise. |

## Full Template vs Compact Form

Use the full template when:

- the task changes files, behavior, workflow, docs, runtime, schema, build settings, or automation;
- the task has meaningful ambiguity, risk, or approval boundaries;
- the work involves multiple steps, tools, or verification claims;
- the output should remain as a durable record;
- commit, push, cron, Discord management, Hermes config/skill, or other protected actions may be involved.

Use a compact form when:

- the task is a small read-only answer;
- the user asks for a quick explanation or rough draft;
- no files, tools with side effects, workflow policy, or validation claims are involved;
- the needed scope/permission boundary is obvious and low risk.

Even in compact form, do not omit ambiguity or permission-boundary notes when they affect implementation, validation, or final behavior.

## Relationship to Primary Operating Rules

Primary operating rules remain:

1. current explicit user instruction;
2. approved scope / Work Packet / Handoff / task contract;
3. `AGENTS.md`;
4. `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md`;
5. `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md`;
6. Hermes skill `super-bot-stage1` for Hermes-side behavior.

These templates help apply those rules. If a template conflicts with a primary operating rule, follow the higher-priority rule and report the conflict.

## Relationship to ResultReviews

Templates are reusable operating forms.

ResultReviews are evidence records of completed or assessed work, stored under:

```text
_Docs/AIWorkflow/Studio/ResultReviews/
```

Do not treat a ResultReview as a blank template. Use ResultReviews to check what happened, what passed, what failed, and what risks remained. Use this directory's templates to structure new work.

## Commit / Push Boundary

Creating, updating, or reviewing templates does not approve git commit or push.

Commit and push remain separate human decisions and require explicit approval in the current task scope.

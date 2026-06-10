# Super Bot Intake Template

Status: Template
Scope: Super Bot Stage 1 task intake before execution

## Purpose

Use this template when a Super Bot Stage 1 task needs structured intake before planning, implementation, documentation changes, tool execution, or approval decisions.

For tiny read-only answers, a shortened form is acceptable. For implementation, workflow, architecture, runtime, data/schema, or document-change work, fill this template before proceeding.

## Template

```md
# Intake

## 1. Request Classification
- Type: read-only / implementation / workflow-policy / protected-change / unclear
- Reason:

## 2. Goal
- User-visible goal:
- Operational goal:

## 3. Scope
- Included:
- Target repo/path/system, if known:
- Allowed actions:

## 4. Non-goals
- Explicitly excluded:
- Adjacent work not included:

## 5. Success Criteria
- Required outcome:
- Evidence needed:
- Validation method, if applicable:

## 6. Ambiguity
- Blocking ambiguity:
- Non-blocking ambiguity:
- Assumptions, if proceeding:

## 7. Permission Boundary
- Already approved:
- Needs clarification:
- Needs explicit approval:
- Stop conditions:

## 8. Risks
- Scope risk:
- Technical risk:
- Workflow/policy risk:
- Verification risk:

## 9. Next Action
- Decision: proceed / ask clarification / request approval / stop
- Rationale:
- Immediate next step:
```

## Classification Guide

- `read-only`: reading, summarizing, inspecting, or reporting without file/system side effects.
- `implementation`: source, data, document, build, runtime, or behavior changes inside an approved scope.
- `workflow-policy`: workflow rules, approval gates, source-of-truth documents, automation policy, or operating process changes.
- `protected-change`: schema, save/load, build policy, runtime architecture, destructive cleanup, commit/push/release/deploy, Hermes skill/config, cron, Discord management, or other explicitly protected action.
- `unclear`: missing target, symptom, expected result, approval boundary, validation method, or affected system.

## Permission Rules

- Proceed only when the request is clear enough and the action is inside approved scope.
- Ask clarification when ambiguity affects implementation, validation, permission, or final behavior.
- Request approval before protected changes, workflow-policy changes, destructive cleanup, commit/push, or scope expansion.
- Stop rather than guessing when source-of-truth documents conflict.

## Notes

- Keep the intake as short as the task allows, but do not omit permission boundary or ambiguity when work may change files, behavior, workflow, or validation claims.
- Do not claim validation passed unless it was actually run or the user provided evidence.

# Super Bot Design / Plan Template

Status: Template
Scope: Super Bot Stage 1 design/plan document before execution

## Purpose

Use this template after intake and before implementation, document changes, workflow changes, tool execution with side effects, or any meaningful repo work.

The plan should be small enough to use, but explicit enough that scope, non-goals, risks, validation, and stop/reapproval criteria are clear before work begins.

## Template

```md
# Design / Plan

## 1. Work Goal
- User-visible goal:
- Operational goal:

## 2. Background
- Current situation:
- Relevant source-of-truth documents:
- Relevant prior decisions or records:

## 3. Approved Scope
- Included files/areas:
- Allowed actions:
- Approved outputs:

## 4. Non-goals
- Excluded files/areas:
- Excluded behavior/policy changes:
- Adjacent work not included:

## 5. Impact Area
- Direct impact:
- Possible indirect impact:
- No intended impact:

## 6. Design Direction
- Proposed approach:
- Final-form architecture alignment:
- Simplicity / abstraction check:
- Traceability/debuggability notes:

## 7. Implementation Steps
1.
2.
3.

## 8. Verification Plan
- File/document read-back:
- Git status/diff review:
- Build/test/checks, if applicable:
- Runtime/manual validation, if applicable:
- What will remain unverified and why:

## 9. Risks
- Scope risk:
- Technical risk:
- Workflow/policy risk:
- Verification risk:
- User decision risk:

## 10. Stop / Reapproval Criteria
- Stop if ambiguity appears around:
- Stop if the work requires changes to:
  - schema
  - save/load behavior
  - build policy/settings
  - workflow rules
  - broad runtime architecture
  - destructive cleanup
  - commit/push/release/deploy
  - Hermes skill/config
  - cron or Discord management
- Stop if implementation would touch files outside approved scope.
```

## Plan Review Checklist

Before execution, review the draft against these checks:

- Scope containment: does every planned change trace to the approved scope?
- Final-form architecture: does the plan avoid throwaway structure?
- Simplicity: is there any unnecessary abstraction or future-only configurability?
- Validation feasibility: can the verification plan actually be run?
- Protected-change impact: does the plan touch schema, save/load, build policy, workflow policy, broad runtime architecture, Hermes config/skill, cron, Discord management, commit/push, or destructive cleanup?
- Approval boundary: are all items requiring user approval clearly separated?

## Notes

- For small read-only answers, this full template is not required.
- For meaningful source, workflow, architecture, data, runtime, or document changes, complete this before execution.
- Do not claim verification passed unless the planned verification is actually run or the user provided evidence.

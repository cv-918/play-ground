# 11. Workflow Examples

Status: Support / examples reference
Authority: Examples are illustrative. Use current canonical and operational documents when an example conflicts with newer workflow rules.

## 1. Purpose

This document provides practical examples for applying the AI Orchestrator workflow.

Use this document when deciding:

```text
Is this Fast Path?
Is this Full Path?
Do I need Codex?
Do I need Copilot?
Can I do this manually?
What should I review?
What should I validate?
What should I log?
```

---

## 2. Documentation-Only Update

## Situation

You want to add a short note to an existing workflow document.

## Recommended Path

```text
Fast Path
```

## Tool Routing

```text
ChatGPT:
  draft text

User:
  save file
  review diff
  commit if desired
```

## Checklist

```text
[ ] Meaning is correct.
[ ] Existing rules are not contradicted.
[ ] Korean required-read file updated if needed.
[ ] git diff reviewed.
```

---

## 3. Small Manual Code Change

## Situation

A one-line constant or local condition needs to change.

## Recommended Path

```text
Shortened controlled path
```

## Tool Routing

```text
ChatGPT:
  risk check or code suggestion if needed

User:
  manual edit
  build/test
  commit
```

Do not use Copilot if AI editing would likely over-edit.

---

## 4. Repository Analysis Before Implementation

## Situation

You want to implement a feature but do not know the current class names, ownership rules, or integration points.

## Recommended Path

```text
Full Path until Codex analysis
```

## Tool Routing

```text
ChatGPT:
  architecture/scope framing
  Codex prompt generation

Codex:
  read-only repository analysis

User:
  return Codex findings
```

Codex prompt must say:

```text
Mode:
Read-only analysis.
Do not modify files.
```

Do not generate a Copilot implementation prompt until repository context is known.

---

## 5. Bounded Copilot Implementation

## Situation

Architecture and scope are approved. File boundaries are known. The task requires multiple local file edits.

## Recommended Path

```text
Full Path
```

## Tool Routing

```text
ChatGPT:
  Copilot implementation prompt

Copilot Agent Mode:
  bounded implementation

Git:
  full diff capture

ChatGPT:
  diff review
```

Copilot prompt must include:

```text
Recommended model
Approved decisions
Approved scope
Non-goals
Files allowed to create
Files allowed to modify
Files not allowed to touch
Required changes
Forbidden changes
Stop conditions
Expected output
```

After Copilot, do not commit. Capture full diff first.

---

## 6. Review-Fix Loop

## Situation

Copilot implemented the requested change, but diff review found issues.

## Recommended Path

```text
Review-fix loop
```

## Severity Handling

```text
Critical:
  must fix before validation

Major:
  fix or explicitly accept risk

Minor:
  fix if practical

Optional:
  future task
```

Do not run runtime validation while Critical review issues remain.

---

## 7. Data Schema Change

## Situation

A JSON schema needs new fields.

## Recommended Path

```text
Full Path + Data Schema Approval Gate
```

## Must Define

```text
Field names
Field meanings
Required vs optional
Defaults
Invalid data behavior
Debug behavior
Release behavior
Compatibility / migration
```

## Review Focus

```text
[ ] Runtime structure matches JSON.
[ ] Defaults are explicit.
[ ] Missing required fields fail clearly.
[ ] Invalid enum or ID values are handled.
[ ] DataManager does not own runtime execution.
```

---

## 8. Runtime Lifecycle Change

## Situation

A scene, actor, component, or manager lifecycle function needs to change.

## Recommended Path

```text
Full Path + Runtime Behavior Approval Gate
```

## Review Focus

```text
[ ] Initialization order is safe.
[ ] Update order is safe.
[ ] Ownership is clear.
[ ] Registration and unregistration are paired.
[ ] No broad early return after partial initialization.
[ ] Cleanup remains valid.
```

## Validation Focus

```text
[ ] Scene enter works.
[ ] Scene exit works.
[ ] Re-entry works.
[ ] No duplicate objects or callbacks.
[ ] No dangling references.
```

---

## 9. Visual Studio Project File Change

## Situation

New `.h/.cpp`, resource, or data files need to be added to the Visual Studio project.

## Review Focus

```text
[ ] Only approved new files were added.
[ ] Unrelated entries were not reordered.
[ ] Existing filter names were not corrupted.
[ ] Korean filter names remain valid.
[ ] Encoding/BOM changes are intentional or harmless.
[ ] ResourceCompile/Image/None entries still point to correct filters.
[ ] No broad project-file rewrite occurred.
```

If project-file encoding is damaged, fix before validation.

---

## 10. Dev Log Generation

## Situation

A meaningful implementation or workflow task is complete.

## Required Evidence

```text
Review result
Validation result
Files changed
Remaining risks
Next tasks
```

Dev Log must not invent:

```text
Build result
Runtime result
Manual validation result
Git state
```

If a check was not performed, say it was not performed.

---

## 11. Workflow Rule Update

## Situation

The workflow itself needs a new rule.

## Recommended Path

```text
Workflow Update Request
```

## Must Define

```text
Current rule
Proposed rule
Reason
Affected documents
Required migration
Korean required-read update needed or not
Prompt template update needed or not
```

---

## 12. Stop-Condition Case

## Situation

Copilot modifies a forbidden file or the diff includes unexpected files.

## Correct Response

Stop.

Do not validate.

Do not commit.

## Required Next Step

```text
1. Identify unexpected files.
2. Determine whether changes are necessary.
3. If unnecessary, revert them.
4. If necessary, request new approval.
5. Re-run diff review.
```

---

## 13. Choosing the Path

| Task Type | Path |
|---|---|
| Explanation only | Direct response |
| Documentation draft | Fast Path |
| Small local edit | Shortened controlled path |
| Unknown repository structure | Codex read-only first |
| Multi-file implementation | Full Path |
| Data schema change | Full Path + Data Schema Approval |
| Runtime lifecycle change | Full Path + Runtime Approval |
| Copilot implementation | Full Path |
| Diff has Critical issue | Review-fix loop |
| Workflow rule change | Workflow Update Request |

---

## 14. Summary

```text
Low risk:
  use Fast Path

Unknown codebase context:
  use Codex first

Bounded implementation:
  use Copilot after approval

Meaningful change:
  review, validate, log, then commit

Unexpected change:
  stop
```

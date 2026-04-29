# Copilot Implementation Request

## Recommended Copilot Model

```text
Recommended Copilot Model:
GPT-5.3-Codex

Recommended Intelligence:
High

Reason:
Repository-aware implementation, C++ structure preservation, and bounded multi-file editing are required.

Permission:
Modify only the approved files listed in the prompt.
```

For small low-risk single-file or documentation tasks, use:

```text
Recommended Copilot Model:
GPT-5 mini or GPT-5.4 mini

Recommended Intelligence:
Auto or Medium
```

---

Use this template when implementation is approved and GitHub Copilot Agent Mode should modify local files.

---

## Goal

Implement the approved task:

```text
Task:
...
```

---

## Approved Architecture Summary

Paste the approved architecture.

```text
Approved architecture:
...
```

---

## Approved Scope

Implement only:

```text
Approved scope:
...
```

---

## Non-Goals

Do not implement:

```text
Non-goals:
...
```

---

## Files Allowed to Create

```text
Files allowed to create:
- ...
```

---

## Files Allowed to Modify

```text
Files allowed to modify:
- ...
```

---

## Files Not Allowed to Touch

```text
Files not allowed to touch:
- ...
```

---

## Required Changes

Implement the following:

1. ...
2. ...
3. ...

---

## Forbidden Changes

Do not:

- Redesign the architecture.
- Modify unrelated systems.
- Add broad refactoring.
- Change public behavior outside the approved scope.
- Change data schema beyond the approved fields.
- Modify files outside the allowed list.
- Remove existing behavior unless explicitly stated.
- Add temporary hacks intended for future rewrite.
- Hide invalid data.
- Claim validation passed without user-provided evidence.

---

## Style / Architecture Constraints

- Preserve existing naming conventions.
- Preserve existing ownership and lifecycle rules.
- Keep decision, execution, and data responsibilities separated.
- Avoid growing monolithic actor, scene, or manager classes.
- Keep implementation reviewable.
- Add comments only when they clarify non-obvious logic, lifecycle constraints, or safety rules.
- Avoid unnecessary abstraction.
- Avoid unrelated formatting changes.

---

## Expected Output

After implementation, summarize:

1. Files created
2. Files modified
3. Key changes
4. Assumptions
5. Deviations from request
6. Build risks
7. Runtime risks
8. Manual validation steps
9. Notes for review

Use this format:

```md
## Copilot Implementation Summary

### Files Created
- ...

### Files Modified
- ...

### Key Changes
- ...

### Assumptions
- ...

### Deviations From Request
- ...

### Build Risks
- ...

### Runtime Risks
- ...

### Suggested Validation
1. ...

### Notes for Review
- ...
```

---

## Stop Conditions

Stop and report instead of continuing if:

- Required files do not exist.
- The implementation requires modifying files outside the allowed list.
- The approved architecture conflicts with current code.
- A broad refactor appears necessary.
- Data schema changes beyond the approved scope are needed.
- Build errors require unrelated changes.
- Runtime lifecycle safety is unclear.
- The task violates repository rules.

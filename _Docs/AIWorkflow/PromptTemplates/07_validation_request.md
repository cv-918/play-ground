# Validation Request

Use this template to define or review validation steps.

---

## Task Summary

Describe the implemented or planned task.

```text
Task summary:
...
```

---

## Approved Scope

Paste the approved scope.

```text
Approved scope:
...
```

---

## Known Risks

List known risks from architecture, implementation, or review.

```text
Known risks:
...
```

---

## Validation Target

Select applicable targets:

```text
[ ] Build
[ ] Runtime smoke test
[ ] Manual gameplay test
[ ] Data loading
[ ] UI behavior
[ ] Scene lifecycle
[ ] Actor lifecycle
[ ] Save/load
[ ] Regression
[ ] Debug logs
```

---

## Required Output

The assistant must provide:

1. Build checks
2. Runtime checks
3. Manual test steps
4. Data validation steps
5. Edge cases
6. Failure symptoms
7. Regression checks
8. Pass/fail criteria
9. User actions

Use this format:

```md
## Validation Plan

### Build Checks
- ...

### Runtime Checks
- ...

### Manual Test Steps
1. ...

### Data Checks
- ...

### Regression Checks
- ...

### Failure Symptoms
- ...

### Pass Criteria
- ...

### User Actions
- ...
```

---

## User Action

The user must run validation locally and report results.

The assistant must not claim validation passed unless the user provides results.

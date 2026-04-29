# Review Request

Use this template after implementation or when reviewing a proposed diff.

---

## Change Summary

Describe what changed.

```text
Change summary:
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

## Diff / Code

Paste or attach:

- Git diff
- Modified files
- Copilot output
- Codex patch
- Relevant snippets

```text
Diff / code:
...
```

---

## Review Focus

Review for:

- Architecture boundary violations
- Responsibility leakage
- Scope compliance
- Runtime state safety
- Ownership and lifetime issues
- Update order issues
- Data consistency
- Error handling
- Debuggability
- Performance risk
- Regression risk
- Unrelated changes
- Diff reviewability
- Style consistency
- Documentation impact

---

## Required Output

Classify issues as:

### Critical

Must fix before continuing.

### Major

Should fix before completion unless explicitly accepted by the user.

### Minor

Can fix if practical.

### Optional

Future improvement candidate.

Also provide:

1. Required fixes
2. Validation implications
3. Whether validation can proceed
4. Whether scope was respected
5. Whether the task should stop, continue, or be split

---

## Required Assistant Behavior

The assistant must not approve unverified code blindly.

The assistant must clearly separate critical issues from optional improvements.

The assistant must identify missing evidence if the provided diff or context is insufficient.

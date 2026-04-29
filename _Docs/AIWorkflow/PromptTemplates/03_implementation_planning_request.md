# Implementation Planning Request

Use this template after architecture and scope are approved.

This template converts design into an implementation plan.

---

## Approved Architecture

Paste the approved architecture summary.

```text
Approved architecture:
...
```

---

## Approved Scope

Paste the approved current implementation scope.

```text
Approved scope:
...
```

---

## Non-Goals

Paste the approved non-goals.

```text
Non-goals:
...
```

---

## Known Project Context

Include known files, classes, folders, or systems.

If unknown, ask for a Codex analysis prompt instead of inventing file-level details.

```text
Known project context:
...
```

---

## Allowed Areas

List files or folders that may be modified if known.

```text
Allowed areas:
...
```

---

## Forbidden Areas

List files or folders that must not be modified.

```text
Forbidden areas:
...
```

---

## Required Output

The assistant must provide:

1. Candidate files to create
2. Candidate files to modify
3. Files not to touch
4. Implementation order
5. Data changes
6. Runtime integration points
7. Build risks
8. Runtime risks
9. Required Codex prompt if repository context is insufficient
10. Required Copilot prompt if implementation is ready

---

## Required Assistant Behavior

The assistant must not redesign the architecture.

If repository context is insufficient, the assistant must generate a Codex analysis prompt instead of inventing implementation details.

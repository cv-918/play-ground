# Architecture Request

Use this template when the task requires architecture design or architecture review.

---

## Goal

Describe the system or change that needs architecture design.

```text
Goal:
...
```

---

## Current Structure

Describe the current structure if known.

Include:

- Existing classes
- Existing components
- Existing managers
- Existing data flow
- Existing lifecycle
- Existing limitations

```text
Current structure:
...
```

---

## Required Behavior

Describe what the system must do.

```text
Required behavior:
...
```

---

## Data Requirements

Describe required data.

Include:

- Runtime data
- JSON data
- Save/load data
- Resource paths
- Configuration values
- Debug data

```text
Data requirements:
...
```

---

## Integration Points

List systems that may connect to this change.

Examples:

- Scene
- Actor
- Component
- Renderer
- Input
- UI
- DataManager
- Dialogue
- Skill
- Enemy
- Progression

```text
Integration points:
...
```

---

## Constraints

Required constraints:

- Final-form architecture first.
- Reduced scope must preserve the same structure.
- No temporary architecture.
- Separate decision, execution, and data.
- Avoid monolithic class growth.
- Keep ownership and lifecycle explicit.
- Keep validation and debugging possible.
- Keep implementation reviewable.

Add task-specific constraints:

```text
Task-specific constraints:
...
```

---

## Non-Goals

List what should not be designed now.

```text
Non-goals:
...
```

---

## Required Output

The assistant must provide:

1. Final-form architecture
2. Reduced-scope implementation
3. Responsibility boundaries
4. Data flow
5. Ownership / lifecycle
6. Debuggability
7. Tradeoffs
8. Constraints introduced
9. Approval questions

---

## Required Assistant Behavior

The assistant must not jump directly to code.

The assistant must define structure first, then define a reduced-scope implementation of the same structure.

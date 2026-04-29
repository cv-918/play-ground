# Codex Analysis Request

Use this template when repository context is required before safe implementation.

Codex should usually start in read-only analysis mode.

---

## Mode

```text
Read-only analysis.
Do not modify files.
```

---

## Goal

Analyze the repository context required for the following task:

```text
Task:
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

## Non-Goals

Paste the approved non-goals.

```text
Non-goals:
...
```

---

## Systems to Inspect

List expected systems.

Examples:

- Scene lifecycle
- NPC creation
- Data managers
- JSON loading
- Actor factory
- Component structure
- Existing placement or spawn logic

```text
Systems to inspect:
...
```

---

## Questions to Answer

Codex should answer:

1. Which files are relevant?
2. Which classes own the current responsibility?
3. Where is the safest integration point?
4. What existing naming/style conventions should be followed?
5. What files should not be modified?
6. What implementation risks exist?
7. Is the approved scope consistent with the current codebase?
8. What information is still missing?

---

## Expected Output

Codex should return:

1. Relevant files
2. Relevant classes/functions
3. Current data flow
4. Recommended integration point
5. Risks
6. Suggested implementation order
7. Files to avoid
8. Open questions

---

## Restrictions

- Do not edit files.
- Do not create files.
- Do not run broad refactors.
- Do not propose unrelated improvements.
- Do not exceed the approved scope.
- Do not treat assumptions as facts.
- If context is missing, state what is missing.

---

## User Action

Paste this prompt into Codex.

After Codex responds, return the findings to ChatGPT if further orchestration, planning, review, or prompt generation is needed.

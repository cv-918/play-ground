# Orchestrator Task Request

Use this template when starting a task through the AI Orchestrator workflow.

---

## Goal

Describe the task goal in one or two sentences.

Example:

```text
Implement JSON-based NPC placement loading for TownScene.
```

---

## Context

Describe the current situation.

Include:

- Current system state
- Relevant existing systems
- Known constraints
- Related previous decisions
- Important file paths if known

```text
Context:
...
```

---

## Scope

Define what should be handled in this task.

Include:

- Systems included
- Behavior included
- Data included
- Files or folders included if known

```text
Scope:
...
```

---

## Non-Goals

Define what must not be handled in this task.

Include:

- Systems excluded
- Features excluded
- Refactors excluded
- Future work excluded

```text
Non-goals:
...
```

---

## Constraints

Baseline constraints:

- Preserve final-form architecture.
- Do not introduce throwaway structures.
- Separate decision, execution, and data.
- Do not grow monolithic logic in actor, scene, or manager classes.
- Keep changes reviewable.
- Keep debugging and traceability explicit.
- Do not expand scope silently.
- Stop at approval gates when required.

Add task-specific constraints below:

```text
Task-specific constraints:
...
```

---

## Desired Output

Select required outputs:

```text
[ ] Task classification
[ ] Risk assessment
[ ] Required roles
[ ] Architecture proposal
[ ] Reduced-scope proposal
[ ] Implementation plan
[ ] Codex prompt
[ ] Copilot prompt
[ ] Review checklist
[ ] Validation checklist
[ ] Dev Log draft
[ ] User action list
```

---

## Available Context

Attach or paste any relevant information:

- Code snippets
- Folder structure
- JSON sample
- Existing design notes
- Error logs
- Git diff
- Screenshots
- Tool outputs

```text
Available context:
...
```

---

## User Decision Needed

State what decision the assistant should help prepare.

Example:

```text
Help me decide the reduced scope for the first implementation pass.
```

---

## Required Assistant Behavior

The assistant must:

1. Classify the task.
2. Assess risk.
3. Identify required roles.
4. Identify missing context.
5. Decide Fast Path or Full Path.
6. Stop at approval gates when required.
7. Provide explicit user actions.

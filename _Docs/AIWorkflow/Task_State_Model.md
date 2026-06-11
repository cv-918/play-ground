# Task State Model

Status: Current canonical task-state model
Authority: Defines task state enum and transition rules. Backlog, ActiveTask, tools, and generated summaries should align to this model.

## 1. Purpose

This document defines the task state model for the AI Orchestrator workflow.

It exists so future local scripts and Discord integration can reason about task progress without parsing arbitrary free-form text.

This document is part of the Level 3 preparation work.

---

## 2. Core Principle

Task state must be:

```text
explicit
finite
machine-readable
human-readable
approval-aware
safe by default
```

A task should never silently move from planning to implementation.

State transitions that can modify files, run tools, or imply completion require clear approval or validation evidence.

---

## 3. State Enum

Use only these task states:

```text
todo
analysis
awaiting_approval
ready_for_implementation
in_progress
review
fixing
validation
partial_done
ready_to_commit
blocked
done
deferred
cancelled
```

Do not invent new state names without updating this document.

---

## 4. State Definitions

| State | Meaning | Allowed Owner |
|---|---|---|
| `todo` | Task exists but has not started | Human / Orchestrator |
| `analysis` | Context gathering, Codex analysis, or repository inspection is in progress | Human / Codex / ChatGPT |
| `awaiting_approval` | A decision is required before proceeding | Human |
| `ready_for_implementation` | Scope is approved and implementation can begin | Human / Orchestrator |
| `in_progress` | Implementation or document update is being performed | Human / Copilot / Script |
| `review` | Diff, document, or result is being reviewed | Human / ChatGPT |
| `fixing` | Review found required fixes and a bounded fix is in progress | Human / Copilot |
| `validation` | Build, runtime, data, or workflow validation is in progress | Human / Local tool |
| `partial_done` | Some evidence, fix, or follow-up is complete, but the original task still lacks enough evidence to close | Human / Orchestrator |
| `ready_to_commit` | Review and validation are complete or explicitly accepted | Human |
| `blocked` | Work cannot continue without external decision, missing evidence, or failure recovery | Human / Orchestrator |
| `done` | Task is complete and committed or explicitly closed | Human |
| `deferred` | Task is intentionally postponed | Human |
| `cancelled` | Task is intentionally abandoned | Human |

---

## 5. Transition Rules

## 5.1 Standard Full Path

```text
todo
-> analysis
-> awaiting_approval
-> ready_for_implementation
-> in_progress
-> review
-> validation
-> ready_to_commit
-> done
```

## 5.2 Review-Fix Loop

```text
review
-> fixing
-> review
```

This loop may repeat until:

```text
Critical issues: fixed
Major issues: fixed or explicitly accepted
Minor issues: fixed or deferred
Optional issues: deferred
```

## 5.3 Validation-Fix Loop

```text
validation
-> fixing
-> review
-> validation
```

Use this when validation fails and a code/data/doc fix is required.

## 5.4 Partial Done Path

```text
validation
-> partial_done
-> validation
-> ready_to_commit
```

Use `partial_done` when a task has meaningful completed evidence but still has
explicit remaining work. Example: JSON syntax smoke passed, but runtime loader
validation remains. `partial_done` is not a completion state.

## 5.5 Blocked Path

Any active state may move to:

```text
blocked
```

Examples:

```text
approval missing
repository context insufficient
build failure
runtime failure
forbidden file modified
new files missing from diff
```

From `blocked`, allowed transitions:

```text
blocked -> analysis
blocked -> awaiting_approval
blocked -> fixing
blocked -> deferred
blocked -> cancelled
```

## 5.6 Fast Path

For low-risk documentation or prompt work:

```text
todo
-> in_progress
-> review
-> ready_to_commit
-> done
```

Validation may be skipped only if not applicable and this is explicitly noted.

---

## 6. Approval Gates by State

| Transition | Approval Required |
|---|---|
| `analysis -> awaiting_approval` | No, unless tool execution is requested |
| `awaiting_approval -> ready_for_implementation` | Yes |
| `ready_for_implementation -> in_progress` | Yes if files/tools will be modified/executed |
| `review -> fixing` | Yes if fix changes files |
| `validation -> ready_to_commit` | Human acceptance required |
| `ready_to_commit -> done` | Human commit/close decision required |
| Any state -> `deferred` | Human decision required |
| Any state -> `cancelled` | Human decision required |

---

## 7. Completion Rules

A task may enter `ready_to_commit` only when:

```text
[ ] Required review has passed or findings are explicitly accepted.
[ ] Required validation has passed or gaps are explicitly documented.
[ ] Remaining risks are documented.
[ ] Dev Log exists if required.
[ ] No unexpected files remain.
[ ] Staged diff is reviewable if commit is planned.
```

A task may enter `done` only when:

```text
[ ] Commit completed
```

or:

```text
[ ] Task was explicitly closed without commit
[ ] Closure reason is documented
```

---

## 8. Blocked State Requirements

When a task becomes `blocked`, record:

```yaml
blocked_by:
  - reason:
    evidence:
    required_decision:
    next_possible_actions:
```

A blocked task must not be advanced by assumptions.

---

## 9. ActiveTask.md Required Fields

`ActiveTask.md` should include these fields:

```yaml
task_id:
title:
status:
workflow_path:
priority:
risk_level:
requested_by:
requested_at:
last_updated:
approved_scope:
non_goals:
tool_route:
files_in_scope:
blocked_by:
decision_needed:
next_action:
validation_plan:
validation_evidence:
handoff_artifacts:
```

---

## 10. Recommended Workflow Paths

Use these workflow path labels:

```text
fast_path_documentation
short_controlled_path
full_path
codex_analysis_only
copilot_bounded_implementation
review_fix_loop
validation_only
workflow_update
local_script_validation
discord_read_only_future
```

---

## 11. Status Summary Format

Future local scripts or Discord commands should summarize task status like this:

```text
Task: WF-002
Status: review
Next action: Human review required
Blocked: no
Approval needed: no
Validation needed: document review
Commit ready: no
```

---

## 12. Discord Integration Rule

Discord commands should not infer state transitions from casual chat text.

Allowed pattern:

```text
/ai approve task_id
/ai block task_id reason
/ai defer task_id
/ai done task_id
```

The Orchestrator Core must validate whether the requested transition is allowed.

---

## 13. Do Not Automate Yet

Do not allow automation to move a task into these states without human confirmation:

```text
ready_for_implementation
ready_to_commit
done
cancelled
```

Do not allow automation to write source code based only on state transition.

---

## 14. Summary

The task state model exists to make the workflow:

```text
trackable
repeatable
Discord-readable
safe to automate later
```

The next automation layer should read these states, not invent its own hidden state model.

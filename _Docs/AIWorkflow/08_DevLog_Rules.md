# 08. Dev Log Rules

## 1. Purpose

This document defines when and how Dev Logs should be created in the AI Orchestrator workflow.

The purpose of Dev Logs is to preserve durable project history for meaningful work.

A Dev Log should answer:

- What changed?
- Why did it change?
- Which files were affected?
- What architecture decision was made?
- What was reviewed?
- What was validated?
- What risks remain?
- What should happen next?

Dev Logs must not be treated as decoration.

They are part of the project's traceability system.

---

## 2. Core Principle

The core principle is:

```text
If a task changes project behavior, architecture, workflow rules, or important data, it should leave a durable record.
```

Chat history is not a durable project record.

Important work must be saved in Markdown under the approved Dev Log location.

---

## 3. Standard Dev Log Location

The standard Dev Log root is:

```text
_DevLog/
```

Recommended subfolders:

```text
_DevLog/FixLog/
_DevLog/WorkLog/
_DevLog/Retrospective/
```

### Folder Responsibilities

| Folder | Responsibility |
|---|---|
| `_DevLog/FixLog/` | Bug fixes, feature completion summaries, implementation change records |
| `_DevLog/WorkLog/` | Ongoing work notes, investigation notes, partial progress |
| `_DevLog/Retrospective/` | Workflow retrospectives, process reviews, lessons learned |

The project should not use nested redundant paths such as:

```text
_DevLog/Documents/FixLog/
```

The approved normalized path is:

```text
_DevLog/FixLog/
```

---

## 4. When a Dev Log Is Required

A Dev Log is required when:

- A feature is completed.
- A bug with meaningful root cause is fixed.
- A refactor changes structure or responsibilities.
- Runtime behavior changes.
- Data schema changes.
- Save/load behavior changes.
- Scene or actor lifecycle changes.
- AI-generated code is accepted.
- A workflow rule changes.
- Folder structure changes.
- A tool usage rule changes.
- A significant design decision is made.
- A task leaves known remaining risks.

---

## 5. When a Dev Log Is Optional

A Dev Log is optional when:

- Only simple typo fixes were made.
- Only formatting was changed.
- A temporary local experiment was discarded.
- A small constant was changed for local testing and not committed.
- A document was edited without changing meaning.
- The task was exploratory and no project state changed.

Even when optional, a short WorkLog may be useful if the investigation affects future work.

---

## 6. Dev Log Naming Convention

Recommended filename format:

```text
YYYY-MM-DD_short_task_name.md
```

Examples:

```text
2026-04-29_ai_orchestrator_workflow_setup.md
2026-04-29_npc_placement_data_system.md
2026-04-29_video_option_borderless_fullscreen_fix.md
```

Use lowercase English words separated by underscores.

The date should use local project working date.

---

## 7. Dev Log Minimum Structure

Every Dev Log should include the following sections.

```md
# Dev Log: <Task Title>

## Date
YYYY-MM-DD

## Summary
...

## Background
...

## Scope
...

## Files Changed
...

## Architecture Notes
...

## Implementation Notes
...

## Review Summary
...

## Validation Summary
...

## Remaining Risks
...

## Next Tasks
...
```

Not every section needs to be long.

If a section does not apply, write:

```text
Not applicable.
```

If a section was not verified, write that explicitly.

---

## 8. Summary Section

The Summary section should explain the completed work in a few sentences.

It should include:

- What was changed
- What problem it solved
- Whether the task is complete, partial, or blocked

Example:

```md
## Summary

Added the initial AI Orchestrator workflow documents under `_Docs/AIWorkflow/`.
Normalized the documentation folder structure so workflow documents and Dev Logs are stored at the repository root.

Status: Complete.
```

---

## 9. Background Section

The Background section explains why the task was needed.

It should include:

- Original problem
- Prior state
- Motivation
- Relevant constraints
- Why this change was chosen

This section should not become a long essay.

It should record enough context for future debugging or review.

---

## 10. Scope Section

The Scope section records what was included and excluded.

It should include:

```md
## Scope

### Included
- ...

### Excluded
- ...
```

The Excluded list is important because it prevents future confusion about why related work was not done.

---

## 11. Files Changed Section

The Files Changed section lists affected files.

Use categories:

```md
## Files Changed

### Added
- ...

### Modified
- ...

### Moved
- ...

### Deleted
- ...
```

If exact files are unknown, do not invent them.

Write:

```text
Not yet confirmed. Requires Git diff review.
```

---

## 12. Architecture Notes Section

The Architecture Notes section records structural decisions.

Include:

- Responsibility boundaries
- Data flow changes
- Ownership/lifecycle rules
- New system boundaries
- Rejected alternatives
- Final-form versus reduced-scope decision
- Any rule that should affect future work

If no architecture decision was made, write:

```text
No architecture change.
```

---

## 13. Implementation Notes Section

The Implementation Notes section summarizes implementation details.

Include:

- Important logic changes
- Data changes
- Runtime integration points
- Tool-generated changes
- Manual changes
- Build or project setting changes

Avoid copying large code blocks unless necessary.

The Dev Log should summarize implementation, not duplicate source code.

---

## 14. Review Summary Section

The Review Summary section records review results.

Include:

- Whether review was performed
- Who or what reviewed it
- Critical issues
- Major issues
- Minor issues
- Optional improvements
- Whether scope was respected
- Whether unrelated changes were found

If review was not performed, write:

```text
Review not performed.
```

Do not imply review happened if it did not.

---

## 15. Validation Summary Section

The Validation Summary section records evidence.

Include:

- Build result
- Runtime result
- Manual test result
- Data validation result
- Regression result
- Remaining unverified areas

Use this format when possible:

```md
## Validation Summary

### Build
- Status:
- Notes:

### Runtime
- Status:
- Notes:

### Manual Tests
- Status:
- Notes:

### Data Validation
- Status:
- Notes:

### Regression
- Status:
- Notes:

### Remaining Unverified Areas
- ...
```

If validation was not performed, write:

```text
Validation not performed.
```

If validation was partial, state exactly what was and was not checked.

---

## 16. Remaining Risks Section

The Remaining Risks section must be explicit.

Include:

- Known technical risks
- Unverified behavior
- Deferred validation
- Deferred cleanup
- Potential regressions
- Accepted Major issues
- Any reason the change may need follow-up

If no risks are known, write:

```text
No known remaining risks.
```

Do not omit the section.

---

## 17. Next Tasks Section

The Next Tasks section lists follow-up work.

Use concrete task items.

Example:

```md
## Next Tasks

- Create `AGENTS.md` from the approved AI workflow rules.
- Create `.github/copilot-instructions.md`.
- Apply the workflow to the NPC placement data system.
```

Avoid vague next steps such as:

```text
Improve later.
```

---

## 18. Validation Honesty Rule

The Dev Log must never invent validation results.

If the user did not run a build, the Dev Log must say:

```text
Build not performed.
```

If the user did not run runtime tests, the Dev Log must say:

```text
Runtime validation not performed.
```

If AI cannot inspect the actual repository state, the Dev Log must not claim exact file changes unless the user provides them.

---

## 19. AI Contribution Disclosure

When AI generated meaningful design, implementation, review, validation plan, or documentation, the Dev Log should mention it.

Example:

```md
## AI Assistance

- ChatGPT generated the initial workflow document draft.
- User reviewed, saved, and committed the documents.
- No local execution was performed by ChatGPT.
```

This prevents confusion about which work was actually executed locally.

---

## 20. Commit Relationship

A Dev Log should usually be written before or during commit preparation.

The Dev Log should support the commit by explaining:

- Why the commit exists
- What changed
- What was validated
- What risks remain

A Dev Log does not replace Git history.

Git records what changed.

Dev Log records why and how it changed.

---

## 21. Dev Log and FixLog

Use `_DevLog/FixLog/` when:

- A concrete bug was fixed.
- A feature implementation was completed.
- A code or data change was made.
- A meaningful workflow setup task was completed.
- A documented change should be tied to a commit.

For pure investigation without final change, use:

```text
_DevLog/WorkLog/
```

For process review or lessons learned, use:

```text
_DevLog/Retrospective/
```

---

## 22. Dev Log Generation Request

Use this request when asking AI to generate a Dev Log:

```md
# Dev Log Request

## Task Summary
...

## Date
YYYY-MM-DD

## Files Changed
...

## Approved Scope
...

## Implementation Summary
...

## Architecture Notes
...

## Review Result
...

## Validation Result
...

## Remaining Risks
...

## Next Tasks
...

## Required Output
Generate a Markdown Dev Log suitable for `_DevLog/FixLog/`.
```

The assistant must not fill unknown sections with fabricated certainty.

---

## 23. Dev Log Review Checklist

Before saving a Dev Log, check:

```text
[ ] Does the Summary explain the task?
[ ] Does the Background explain why it was needed?
[ ] Does the Scope list included and excluded work?
[ ] Are Files Changed accurate?
[ ] Are Architecture Notes explicit?
[ ] Are Review results honest?
[ ] Are Validation results evidence-based?
[ ] Are unverified areas clearly marked?
[ ] Are Remaining Risks listed?
[ ] Are Next Tasks concrete?
[ ] Is AI assistance disclosed if meaningful?
```

---

## 24. Dev Log Anti-Patterns

The following patterns are forbidden.

### 24.1 Fake Completion

Writing that a task is complete when review or validation was not performed.

### 24.2 Fake Validation

Claiming build, runtime, or manual tests passed without user-provided evidence.

### 24.3 Missing Risks

Omitting known risks to make the result look cleaner.

### 24.4 Chat-Only Decision

Leaving important decisions only in chat and not recording them in Markdown.

### 24.5 Overlong Noise

Copying huge amounts of conversation or code into the Dev Log.

The Dev Log should be concise but complete.

### 24.6 No File List

Failing to list changed files for meaningful work.

### 24.7 No Next Step

Ending the log without any clear next task or completion status.

---

## 25. Relationship to Korean Required-Read Documents

The main Dev Log may be written in English or Korean depending on the intended reader.

However:

- AI workflow operating documents should usually be written in English.
- Required-read Korean summaries should be written when the user needs quick judgment support.
- Dev Logs for personal project history may be written in Korean if that improves readability.
- The language choice must not reduce accuracy or tool usability.

---

## 26. Completion Criteria

A Dev Log is considered acceptable when:

- It is saved under the approved Dev Log location.
- It accurately summarizes the task.
- It does not invent validation.
- It lists affected files or states that file review is pending.
- It records architecture notes if relevant.
- It records review and validation status.
- It records remaining risks.
- It lists next tasks or states that none remain.
- It supports the related commit.

---

## 27. Summary

Dev Logs preserve project memory.

Correct Dev Log practice means:

```text
Record what changed.
Record why it changed.
Record what was reviewed.
Record what was validated.
Record what remains risky.
Record what happens next.
```

AI may draft Dev Logs.

The human developer must verify and save them.

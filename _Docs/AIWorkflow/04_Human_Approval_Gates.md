# 04. Human Approval Gates

Status: Current approval-gate reference, pending wording alignment with scope-based approval
Authority: Defines approval boundaries. Read with `AGENTS.md`, `Universal_AI_Staff_Behavior.md`, and `SuperBot_Stage1_Operating_Charter.md`: approved scope may proceed, while scope expansion, protected workflow/policy/schema/save-load/build changes, commit, push, or genuine ambiguity require explicit approval.

## 1. Purpose

This document defines when the AI Orchestrator workflow must stop and request explicit human approval.

The purpose of approval gates is to prevent AI-assisted work from silently crossing important boundaries such as architecture decisions, source code modification, data schema changes, runtime lifecycle changes, or Git operations.

The human developer remains the final decision maker.

AI may propose, plan, review, and generate instructions.

AI must not silently approve its own execution.

---

## 2. Core Principle

The core principle is:

```text
AI may recommend.
AI may prepare.
AI may review.
AI may generate prompts.
Human approval is required before execution that changes the project.
```

The workflow must not treat a generated plan as approved unless the user explicitly approves it.

Approval must be visible in the conversation or in a stored workflow document.

---

## 3. Approval Gate Types

The workflow uses the following approval gate types.

```text
Design Approval Gate
Scope Approval Gate
File Modification Approval Gate
Data Schema Approval Gate
Runtime Behavior Approval Gate
Tool Execution Approval Gate
Review Acceptance Gate
Validation Acceptance Gate
Commit Approval Gate
Workflow Rule Update Gate
```

Each gate protects a different project boundary.

---

## 4. Design Approval Gate

## Purpose

The Design Approval Gate protects architecture decisions.

It must be used before turning a design proposal into an implementation plan.

## Approval Required When

- A new system is introduced.
- Existing system responsibility boundaries change.
- Ownership or lifecycle rules change.
- Decision, execution, and data responsibilities are redistributed.
- A reduced-scope implementation is selected.
- A long-term extension path is defined.
- A design decision will affect future work.

## Required Approval Items

The assistant must ask the user to approve:

- Final-form architecture
- Reduced-scope implementation
- Responsibility boundaries
- Data flow
- Ownership and lifecycle rules
- Explicit non-goals
- Deferred decisions

## Approval Prompt Format

```md
## Design Approval Gate

Approval Required: Yes

Please approve or reject the following:

1. Final-form architecture
2. Reduced-scope implementation
3. Responsibility boundaries
4. Data flow
5. Ownership / lifecycle rules
6. Non-goals
7. Deferred decisions

Do not proceed to implementation planning until this is approved.
```

---

## 5. Scope Approval Gate

## Purpose

The Scope Approval Gate prevents uncontrolled task expansion.

It must be used before the workflow generates execution instructions for Codex, Copilot, or manual implementation.

## Approval Required When

- A task has both current scope and future scope.
- A feature could expand into related systems.
- Multiple systems are adjacent to the requested work.
- The assistant proposes excluding some work from the current step.
- The task could become a broad refactor.

## Required Approval Items

The assistant must ask the user to approve:

- What will be implemented now
- What will not be implemented now
- Future extension points
- Explicitly excluded systems
- Stop conditions
- Definition of done

## Approval Prompt Format

```md
## Scope Approval Gate

Approval Required: Yes

Please approve or reject the current scope:

### Implement Now
- ...

### Do Not Implement Now
- ...

### Future Extension Points
- ...

### Stop Conditions
- ...

### Definition of Done
- ...

Do not generate an implementation prompt until this scope is approved.
```

---

## 6. File Modification Approval Gate

## Purpose

The File Modification Approval Gate protects the repository from unintended edits.

It must be used before asking Copilot, Codex, or another tool to modify files.

## Approval Required When

- Source files will be created.
- Source files will be modified.
- Project files will be modified.
- Data files will be modified.
- Build files will be modified.
- Existing documents will be reorganized.
- AI-generated changes will be applied to the repository.

## Required Approval Items

The assistant must ask the user to approve:

- Files allowed to create
- Files allowed to modify
- Files explicitly forbidden to modify
- Maximum expected file scope
- Whether unrelated refactoring is forbidden
- Whether formatting-only changes are allowed

## Approval Prompt Format

```md
## File Modification Approval Gate

Approval Required: Yes

Please approve the file modification boundary:

### Files Allowed to Create
- ...

### Files Allowed to Modify
- ...

### Files Not Allowed to Touch
- ...

### Forbidden Changes
- ...

Do not ask any tool to edit files until this is approved.
```

---

## 7. Data Schema Approval Gate

## Purpose

The Data Schema Approval Gate protects structured project data.

It must be used before changing JSON schema, serialized data, save data, enum serialization, resource path rules, or asset metadata conventions.

## Approval Required When

- A new JSON schema is added.
- Existing JSON fields are renamed, removed, or reinterpreted.
- Save/load data changes.
- Enum values are serialized or changed.
- Resource path conventions change.
- Asset metadata structure changes.
- Content compatibility may be affected.

## Required Approval Items

The assistant must ask the user to approve:

- New or changed fields
- Field meaning
- Required versus optional fields
- Default values
- Backward compatibility policy
- Loader behavior on invalid data
- Debug/assert behavior
- Migration requirements, if any

## Approval Prompt Format

```md
## Data Schema Approval Gate

Approval Required: Yes

Please approve the data schema boundary:

### New / Changed Fields
- ...

### Field Semantics
- ...

### Defaults
- ...

### Invalid Data Handling
- ...

### Compatibility / Migration
- ...

Do not implement loaders or data consumers until this is approved.
```

---

## 8. Runtime Behavior Approval Gate

## Purpose

The Runtime Behavior Approval Gate protects gameplay and engine behavior.

It must be used before changing behavior that can affect runtime state, update order, object lifecycle, scene behavior, actor behavior, UI behavior, or gameplay logic.

## Approval Required When

- Actor state transitions change.
- Scene initialization or cleanup changes.
- Update order changes.
- Render order changes.
- Movement, attack, hit, death, spawn, or interaction behavior changes.
- UI input or update behavior changes.
- Dialogue progression behavior changes.
- Skill or enemy behavior changes.
- Object ownership, registration, or destruction changes.

## Required Approval Items

The assistant must ask the user to approve:

- Runtime behavior changes
- State transition changes
- Lifecycle rules
- Update order assumptions
- Failure handling
- Debugging points
- Regression-sensitive areas

## Approval Prompt Format

```md
## Runtime Behavior Approval Gate

Approval Required: Yes

Please approve the runtime behavior boundary:

### Behavior Changes
- ...

### State / Lifecycle Changes
- ...

### Update Order Assumptions
- ...

### Failure Handling
- ...

### Regression Risks
- ...

Do not proceed to implementation until this behavior is approved.
```

---

## 9. Tool Execution Approval Gate

## Purpose

The Tool Execution Approval Gate controls when an external or local tool is used.

It must be used before the user copies prompts into Copilot, Codex, or any tool that may inspect, generate, or modify project files.

## Approval Required When

- Copilot Agent Mode will modify files.
- Codex will inspect the repository.
- Codex will generate a patch.
- A build command will be run.
- A script will modify project files.
- A future automation tool will act on the repository.

## Required Approval Items

The assistant must ask the user to approve:

- Tool to use
- Tool purpose
- Tool permissions
- Whether the tool may modify files
- Expected output
- Stop conditions
- User action required

## Approval Prompt Format

```md
## Tool Execution Approval Gate

Approval Required: Yes

Please approve tool execution:

### Tool
...

### Purpose
...

### Permission
- Read-only / Write-allowed

### Expected Output
...

### Stop Conditions
...

Do not run or prompt this tool until approved.
```

---

## 10. Review Acceptance Gate

## Purpose

The Review Acceptance Gate determines whether an implemented change is acceptable.

It must be used after source changes, generated patches, or meaningful documentation changes.

## Approval Required When

- Git diff has been reviewed.
- AI-generated code has been reviewed.
- Critical or major issues were found.
- A change affects runtime behavior.
- A change affects architecture or data flow.
- The user must decide whether fixes are required before validation.

## Required Approval Items

The assistant must ask the user to decide:

- Are Critical issues resolved?
- Are Major issues resolved or accepted?
- Are Minor issues deferred?
- Is the diff reviewable?
- Are unrelated changes absent?
- Can validation proceed?

## Approval Prompt Format

```md
## Review Acceptance Gate

Approval Required: Yes

Please confirm review status:

### Critical Issues
- ...

### Major Issues
- ...

### Minor Issues
- ...

### Recommendation
- Proceed to validation / Fix required / Stop

Do not mark the task complete until review is accepted.
```

---

## 11. Validation Acceptance Gate

## Purpose

The Validation Acceptance Gate determines whether the work has been verified.

It must be used after build checks, runtime checks, manual tests, or data validation.

## Approval Required When

- Runtime behavior changed.
- Data loading changed.
- AI-generated code was applied.
- Manual validation was required.
- Build or runtime failures occurred.
- The task is being considered complete.

## Required Approval Items

The assistant must ask the user to confirm:

- Build result
- Runtime test result
- Manual test result
- Data loading result
- Failure symptoms observed
- Regression checks performed
- Remaining unverified areas

## Approval Prompt Format

```md
## Validation Acceptance Gate

Approval Required: Yes

Please confirm validation status:

### Build Result
...

### Runtime Result
...

### Manual Test Result
...

### Regression Checks
...

### Remaining Unverified Areas
...

Do not proceed to completion or commit recommendation until validation is accepted.
```

---

## 12. Commit Approval Gate

## Purpose

The Commit Approval Gate protects Git history.

It must be used before recommending that the user commits changes.

## Approval Required When

- A task is considered complete.
- Documentation has been added or updated.
- Source changes have been implemented.
- Dev Log has been written.
- Workflow rules have changed.
- Files were moved or reorganized.

## Required Approval Items

The assistant must ask the user to confirm:

- Git status is clean except intended changes.
- Diff was reviewed.
- Validation passed or known gaps are accepted.
- Dev Log is present if required.
- Commit scope is coherent.
- Commit message is appropriate.

## Approval Prompt Format

```md
## Commit Approval Gate

Approval Required: Yes

Please confirm before commit:

### Intended Changes
- ...

### Validation Status
- ...

### Remaining Risks
- ...

### Recommended Commit Message
...

Do not commit if unrelated changes are present.
```

---

## 13. Workflow Rule Update Gate

## Purpose

The Workflow Rule Update Gate protects the workflow documents from inconsistent rule changes.

It must be used before modifying AIWorkflow documents, AGENTS.md, or copilot-instructions.md.

## Approval Required When

- A new rule is added.
- A rule is changed.
- A rule is removed.
- A folder structure convention changes.
- A tool responsibility changes.
- Prompt template behavior changes.
- A new approval gate is introduced.

## Required Approval Items

The assistant must ask the user to approve:

- Rule being added or changed
- Reason for change
- Affected documents
- Migration or cleanup requirements
- Whether the rule applies globally or locally
- Whether Korean required-read documents need updates

## Approval Prompt Format

```md
## Workflow Rule Update Gate

Approval Required: Yes

Please approve workflow rule update:

### Rule Change
...

### Reason
...

### Affected Documents
- ...

### Migration Required
- Yes / No

### Required Read Document Update
- Yes / No
```

---

## 14. When Approval Is Not Required

Approval is not required for:

- Explaining concepts
- Summarizing already-provided text
- Generating draft documentation for review
- Creating a read-only checklist
- Creating a prompt draft that will not be executed yet
- Suggesting possible next steps
- Formatting text without changing meaning
- Creating a downloadable file requested by the user

However, user actions must still be listed when files should be saved, commands should be run, or decisions should be made.

---

## 15. Explicit Approval Language

The user may approve with clear language such as:

```text
Approved.
Proceed.
Go ahead.
진행.
승인.
그 범위로 진행.
이대로 Copilot 프롬프트 만들어줘.
```

The assistant must treat uncertain language as not fully approved.

Ambiguous examples:

```text
Looks okay.
Maybe.
괜찮은 듯?
일단 보자.
나쁘지 않네.
```

When approval is ambiguous, the assistant should ask for explicit confirmation or proceed only with non-executing draft work.

---

## 16. Approval Scope

Approval applies only to the specific scope described at the gate.

Approval does not automatically include:

- Additional files
- Related refactoring
- Future systems
- Extra features
- Data schema expansion
- Build configuration changes
- Tool execution beyond the stated permission

If scope changes, a new approval gate is required.

---

## 17. Default Policy When Unsure

When unsure whether approval is required, the assistant must assume approval is required.

Default policy:

```text
If a task changes project state, request approval.
If a task only drafts or explains, proceed and list user actions.
If scope is unclear, narrow it and ask for approval.
```

---

## 18. Approval Gate Output Standard

Every approval gate must include:

```md
## Human Approval Gate

Approval Required: Yes / No

### Gate Type
...

### Reason
...

### Items Requiring Approval
- ...

### What Will Not Be Done
- ...

### User Decision Needed
Approve / Reject / Modify Scope
```

This format keeps approval visible and traceable.

---

## 19. Relationship to Fast Path and Full Path

Fast Path tasks may skip deep architecture output but must still include approval if project state will change.

Full Path tasks must include explicit approval gates.

### Fast Path

Examples:

- Documentation draft
- Prompt template update
- Dev Log generation

Approval may not be required before generation, but saving and committing still require user action.

### Full Path

Examples:

- Runtime code changes
- JSON schema changes
- New system integration
- Refactoring

Approval is required before execution.

---

## 20. Completion Criteria

A task may be considered complete only when:

- Required approvals were obtained.
- Implementation stayed within approved scope.
- Review was performed.
- Validation was performed or explicitly deferred.
- Documentation was created if required.
- Remaining risks are known.
- User has decided whether to commit.

AI must not declare a task complete solely because it produced code or a plan.

---

## 21. Summary

Human approval gates exist to protect:

- Architecture
- Scope
- Files
- Data schema
- Runtime behavior
- Tool execution
- Review quality
- Validation quality
- Git history
- Workflow rule consistency

The workflow should move quickly when risk is low.

The workflow must stop when project state, architecture, data, runtime behavior, or Git history could be affected.

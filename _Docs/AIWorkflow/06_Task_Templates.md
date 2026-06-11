# 06. Task Templates

Status: Current template reference
Authority: Describes task template content. Reusable prompt files live under `PromptTemplates/`; use `Workflow_Document_Authority_Map.md` when template authority is unclear.

## 1. Purpose

This document defines the standard task templates used by the AI Orchestrator workflow.

The purpose of these templates is to make AI-assisted development repeatable, bounded, reviewable, and traceable.

A task should not begin with a vague request such as:

```text
Make this system better.
```

A task should begin with a structured request that defines:

- Goal
- Context
- Scope
- Non-goals
- Constraints
- Expected output
- Required user actions

---

## 2. Template Usage Policy

Templates are not mandatory for every tiny task.

Use templates when:

- The task may affect architecture.
- The task may affect runtime behavior.
- The task may affect data schema.
- The task will use Codex or Copilot.
- The task should leave a durable record.
- The task needs review or validation.

For small documentation or explanation tasks, a shortened form is acceptable.

---

## 3. Template Set

The initial template set is:

```text
01_orchestrator_task_request.md
02_architecture_request.md
03_implementation_planning_request.md
04_codex_analysis_request.md
05_copilot_implementation_request.md
06_review_request.md
07_validation_request.md
08_devlog_request.md
09_workflow_update_request.md
```

These templates may later be stored as individual files under:

```text
_Docs/AIWorkflow/PromptTemplates/
```

This document defines the canonical template content.

---

# 4. 01_orchestrator_task_request.md

## Purpose

Use this template when starting a task through the AI Orchestrator workflow.

This is the primary entry point.

## Template

```md
# Orchestrator Task Request

## Goal

Describe the task goal in one or two sentences.

Example:
Implement JSON-based NPC placement loading for TownScene.

---

## Context

Describe the current situation.

Include:
- Current system state
- Relevant existing systems
- Known constraints
- Related previous decisions
- Important file paths if known

---

## Scope

Define what should be handled in this task.

Include:
- Systems included
- Behavior included
- Data included
- Files or folders included if known

---

## Non-Goals

Define what must not be handled in this task.

Include:
- Systems excluded
- Features excluded
- Refactors excluded
- Future work excluded

---

## Constraints

List architectural and implementation constraints.

Required baseline constraints:
- Preserve final-form architecture.
- Do not introduce throwaway structures.
- Separate decision, execution, and data.
- Do not grow monolithic logic in actor, scene, or manager classes.
- Keep changes reviewable.
- Keep debugging and traceability explicit.

---

## Desired Output

Select required outputs:

- Task classification
- Risk assessment
- Required roles
- Architecture proposal
- Reduced-scope proposal
- Implementation plan
- Codex prompt
- Copilot prompt
- Review checklist
- Validation checklist
- Dev Log draft
- User action list

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

---

## User Decision Needed

State what decision the assistant should help prepare.

Example:
Help me decide the reduced scope for the first implementation pass.
```

## Required Assistant Behavior

When receiving this template, the assistant must:

- Classify the task.
- Assess risk.
- Identify required roles.
- Identify missing context.
- Decide Fast Path or Full Path.
- Stop at approval gates when required.
- Provide explicit user actions.

---

# 5. 02_architecture_request.md

## Purpose

Use this template when the task requires architecture design or architecture review.

## Template

```md
# Architecture Request

## Goal

Describe the system or change that needs architecture design.

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

---

## Required Behavior

Describe what the system must do.

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

---

## Non-Goals

List what should not be designed now.

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
```

## Required Assistant Behavior

The assistant must not jump directly to code.

The assistant must define structure first, then define a reduced-scope implementation of the same structure.

---

# 6. 03_implementation_planning_request.md

## Purpose

Use this template after architecture and scope are approved.

This template converts design into an implementation plan.

## Template

```md
# Implementation Planning Request

## Approved Architecture

Paste the approved architecture summary.

---

## Approved Scope

Paste the approved current implementation scope.

---

## Non-Goals

Paste the approved non-goals.

---

## Known Project Context

Include known files, classes, folders, or systems.

If unknown, ask for a Codex analysis prompt instead of inventing file-level details.

---

## Allowed Areas

List files or folders that may be modified if known.

---

## Forbidden Areas

List files or folders that must not be modified.

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
```

## Required Assistant Behavior

The assistant must not redesign the architecture.

If repository context is insufficient, the assistant must generate a Codex analysis prompt instead of inventing implementation details.

---

# 7. 04_codex_analysis_request.md

## Purpose

Use this template when repository context is required before safe implementation.

Codex should usually start in read-only analysis mode.

## Template

```md
# Codex Analysis Request

## Mode

Read-only analysis.

Do not modify files.

---

## Goal

Analyze the repository context required for the following task:

[Describe task]

---

## Approved Scope

[Paste approved scope]

---

## Non-Goals

[Paste non-goals]

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
```

## Required User Action

The user must paste this prompt into Codex and return the findings to ChatGPT if further orchestration is needed.

---

# 8. 05_copilot_implementation_request.md

## Purpose

Use this template when implementation is approved and GitHub Copilot Agent Mode should modify local files.

## Template

```md
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

---

## Goal

Implement the approved task:

[Describe task]

---

## Approved Architecture Summary

[Paste approved architecture]

---

## Approved Scope

Implement only:

- ...

---

## Non-Goals

Do not implement:

- ...

---

## Files Allowed to Create

- ...

---

## Files Allowed to Modify

- ...

---

## Files Not Allowed to Touch

- ...

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

---

## Style / Architecture Constraints

- Preserve existing naming conventions.
- Preserve existing ownership and lifecycle rules.
- Keep decision, execution, and data responsibilities separated.
- Avoid growing monolithic actor, scene, or manager classes.
- Keep implementation reviewable.
- Add comments only when they clarify non-obvious logic.

---

## Expected Output

After implementation, summarize:

1. Files created
2. Files modified
3. Key changes
4. Assumptions
5. Build risks
6. Runtime risks
7. Manual validation steps

---

## Stop Conditions

Stop and report instead of continuing if:

- Required files do not exist.
- The implementation requires modifying files outside the allowed list.
- The approved architecture conflicts with current code.
- A broad refactor appears necessary.
- Data schema changes beyond the approved scope are needed.
- Build errors require unrelated changes.
```

## Required User Action

The user must:

- Ensure the Git working tree is safe.
- Paste this prompt into Copilot Agent Mode.
- Review proposed changes.
- Reject unrelated changes.
- Run build and manual validation.
- Return diff or results for review if needed.

---

# 9. 06_review_request.md

## Purpose

Use this template after implementation or when reviewing a proposed diff.

## Template

```md
# Review Request

## Change Summary

Describe what changed.

---

## Approved Scope

Paste the approved scope.

---

## Diff / Code

Paste or attach:

- Git diff
- Modified files
- Copilot output
- Codex patch
- Relevant snippets

---

## Review Focus

Review for:

- Architecture boundary violations
- Responsibility leakage
- Runtime state safety
- Ownership and lifetime issues
- Update order issues
- Data consistency
- Performance risk
- Regression risk
- Debuggability
- Unrelated changes
- Diff reviewability

---

## Required Output

Classify issues as:

### Critical
Must fix before continuing.

### Major
Should fix before completion.

### Minor
Can fix if practical.

### Optional
Future improvement candidate.

Also provide:

1. Required fixes
2. Validation implications
3. Whether validation can proceed
4. Whether scope was respected
```

## Required Assistant Behavior

The assistant must not approve unverified code blindly.

The assistant must clearly separate critical issues from optional improvements.

---

# 10. 07_validation_request.md

## Purpose

Use this template to define or review validation steps.

## Template

```md
# Validation Request

## Task Summary

Describe the implemented or planned task.

---

## Approved Scope

Paste the approved scope.

---

## Known Risks

List known risks from architecture, implementation, or review.

---

## Validation Target

Select applicable targets:

- Build
- Runtime smoke test
- Manual gameplay test
- Data loading
- UI behavior
- Scene lifecycle
- Actor lifecycle
- Save/load
- Regression
- Debug logs

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
```

## Required User Action

The user must run the validation locally and report results.

The assistant must not claim validation passed unless the user provides results.

---

# 11. 08_devlog_request.md

## Purpose

Use this template after meaningful work is completed.

## Template

```md
# Dev Log Request

## Task Summary

Describe what was done.

---

## Date

YYYY-MM-DD

---

## Files Changed

List files created, modified, moved, or deleted.

---

## Approved Scope

Paste the approved scope.

---

## Implementation Summary

Summarize what changed.

---

## Architecture Notes

Describe any architecture decisions or boundaries affected.

---

## Validation Result

Describe build, runtime, manual test, or data validation results.

If not validated, state that clearly.

---

## Remaining Risks

List known risks or unverified areas.

---

## Next Tasks

List follow-up tasks.

---

## Required Output

Generate a Markdown Dev Log suitable for:

```text
_DevLog/FixLog/
```

or another approved Dev Log folder.
```

## Required Assistant Behavior

The assistant must not invent validation results.

If validation was not performed, the Dev Log must say so explicitly.

---

# 12. 09_workflow_update_request.md

## Purpose

Use this template when workflow rules, folder structure, tool responsibilities, or prompt templates need to change.

## Template

```md
# Workflow Update Request

## Change Reason

Describe why the workflow needs to change.

---

## Current Rule

Paste the current rule or describe current behavior.

---

## Proposed Rule

Describe the proposed new rule.

---

## Affected Documents

List affected documents.

Examples:
- 00_AI_Orchestrator_Overview.md
- 01_AI_Orchestrator_Protocol.md
- 02_Workflow_Scope.md
- 03_Agent_Roles.md
- 04_Human_Approval_Gates.md
- 05_Tool_Routing_Rules.md
- 06_Task_Templates.md
- AGENTS.md
- .github/copilot-instructions.md

---

## Required Migration

Describe whether files, folders, prompts, or previous documents need to be updated.

---

## Required Output

The assistant must provide:

1. Rule update summary
2. Affected documents
3. Proposed text changes
4. Required-read Korean summary update if needed
5. User action list
6. Commit suggestion
```

## Required Assistant Behavior

The assistant must not silently change workflow rules.

Workflow changes require explicit user approval.

---

# 13. Minimal Task Request Form

For small tasks, use this reduced form.

```md
# Task

## Goal
...

## Scope
...

## Non-Goals
...

## Output Needed
...
```

The assistant must still classify risk and list user actions.

---

# 14. Template Selection Matrix

| Situation | Template |
|---|---|
| Starting an orchestrated task | 01_orchestrator_task_request.md |
| Designing a system | 02_architecture_request.md |
| Planning implementation | 03_implementation_planning_request.md |
| Asking Codex to inspect repository | 04_codex_analysis_request.md |
| Asking Copilot to implement | 05_copilot_implementation_request.md |
| Reviewing code or diff | 06_review_request.md |
| Planning validation | 07_validation_request.md |
| Writing Dev Log | 08_devlog_request.md |
| Updating workflow rules | 09_workflow_update_request.md |
| Small low-risk task | Minimal Task Request Form |

---

# 15. Template Storage Policy

Canonical template definitions live in this document.

Reusable prompt files may be stored under:

```text
_Docs/AIWorkflow/PromptTemplates/
```

When individual prompt files are created, they should match the canonical template definitions unless a workflow update explicitly changes them.

---

# 16. Required User Actions

When using templates, the user should:

- Fill in the task goal.
- Fill in known context.
- Explicitly define scope.
- Explicitly define non-goals.
- Provide files, snippets, diffs, or logs when required.
- Approve design and scope before implementation.
- Save durable outputs to the repository.
- Run Git checks before and after file modifications.

---

# 17. Completion Criteria

The task template system is considered usable when:

- The orchestrator entry template exists.
- Architecture request template exists.
- Implementation planning template exists.
- Codex analysis template exists.
- Copilot implementation template exists.
- Review template exists.
- Validation template exists.
- Dev Log template exists.
- Workflow update template exists.
- Template selection rules are documented.

This document satisfies the initial template definition for the AI Orchestrator workflow.

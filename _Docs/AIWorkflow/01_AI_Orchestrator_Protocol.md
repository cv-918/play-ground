# 01. AI Orchestrator Protocol

## 1. Purpose

This document defines the operating protocol for the AI Orchestrator workflow.

The purpose of this protocol is to specify how the orchestrator should process a development task from initial request to implementation planning, review, validation, documentation, and user action.

This protocol is not a generic brainstorming guide.

It is a structured execution protocol for solo development workflows where AI assists as a coordinated development team while the human developer remains the final decision maker.

---

## 2. Protocol Scope

This protocol applies when the user explicitly requests:

```text
Run the AI Orchestrator Workflow for this task.
```

Or in Korean:

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.
```

When this trigger is used, the assistant must not respond with a simple answer or isolated implementation suggestion.

Instead, the assistant must execute the structured protocol defined in this document.

---

## 3. Core Principle

The orchestrator must separate:

```text
Decision
Execution
Data
```

The orchestrator may analyze, plan, review, and generate instructions.

The orchestrator must not silently assume that implementation has been approved.

The orchestrator must clearly identify where the human developer must act, approve, verify, or store information.

---

## 4. Standard Protocol Flow

The standard AI Orchestrator Protocol consists of the following stages:

```text
1. Orchestrator Intake
2. Task Classification
3. Risk Assessment
4. Required Role Selection
5. Context Requirement Check
6. Architecture Stage
7. Reduced-Scope Stage
8. Implementation Planning Stage
9. Human Approval Gate
10. Execution Instruction Generation
11. Review Criteria Generation
12. Validation Criteria Generation
13. Documentation Stage
14. User Action List
15. Next-Step Decision
```

Not every task requires full-depth output for every stage.

However, every orchestrated task must explicitly pass through:

```text
- Task Classification
- Risk Assessment
- Human Approval Gate
- User Action List
```

---

## 5. Stage 1 — Orchestrator Intake

The orchestrator first captures the task request.

The intake must identify:

- User goal
- Current context
- Expected output
- Constraints explicitly stated by the user
- Unclear or missing information
- Whether the task is design-only, implementation-ready, review-only, or documentation-only

The orchestrator must not assume unstated implementation permission.

### Output Format

```md
## Orchestrator Intake

### User Goal
...

### Known Context
...

### Explicit Constraints
...

### Missing Information
...

### Initial Interpretation
...
```

---

## 6. Stage 2 — Task Classification

The orchestrator classifies the task into one or more categories.

### Task Categories

```text
Architecture Design
New Feature Implementation
Refactoring
Bug Fix
Data Schema Change
Tooling / Workflow
Documentation
Review
Validation
Prompt Generation
Experiment / Spike
```

### Classification Rules

- If the task changes runtime behavior, classify it as implementation-related.
- If the task changes JSON, save data, or asset configuration, classify it as data-related.
- If the task changes ownership boundaries, lifecycle, or system responsibilities, classify it as architecture-related.
- If the task only asks for explanation, classify it as documentation or design discussion.
- If the task asks Copilot or Codex to act, classify it as prompt generation or execution planning.

### Output Format

```md
## Task Classification

- Primary Type:
- Secondary Types:
- Runtime Impact:
- Data Impact:
- Architecture Impact:
- Tooling Impact:
```

---

## 7. Stage 3 — Risk Assessment

The orchestrator evaluates the task risk before suggesting execution.

### Risk Levels

```text
Low
Medium
High
Blocked
```

### Low Risk

A task is Low Risk when:

- It is documentation-only.
- It modifies no source code.
- It affects only isolated constants or comments.
- It has no runtime lifecycle impact.
- It has no data compatibility impact.

### Medium Risk

A task is Medium Risk when:

- It modifies a small number of files.
- It adds a bounded feature.
- It changes data loading or scene integration.
- It affects one subsystem with clear boundaries.
- It requires manual validation but has limited regression risk.

### High Risk

A task is High Risk when:

- It changes architecture boundaries.
- It modifies core runtime update order.
- It affects save/load or persistent data.
- It changes actor lifecycle, ownership, or destruction rules.
- It touches multiple systems.
- It could create broad regression risk.

### Blocked

A task is Blocked when:

- The required context is missing.
- The implementation target is ambiguous.
- The user has not approved a required architecture decision.
- The task would require unsafe or uncontrolled broad changes.
- The task depends on unavailable files, tools, or build results.

### Output Format

```md
## Risk Assessment

- Risk Level:
- Reason:
- Main Failure Modes:
- Required Safeguards:
```

---

## 8. Stage 4 — Required Role Selection

The orchestrator selects which specialized roles are required.

### Available Roles

```text
Orchestrator
Architect
Implementation Planner
Reviewer
Validator
Documenter
Prompt Engineer
Tool Router
```

### Role Selection Rules

Use Architect when:

- New system structure is needed.
- Responsibility boundaries must be defined.
- Final-form architecture versus reduced scope must be clarified.
- The task could otherwise become ad-hoc.

Use Implementation Planner when:

- Code changes are expected.
- Copilot or Codex will be given instructions.
- File scope and implementation order must be defined.

Use Reviewer when:

- Source code changes are expected.
- Architecture or runtime behavior could be affected.
- Git diff review is needed.

Use Validator when:

- Build, runtime, manual test, or data test is required.
- Failure symptoms should be defined.

Use Documenter when:

- The task produces a project decision.
- A dev log or workflow record is needed.
- Future AI workflows need durable context.

Use Prompt Engineer when:

- The output will be given to Copilot, Codex, or another AI coding tool.

Use Tool Router when:

- It is unclear whether the task should go to ChatGPT, Codex, Copilot, manual implementation, or future automation tools.

### Output Format

```md
## Required Roles

- Required:
  - ...
- Optional:
  - ...
- Not Required:
  - ...
```

---

## 9. Stage 5 — Context Requirement Check

Before generating implementation guidance, the orchestrator checks whether enough context exists.

### Context Types

```text
Project context
Current code structure
Target files
Existing system lifecycle
Data format
Build constraints
User decisions
Runtime validation method
```

### Rules

If the task is design-only, the orchestrator may proceed with stated assumptions.

If the task requires implementation and the current code structure is unknown, the orchestrator must either:

- Ask the user to provide relevant files or code snippets.
- Generate a Codex analysis prompt.
- Generate a Copilot exploration prompt.
- Mark assumptions clearly.

The orchestrator must not invent concrete file-level implementation details when repository context is missing.

### Output Format

```md
## Context Requirement Check

### Sufficient Context
- ...

### Missing Context
- ...

### Assumptions
- ...

### Required User Input or Tool Action
- ...
```

---

## 10. Stage 6 — Architecture Stage

The Architect defines the target structure.

The architecture stage must specify:

- Final-form architecture
- Reduced-scope version of the same architecture
- Responsibility boundaries
- Data flow
- Ownership and lifecycle
- Debugging and traceability points
- Tradeoffs
- Constraints introduced

### Required Rule

Reduced scope must not mean temporary architecture.

The reduced version must be a smaller implementation of the final structure, not a disposable shortcut.

### Output Format

```md
## Architecture Stage

### Final-Form Architecture
...

### Reduced-Scope Implementation
...

### Responsibility Boundaries
...

### Data Flow
...

### Ownership / Lifecycle
...

### Debuggability
...

### Tradeoffs
...

### Constraints
...
```

---

## 11. Stage 7 — Reduced-Scope Stage

The orchestrator defines what will be implemented now.

This stage prevents uncontrolled expansion.

### Required Fields

- Current implementation scope
- Explicit non-goals
- Future extension points
- What must not be implemented yet
- What must remain compatible with future expansion

### Output Format

```md
## Reduced-Scope Stage

### Implement Now
- ...

### Do Not Implement Now
- ...

### Preserve for Future
- ...

### Deferred Decisions
- ...
```

---

## 12. Stage 8 — Implementation Planning Stage

The Implementation Planner converts the approved architecture into an execution plan.

This stage must not redesign the architecture.

### Required Fields

- Candidate files to create
- Candidate files to modify
- Files that should not be touched
- Implementation order
- Data structure changes
- Runtime integration points
- Build risks
- Manual validation points

### Output Format

```md
## Implementation Planning Stage

### Candidate Files to Create
- ...

### Candidate Files to Modify
- ...

### Files Not to Touch
- ...

### Implementation Order
1. ...
2. ...
3. ...

### Build Risks
- ...

### Runtime Risks
- ...
```

---

## 13. Stage 9 — Human Approval Gate

Before execution, the orchestrator must explicitly stop and request approval when required.

### Approval Is Required For

- Source code implementation
- Structural refactoring
- File creation under project source directories
- JSON schema changes
- Save/load behavior changes
- Actor lifecycle changes
- Scene lifecycle changes
- Build setting changes
- Git operations
- Any broad or irreversible change

### Approval Output Format

```md
## Human Approval Gate

Approval Required: Yes

Please approve or reject the following before implementation:

1. Architecture direction
2. Reduced scope
3. Candidate files
4. Non-goals
5. Validation criteria
```

### No-Approval Case

For documentation-only tasks, the orchestrator may continue without an approval pause, but must still list user actions.

---

## 14. Stage 10 — Execution Instruction Generation

After approval, the orchestrator generates instructions for the correct execution tool.

### Execution Targets

```text
Manual Implementation
GitHub Copilot Agent Mode
Codex
Codex CLI
Future Local Orchestrator
```

### Copilot Prompt Rules

A Copilot prompt must include:

- Goal
- Approved architecture summary
- Files allowed to modify
- Files forbidden to modify
- Required changes
- Forbidden changes
- Output requirements
- Validation notes

### Codex Prompt Rules

A Codex prompt must include:

- Repository analysis objective
- Systems to inspect
- Expected findings
- Questions to answer
- Implementation risks to identify
- No-write or write permission status

### Output Format

```md
## Execution Instruction

### Target Tool
...

### Prompt
```text
...
```

### User Action
- Copy this prompt into ...
```

---

## 15. Stage 11 — Review Criteria Generation

The Reviewer defines what must be checked after execution.

### Review Areas

```text
Architecture boundary
Responsibility leakage
Runtime state safety
Ownership and lifetime
Update order
Data consistency
Performance risk
Regression risk
Debuggability
Diff size
Unrelated changes
```

### Output Format

```md
## Review Criteria

### Critical
- ...

### Major
- ...

### Minor
- ...

### Optional
- ...
```

---

## 16. Stage 12 — Validation Criteria Generation

The Validator defines how the user should verify the change.

### Validation Areas

```text
Build verification
Runtime smoke test
Manual gameplay test
Data loading test
Edge cases
Failure symptoms
Debug log points
Regression checks
```

### Output Format

```md
## Validation Criteria

### Build Checks
- ...

### Runtime Checks
- ...

### Manual Test Steps
1. ...
2. ...
3. ...

### Failure Symptoms
- ...

### Regression Checks
- ...
```

---

## 17. Stage 13 — Documentation Stage

The Documenter defines what should be recorded.

### Documentation Targets

```text
Dev Log
Architecture note
Workflow update
Prompt template update
AGENTS.md update
copilot-instructions.md update
```

### Dev Log Minimum Fields

```md
# Dev Log

## Summary
...

## Files Changed
...

## Architecture Notes
...

## Validation
...

## Remaining Risks
...

## Next Tasks
...
```

### Output Format

```md
## Documentation Stage

### Required Documents
- ...

### Dev Log Draft
...
```

---

## 18. Stage 14 — User Action List

Every orchestrator response must clearly state what the user must do.

The user action list must distinguish:

- Save this file
- Read this section carefully
- Run this command
- Copy this prompt to Codex
- Copy this prompt to Copilot
- Check Git diff
- Run build
- Run manual test
- Confirm approval
- Do not commit yet
- Commit now if verified

### Output Format

```md
## User Actions

### Required Now
- ...

### Required After Execution
- ...

### Do Not Do Yet
- ...
```

---

## 19. Stage 15 — Next-Step Decision

The orchestrator must end by stating the next valid step.

Possible next steps:

```text
Wait for user approval
Generate Copilot prompt
Generate Codex analysis prompt
Review user-provided diff
Generate validation checklist
Generate dev log
Update workflow documents
Proceed to next workflow document
Stop because task is blocked
```

### Output Format

```md
## Next Step

Recommended next step:
...

Do not proceed to:
...
```

---

## 20. Stop Conditions

The orchestrator must stop instead of proceeding when:

- The user has not approved required implementation.
- The repository context is insufficient for file-level instructions.
- The task scope is too broad.
- The task combines feature work and large refactoring.
- The requested change violates project architecture principles.
- The user asks for an unsafe or uncontrolled automation step.
- The orchestrator cannot identify validation criteria.
- The implementation would require guessing critical runtime behavior.

When stopped, the orchestrator must explain what is missing and what the user should do next.

---

## 21. Escalation Rules

The orchestrator must escalate the task to a higher-control workflow when risk increases.

### Escalate to Architecture Review When

- Multiple systems are affected.
- Responsibility boundaries are unclear.
- A manager, scene, actor, or component class may grow too large.
- Runtime lifecycle changes are involved.

### Escalate to Codex Analysis When

- File-level implementation depends on repository context.
- The assistant does not know existing class names.
- Multiple possible integration points exist.
- A safe implementation plan requires codebase inspection.

### Escalate to Manual Approval When

- Refactoring is proposed.
- Data schema changes are proposed.
- Save/load behavior is affected.
- Build settings are affected.
- The task may affect many files.

---

## 22. Fast Path

Low-risk tasks may use a shortened workflow.

### Fast Path Eligible

- Documentation-only updates
- Prompt template edits
- Dev log generation
- Small explanation tasks
- Formatting-only changes

### Fast Path Still Requires

- Task classification
- Risk level
- User action list
- Next step

Fast Path must not be used for runtime code changes unless explicitly approved.

---

## 23. Full Path

Medium or High Risk tasks must use the full workflow.

### Full Path Required

- New systems
- Runtime behavior changes
- Scene integration
- Actor lifecycle changes
- JSON schema changes
- Save/load integration
- Refactoring
- Toolchain changes
- Build setting changes

Full Path must include:

```text
Architecture Stage
Reduced-Scope Stage
Implementation Planning Stage
Human Approval Gate
Review Criteria
Validation Criteria
Documentation Stage
```

---

## 24. Output Discipline

The orchestrator must produce structured output.

The orchestrator should avoid:

- Vague recommendations
- Hidden assumptions
- Unbounded implementation advice
- Mixing design and execution without approval
- Treating AI output as already accepted
- Omitting user actions

The orchestrator should always make clear:

- What is known
- What is assumed
- What is proposed
- What requires approval
- What the user must do next

---

## 25. Operating Trigger

The phrase:

```text
Run the AI Orchestrator Workflow for this task.
```

or:

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.
```

means:

```text
Do not answer with a simple suggestion.
Run the full or appropriate shortened orchestrator protocol.
Produce structured outputs.
Clearly list user actions.
Stop at approval gates when required.
```

This trigger is the standard entry point for orchestrated AI-team development.

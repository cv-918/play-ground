# AGENTS.md

## 1. Purpose

This file defines the top-level working rules for AI assistants operating on this repository.

AI assistants must follow these rules when analyzing, planning, editing, reviewing, documenting, or generating prompts for this project.

This repository uses an AI Orchestrator workflow. The durable workflow documents are stored under:

```text
_Docs/AIWorkflow/
```

This file is the repository-level entry point for AI tools.

---

## 2. Repository Context

Repository root:

```text
play-ground/
```

Primary project:

```text
PlayGround/
```

Project type:

```text
Solo-developed 2D game prototype
```

Primary technical context:

- Windows
- C++
- WinAPI-based custom rendering
- Custom renderer
- Component-based `GameObject` / `Component` structure
- JSON-driven gameplay data
- Future migration possibility to Unity
- Git-managed repository

Important project preference:

- Preserve long-term maintainable architecture.
- Avoid temporary structures that require future rewrite.
- Apply final-form architecture with reduced scope when needed.

---

## 3. Repository Folder Policy

Approved repository-level documentation folders:

```text
_Docs/
_DevLog/
```

Approved AI workflow folder:

```text
_Docs/AIWorkflow/
```

Approved Dev Log folders:

```text
_DevLog/FixLog/
_DevLog/WorkLog/
_DevLog/Retrospective/
```

Do not introduce redundant documentation paths such as:

```text
PlayGround/_DevLog/Documents/FixLog/
_DevLog/Documents/FixLog/
```

The `PlayGround/` folder should remain focused on the actual game project source, data, resources, and project files.

Repository-level process documents, workflow documents, and development logs should stay at the repository root.

---

## 4. AI Workflow Source of Truth

The AI Orchestrator workflow is defined by these documents:

```text
_Docs/AIWorkflow/00_AI_Orchestrator_Overview.md
_Docs/AIWorkflow/01_AI_Orchestrator_Protocol.md
_Docs/AIWorkflow/02_Workflow_Scope.md
_Docs/AIWorkflow/03_Agent_Roles.md
_Docs/AIWorkflow/04_Human_Approval_Gates.md
_Docs/AIWorkflow/05_Tool_Routing_Rules.md
_Docs/AIWorkflow/06_Task_Templates.md
_Docs/AIWorkflow/07_Review_Validation_Rules.md
_Docs/AIWorkflow/08_DevLog_Rules.md
```

Required-read Korean summaries may exist next to the English originals.

The English workflow documents are the operational source of truth for AI tools.

The Korean required-read documents are user-facing support documents.

---

## 5. Core Architecture Principles

AI assistants must preserve the following principles.

### 5.1 Final-Form Architecture First

Always define the intended final architecture first.

Then define a reduced-scope version of the same structure.

Do not propose temporary architecture that is expected to be thrown away.

Correct approach:

```text
Final-form architecture
  -> Reduced-scope implementation of the same structure
```

Incorrect approach:

```text
Temporary shortcut
  -> Future rewrite expected
```

---

### 5.2 Separate Decision, Execution, and Data

Keep responsibilities separated.

```text
Decision: planning, selection, policy, state decisions
Execution: concrete runtime action, file editing, build/test execution
Data: JSON, config, source data, documents, logs, diffs
```

Do not place decision logic, execution logic, and data parsing into a single monolithic object unless there is a clear architectural reason.

---

### 5.3 Avoid Monolithic Class Growth

Do not keep adding branches to large actor, scene, or manager classes.

Avoid growing classes such as:

```text
Enemy
Scene
Manager
DataManager
```

into catch-all containers.

Prefer focused components, services, data loaders, builders, or strategy-like objects when they provide clear structural value.

Do not introduce unnecessary abstraction.

Use the smallest structure that preserves maintainability, traceability, and future extension.

---

### 5.4 Preserve Debuggability and Traceability

Systems should be easy to inspect and debug.

Prefer explicit:

- State names
- Data IDs
- Ownership rules
- Lifecycle rules
- Validation points
- Failure messages
- Debug log locations
- Reviewable diffs

Avoid hidden behavior and implicit state coupling.

---

## 6. Project-Specific Implementation Constraints

### 6.1 Rendering

The project uses WinAPI-based custom rendering.

Do not introduce GDI+ unless the user explicitly approves a major rendering-policy change.

Rendering-related changes must preserve the existing rendering pipeline and project constraints.

---

### 6.2 Animation and State

Treat animation playback and gameplay state as separate responsibilities.

General rule:

```text
FSM / gameplay state controls behavior.
Animator plays animation.
Renderer draws.
Builder assembles data.
```

Do not turn the animator into the gameplay state machine unless explicitly approved.

---

### 6.3 Data-Driven Design

Gameplay data is commonly JSON-driven.

Data schema changes require explicit approval.

For JSON/data work, define:

- Field names
- Field meanings
- Required versus optional fields
- Defaults
- Invalid-data behavior
- Debug/release failure behavior
- Backward compatibility or migration needs

Do not infer data behavior in the wrong layer.

---

### 6.4 Runtime Lifecycle

Be careful with:

- Initialization order
- Update order
- Render order
- Ownership
- Registration/unregistration
- Delayed destruction
- Scene transitions
- Component dependencies
- Owner destruction
- Event/callback cleanup

If lifecycle assumptions are required, state them explicitly.

---

## 7. AI Orchestrator Operating Trigger

When the user says:

```text
Run the AI Orchestrator Workflow for this task.
```

or:

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.
```

AI assistants must not answer with a simple suggestion.

Instead, execute the appropriate orchestrator protocol:

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
11. Review Criteria
12. Validation Criteria
13. Documentation Stage
14. User Action List
15. Next-Step Decision
```

Use Fast Path only for low-risk tasks.

Use Full Path for architecture, runtime, data schema, refactor, or AI-generated implementation tasks.

---

## 8. Approval Rules

AI assistants must stop and request explicit user approval before:

- Source code implementation
- Structural refactoring
- File creation under project source directories
- JSON schema changes
- Save/load behavior changes
- Actor lifecycle changes
- Scene lifecycle changes
- Runtime behavior changes
- Build setting changes
- Tool execution that may modify files
- Git commit recommendations
- Workflow rule changes

Approval applies only to the described scope.

If scope changes, request new approval.

When unsure, assume approval is required.

---

## 9. Tool Routing Rules

Use the correct tool for the responsibility.

```text
ChatGPT:
  reasoning, planning, architecture, review criteria, validation criteria, documentation, prompt generation

Codex:
  repository analysis, file/symbol exploration, implementation impact analysis, codebase-aware review

GitHub Copilot Agent Mode:
  approved bounded local implementation

Manual implementation:
  small precise edits or high-control sensitive changes

Git:
  status, diff, rollback, commit boundaries, history tracking

Build/test tools:
  actual compile-time and runtime verification

Markdown:
  durable decisions, rules, prompts, Dev Logs
```

Do not use Copilot before architecture and scope are approved.

Do not use ChatGPT as if it can inspect local files, run builds, execute tests, or verify runtime behavior without user-provided evidence.

Do not introduce heavy automation tools until the document-based and semi-automated workflow is stable.

---

## 10. Coding and Change Rules

When modifying code or generating implementation prompts:

- Keep changes inside approved scope.
- Do not modify unrelated files.
- Do not perform unrelated refactoring.
- Preserve existing naming and style unless a change is approved.
- Keep diffs reviewable.
- Prefer small coherent changes over broad mixed changes.
- Preserve current architecture unless an architecture change is approved.
- Add comments only when they clarify non-obvious logic or lifecycle constraints.
- Do not remove existing behavior unless explicitly stated.
- Do not add temporary hacks intended for future rewrite.

If required context is missing, stop and ask for repository analysis or user-provided code.

Do not invent concrete file-level details when repository context is unknown.

---

## 11. Review Rules

Review is required when:

- Source code changed.
- AI generated or modified code.
- Runtime behavior changed.
- Data schema changed.
- Save/load behavior changed.
- Scene or actor lifecycle changed.
- Architecture boundaries changed.
- Refactoring was performed.
- Git diff contains multiple files.

Classify review findings as:

```text
Critical
Major
Minor
Optional
```

Critical issues must be fixed before completion.

Major issues must be fixed or explicitly accepted by the user.

Optional improvements must not be mixed with required fixes.

---

## 12. Validation Rules

Validation is required when:

- Source code changed.
- Runtime behavior changed.
- Data loading changed.
- UI behavior changed.
- Scene flow changed.
- Actor behavior changed.
- Save/load behavior changed.
- AI-generated implementation was applied.
- A bug fix or refactor is considered complete.

Build success is required but not sufficient.

The assistant must not claim validation passed unless the user provides evidence.

If validation was not performed, state that explicitly.

---

## 13. Dev Log Rules

Create Dev Logs for meaningful work.

Standard Dev Log location:

```text
_DevLog/FixLog/
```

Use WorkLog for investigations:

```text
_DevLog/WorkLog/
```

Use Retrospective for process reviews:

```text
_DevLog/Retrospective/
```

A Dev Log should record:

- Summary
- Background
- Scope
- Files changed
- Architecture notes
- Implementation notes
- Review summary
- Validation summary
- Remaining risks
- Next tasks
- AI assistance, if meaningful

Do not invent validation results.

If build or runtime validation was not performed, say so explicitly.

---

## 14. Documentation Language Policy

Repository workflow documents intended for AI tools should generally be written in English.

Korean required-read summaries may be created for the human developer.

User-facing explanations in ChatGPT should be in Korean unless the user requests otherwise.

Dev Logs may be written in Korean or English depending on the intended reader, but they must remain accurate and traceable.

---

## 15. Git Safety Rules

Before AI-assisted implementation, check:

```bash
git status
```

After implementation, check:

```bash
git status
git diff
```

Before commit, check:

```bash
git status
git diff --cached
```

Do not commit when:

- Unrelated changes are present.
- The diff contains unexpected files.
- AI modified files outside approved scope.
- The user cannot explain the diff.
- Required validation failed or was not performed without explicit acceptance.

---

## 16. Stop Conditions

AI assistants must stop instead of proceeding when:

- Required approval is missing.
- Repository context is insufficient for file-level instructions.
- Scope is too broad.
- Feature work and large refactoring are mixed.
- Requested changes violate project architecture principles.
- Validation criteria cannot be identified.
- Critical runtime behavior would require guessing.
- Tool permissions are unclear.
- The user has not confirmed local execution results.

When stopping, state:

- What is missing
- Why it matters
- What the user should do next

---

## 17. User Action Requirement

When the user must act, state actions explicitly.

Examples:

```text
Save this file to ...
Run git status.
Run the build.
Run this manual test.
Copy this prompt into Codex.
Copy this prompt into Copilot Agent Mode.
Review the diff.
Do not commit yet.
Commit with this message if validation passed.
```

Do not use vague instructions such as:

```text
Handle this later.
Save if needed.
Check somehow.
```

---

## 18. Completion Rule

A task can be considered complete only when:

- Required approvals were obtained.
- Implementation stayed within approved scope.
- Review was performed when required.
- Validation was performed or explicitly deferred.
- Remaining risks are documented.
- Dev Log exists when required.
- User decides whether to commit.

AI-generated output alone does not complete a task.

# 02. Workflow Scope

Status: Current canonical scope reference
Authority: Defines when to use full workflow, fast path, or direct work. README and playbook documents should summarize or link here rather than redefine scope rules.

## 1. Purpose

This document defines where the AI Orchestrator workflow should be applied and where it should not be applied.

The purpose of this document is to prevent overuse of the workflow for trivial tasks while ensuring that architecture-sensitive, runtime-sensitive, or data-sensitive tasks receive proper orchestration.

This workflow should improve development quality and control.

It should not become a heavy process that slows down every small change.

---

## 2. Target Project Scope

The initial target project is:

```text
Dust Land / PlayGround
```

The workflow is designed for a solo-developed C++ 2D game prototype with:

- WinAPI-based custom rendering
- Component-based GameObject structure
- JSON-driven game data
- Runtime systems such as actors, scenes, UI, particles, dialogue, skills, enemies, and progression
- Future migration possibility to Unity

The workflow may later be adapted to other projects, but this document defines the initial scope for Dust Land / PlayGround only.

---

## 3. Primary Workflow Goal

The primary goal is to make AI-assisted development:

```text
structured
bounded
reviewable
traceable
architecture-safe
```

The workflow is not intended to maximize raw implementation speed at the cost of structure.

The workflow exists to ensure that AI assistance does not create uncontrolled changes, temporary architecture, responsibility leakage, or hard-to-debug runtime behavior.

---

## 4. Work Types That Must Use the Workflow

The AI Orchestrator workflow must be used for the following work types.

### 4.1 New System Design

Use the workflow when introducing a new gameplay, UI, tool, data, or runtime system.

Examples:

- Dialogue system
- NPC placement system
- Progression state system
- Skill system
- Enemy ability system
- Particle emitter system
- Video option system
- Resource loading pipeline

Reason:

New systems define long-term boundaries. They must not start as temporary structures.

---

### 4.2 Architecture-Affecting Refactoring

Use the workflow when a change affects ownership, responsibility, data flow, lifecycle, or system boundaries.

Examples:

- Moving logic out of `Enemy`
- Splitting Scene responsibilities
- Separating data loading from runtime behavior
- Introducing new component boundaries
- Changing update order
- Changing object ownership or destruction flow

Reason:

Architecture refactoring can silently create regressions or responsibility leaks if it is not reviewed.

---

### 4.3 Runtime Behavior Changes

Use the workflow when the change affects gameplay behavior, actor state, scene behavior, animation behavior, input behavior, UI behavior, or system lifecycle.

Examples:

- Changing attack behavior
- Changing movement rules
- Changing state transitions
- Changing spawn or destruction rules
- Changing dialogue progression behavior
- Changing scene initialization or cleanup
- Changing UI update/render behavior

Reason:

Runtime changes require validation and regression awareness.

---

### 4.4 Data Schema Changes

Use the workflow when adding or modifying structured project data.

Examples:

- JSON schema changes
- New data fields for enemies, skills, NPCs, stages, dialogue, or particles
- Save/load data changes
- Resource path conventions
- Asset metadata formats

Reason:

Data schema changes affect content production, loaders, validation, and backward compatibility.

---

### 4.5 Cross-System Integration

Use the workflow when a task connects multiple systems.

Examples:

- Dialogue event triggers gameplay state changes
- NPC placement connects data loading, scene spawn, and interaction
- Skill data connects projectile creation and damage logic
- Enemy ability data connects AI state, movement, and attack execution
- Video options connect UI, settings storage, and screen system behavior

Reason:

Integration work often fails at responsibility boundaries.

---

### 4.6 AI-Generated Implementation

Use the workflow when Copilot, Codex, or another coding agent will produce or modify code.

Examples:

- Copilot Agent Mode implementation
- Codex-generated patch
- AI-assisted refactor
- AI-generated loader or manager code
- AI-generated component changes

Reason:

AI-generated implementation requires explicit scope, forbidden changes, review criteria, and validation criteria.

---

### 4.7 Work That Requires Dev Log

Use the workflow when the work should leave a durable project record.

Examples:

- Feature completed
- Architecture decision made
- Significant refactor completed
- Bug with important root cause fixed
- Workflow rule updated
- Tooling behavior changed

Reason:

Important decisions must not remain only in chat history.

---

## 5. Work Types That May Use a Shortened Workflow

Some tasks do not require the full protocol but still benefit from lightweight orchestration.

### 5.1 Small Bug Fixes

Use a shortened workflow when:

- The bug is localized.
- The fix affects one small area.
- No architecture boundary changes are involved.
- No data schema changes are involved.

Required stages:

```text
Task Classification
Risk Assessment
Implementation Scope
Review Criteria
Validation Criteria
User Actions
```

---

### 5.2 Small Data Additions

Use a shortened workflow when:

- Existing schema is not changed.
- Only new data entries are added.
- Runtime behavior does not change.
- Loader logic is unchanged.

Examples:

- Adding a new enemy entry using an existing schema
- Adding a new skill entry using an existing schema
- Adding a new dialogue line using an existing schema

Required stages:

```text
Task Classification
Risk Assessment
Data Validation
User Actions
```

---

### 5.3 Documentation Updates

Use a shortened workflow when updating existing documents without changing source code.

Examples:

- Dev log generation
- Prompt template cleanup
- Workflow document update
- Architecture note addition

Required stages:

```text
Task Classification
Risk Assessment
Document Output
User Actions
```

---

### 5.4 Prompt Generation

Use a shortened workflow when the task is only to generate a prompt for another tool.

Examples:

- Copilot implementation prompt
- Codex repository analysis prompt
- Code review prompt
- Validation prompt

Required stages:

```text
Task Classification
Risk Assessment
Prompt Output
User Actions
```

---

## 6. Work Types That Should Not Use the Full Workflow

The full workflow should not be used for trivial or isolated tasks.

### 6.1 Simple Constant Changes

Examples:

- Changing a numeric tuning value for quick testing
- Adjusting local debug-only values
- Changing a temporary prototype constant

Use direct implementation unless the value affects balance policy, data schema, or multiple systems.

---

### 6.2 Simple Asset Replacement

Examples:

- Replacing one PNG file with another
- Updating a temporary placeholder image
- Renaming a local test asset

Use direct implementation unless resource paths, asset metadata, or loading rules change.

---

### 6.3 Typos and Formatting

Examples:

- Fixing comments
- Fixing Markdown typos
- Reformatting text
- Renaming a local note

Use direct implementation.

---

### 6.4 One-Off Debug Logging

Examples:

- Adding temporary print/log statements for local debugging
- Adding one temporary breakpoint helper
- Adding a short-lived trace line

Use direct implementation, but remove temporary code before committing unless it becomes part of a formal debug system.

---

### 6.5 Throwaway Experiments

Examples:

- Testing a rendering idea in a scratch file
- Trying an isolated math formula
- Quickly checking an API behavior

Use direct experimentation.

If the experiment becomes a candidate feature, convert it into a proper orchestrated task before integrating it into the main project.

---

## 7. Escalation Conditions

A task that initially appears small must be escalated to the full workflow if any of the following conditions are true.

### 7.1 Multiple Files Are Affected

Escalate when the change affects several files across different systems.

Reason:

Multi-file changes are harder to review and may hide responsibility leakage.

---

### 7.2 Runtime Lifecycle Is Affected

Escalate when the change affects:

- Initialization
- Update order
- Render order
- Destruction
- Scene transition
- Ownership
- Registration/unregistration

Reason:

Lifecycle bugs are often hard to debug after the fact.

---

### 7.3 Data Format Is Changed

Escalate when the change modifies:

- JSON schema
- Save data
- Resource path convention
- Asset metadata
- Enum serialization
- Loader expectations

Reason:

Data changes can break content and future compatibility.

---

### 7.4 State Transition Is Changed

Escalate when the change affects:

- Actor state
- FSM transition
- Dialogue progression
- UI mode
- Skill state
- Enemy behavior state
- Player progression state

Reason:

State bugs often produce intermittent runtime failures.

---

### 7.5 AI Tool Will Modify Code

Escalate when Copilot, Codex, or another agent will write or modify code.

Reason:

AI execution requires strict scope, review, and validation.

---

### 7.6 The User Cannot Easily Review the Diff

Escalate when the expected diff is large, cross-cutting, or difficult to reason about.

Reason:

The workflow exists to keep AI-generated work reviewable.

---

## 8. Non-Goals of the Workflow

This workflow is not intended to:

- Automate every small edit
- Replace human architectural judgment
- Remove manual build and runtime verification
- Make AI freely modify the whole repository
- Encourage large unreviewable changes
- Turn every task into a heavy process
- Force multi-agent frameworks before they are needed
- Treat generated code as correct by default

---

## 9. Tool Usage Scope

### 9.1 ChatGPT

Use ChatGPT for:

- Orchestration
- Architecture reasoning
- Review criteria
- Validation criteria
- Documentation
- Prompt generation
- Workflow rule updates

Do not use ChatGPT as if it can directly operate the local development environment.

---

### 9.2 Codex

Use Codex for:

- Repository analysis
- File and symbol exploration
- Implementation impact analysis
- Codebase-aware planning
- Diff review
- Copilot prompt refinement

Use Codex when repository context matters.

---

### 9.3 GitHub Copilot Agent Mode

Use Copilot Agent Mode for:

- Bounded implementation
- Local file editing
- Compile-error fixes
- Repetitive code changes

Do not use Copilot Agent Mode for unconstrained system redesign.

---

### 9.4 Manual Implementation

Use manual implementation when:

- The change is small and obvious.
- The developer needs precise control.
- The AI-generated plan is useful but code generation is unnecessary.
- The task is risky enough that manual edits are safer.

---

### 9.5 Future Automation Tools

Tools such as Codex CLI, OpenAI Agents SDK, LangGraph, MCP, Claude Code, or Gemini CLI are outside the initial required scope.

They may be evaluated later when the document-based and semi-automated workflow becomes stable.

---

## 10. Human Responsibilities

The human developer is responsible for:

- Approving architecture
- Approving implementation scope
- Saving workflow documents
- Running local builds
- Running runtime tests
- Inspecting Git diff
- Deciding whether to commit
- Rejecting AI output when it violates project constraints
- Updating project rules when new constraints are discovered

The human developer must not skip review just because AI produced a confident answer.

---

## 11. AI Responsibilities

The AI assistant is responsible for:

- Structuring the workflow
- Identifying risk
- Separating design from execution
- Defining responsibility boundaries
- Generating bounded implementation prompts
- Generating review criteria
- Generating validation criteria
- Listing explicit user actions
- Stopping when required context or approval is missing

The AI assistant must not hide uncertainty.

---

## 12. Default Scope Policy

When scope is unclear, the default policy is:

```text
Narrow the implementation scope.
Preserve the final architecture.
Defer unrelated work.
Ask for approval before execution.
```

The workflow must prefer a small, structurally correct implementation over a broad, unstable implementation.

---

## 13. First Practical Application Scope

The first practical task for this workflow should be:

```text
NPC placement data system
```

Initial recommended scope:

- Define NPC placement data structure.
- Load NPC placement data from JSON.
- Spawn existing NPCs in TownScene using placement entries.
- Keep interaction, quest, and dialogue branching out of scope.

This task is suitable because it is:

- Data-driven
- Bounded
- Useful
- Easy to validate manually
- Good for testing Codex/Copilot prompt flow
- Connected to future systems without requiring them immediately

---

## 14. Scope Review Checklist

Before running the full workflow for a task, check:

```text
[ ] Does this task affect architecture boundaries?
[ ] Does this task affect runtime behavior?
[ ] Does this task affect data schema?
[ ] Does this task involve multiple systems?
[ ] Will an AI coding tool modify files?
[ ] Is the expected diff hard to review?
[ ] Does this task need a durable dev log?
```

If any answer is yes, use the full workflow or at least a shortened orchestrator workflow.

---

## 15. Completion Criteria for Scope Definition

The workflow scope is considered defined when:

- Mandatory full-workflow task types are documented.
- Shortened workflow task types are documented.
- Full-workflow exclusions are documented.
- Escalation conditions are documented.
- Tool usage scope is documented.
- Human and AI responsibilities are documented.
- The first practical application target is documented.

This document satisfies the initial scope definition for the AI Orchestrator workflow.

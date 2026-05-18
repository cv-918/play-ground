# 00. AI Orchestrator Overview

## 1. Purpose

This document defines the high-level direction for building an AI Orchestrator-based development workflow for the Dust Land / PlayGround project.

The goal is not to simply collect prompt templates.

The goal is to establish a repeatable solo-development operating system where AI is used as a structured development team, coordinated by an orchestrator workflow.

In this workflow, the human developer remains the final decision maker, while AI agents assist with planning, architecture, implementation planning, code review, validation, and documentation.

---

## 2. Target Project

### Primary Target

- Project: Dust Land / PlayGround
- Context: Solo-developed 2D game prototype
- Development environment:
  - Windows
  - C++
  - WinAPI-based custom rendering
  - Component-based game object structure
  - JSON-driven gameplay data
  - Future migration possibility to Unity

### Why This Project Is the First Target

This project is suitable for AI Orchestrator workflow adoption because:

- The project is controlled by a single developer.
- Architecture decisions can be applied consistently.
- The cost of experimentation is lower than in a live production project.
- The workflow can later be adapted to larger or professional codebases.
- The project already benefits from strong documentation, data-driven design, and modular system boundaries.

---

## 3. Core Concept

The AI Orchestrator workflow treats AI not as a single chatbot, but as a coordinated development team.

The basic model is:

```text
Human Developer
  ↓
AI Orchestrator
  ↓
Specialized AI Roles
  - Architect
  - Implementation Planner
  - Reviewer
  - Validator
  - Documenter
  ↓
Human Approval
  ↓
Bounded Execution
  - Copilot Agent Mode
  - Codex
  - Manual implementation
  ↓
Review / Validation / Documentation
```

The orchestrator is responsible for controlling the development flow.

The orchestrator does not blindly implement code.
It determines what should be designed, what should be executed, what should be reviewed, and where human approval is required.

### Current Target Definition

The current target is a Discord-first PC Runner-based AI development workflow
harness.

Discord is the primary user interface. The human user gives natural-language
goals, monitors progress, approves risky decisions, reviews completion, and
decides whether to commit. The local PC Runner owns task intake, structured
intent generation, task state, execution routing, session supervision, evidence
collection, verification reporting, and audit logging.

Natural language input must not be executed directly. Discord text is first
converted into a structured `GoalIntent` or `RuntimeControlIntent`. Ambiguous
input must trigger clarification or human review instead of execution.

Manual Codex prompt copy/paste is a legacy/bootstrap path, not the final
architecture. The final architecture moves normal execution toward PC
Runner-owned task workspaces, execution adapters, session monitoring, evidence
collection, and Discord-based control.

Task Lifecycle State and Execution Run State must remain separate. Task state
describes the workflow item; runtime state describes a specific execution
session. They are connected through `task_id`.

Session supervision, evidence collection, and verification judgment must also
remain separate. The Session Supervisor tracks sessions and heartbeat. The
Evidence Collector gathers logs, exit codes, changed files, and diff snapshots.
Verification Gates judge collected evidence later. Evidence collection must not
decide pass/fail.

Phase 2 is limited to runtime execution, session tracking, heartbeat, file
watching, diff snapshots, runtime control, and evidence collection. Phase 3 owns
VerificationReport, CompletionReport, Completion Card, FinalizationLog,
Follow-up Task generation, and Auto Approval Policy.

### Long-Term Product Definition

The long-term product is no longer defined as only a Discord-first runner
harness.

The long-term product is:

```text
Personal AI Development Studio
AI Studio Company Runtime
```

In this target, the human user is the Human Director / Executive Producer /
Creative Director. Persistent AI Staff Agents work as planners, designers,
engineers, artists, QA, writers, producers, reviewers, validators, and
documentation staff.

AIWorkflow Core becomes the studio operating, governance, audit, verification,
completion, finalization, and git-gate system.

The official long-term architecture is defined in:

```text
_Docs/AIWorkflow/FinalBlueprint/WF_Personal_AI_Development_Studio_Architecture.md
_Docs/AIWorkflow/FinalBlueprint/WF_Personal_AI_Development_Studio_Architecture_KR.md
```

The controlling principle is:

```text
Agent Autonomy within Workflow Governance.
```

Agents may think, propose, object, ask questions, and hand off work within their
role authority. They may not unilaterally approve, canonize, implement, import,
commit, push, or release outside governance gates.

---

## 4. Initial Automation Level

The initial version of this workflow is not a fully autonomous local agent runtime.

The initial version is a semi-automated orchestrator workflow.

### Initial Level

```text
Level 2: GPT-based semi-automated orchestration
```

At this level:

- ChatGPT acts as the orchestrator.
- ChatGPT simulates or coordinates specialized AI roles.
- The human developer manually transfers approved implementation prompts to Codex or Copilot.
- Local execution, file modification, build, test, and Git operations are performed by the human developer.
- AI-generated outputs are treated as proposals until approved.

### Not Included in the Initial Level

The initial workflow does not automatically:

- Modify local files directly
- Run Visual Studio builds
- Execute tests
- Commit Git changes
- Create pull requests
- Invoke Copilot automatically
- Run a local multi-agent runtime

Those capabilities belong to later automation stages.

---

## 5. Long-Term Direction

The workflow is designed to grow through stages.

### Stage 1 — Manual / Document-Based Orchestration

The orchestrator workflow is defined through Markdown documents and prompt templates.

Main outputs:

- Orchestrator overview
- Orchestrator protocol
- Agent role definitions
- Tool routing rules
- Approval gates
- Review and validation rules
- Dev log rules
- Copilot and Codex prompt templates

### Stage 2 — Semi-Automated AI Team Workflow

ChatGPT runs the orchestrator workflow in conversation.

A user can request:

```text
Run the AI Orchestrator Workflow for this task.
```

The orchestrator then produces:

- Task classification
- Required agent roles
- Architecture stage output
- Implementation planning
- Copilot prompt
- Review checklist
- Validation checklist
- Documentation draft

### Stage 3 — Local Tool-Assisted Orchestration

A future local workflow may connect AI with local project tools.

Possible integrations:

- Repository file search
- Git diff inspection
- Build log analysis
- Test result analysis
- Dev log generation
- Prompt file generation

At this stage, Codex CLI, OpenAI Agents SDK, LangGraph, MCP, or custom scripts may become useful.

### Stage 4 — Autonomous Multi-Agent Runtime

A future advanced version may use an actual multi-agent runtime.

Possible capabilities:

- Planner agent decomposes work
- Architect agent evaluates structure
- Coder agent modifies files
- Reviewer agent checks diffs
- Validator agent interprets build/test results
- Documenter agent writes dev logs
- Human approval gates control risky transitions

This stage is not the initial target.

---

## 6. Required Separation of Responsibilities

This workflow must preserve strict separation between decision, execution, and data.

### Decision

Decision responsibilities include:

- Defining what should be built
- Defining what should not be built
- Choosing architecture
- Approving implementation scope
- Accepting or rejecting AI output
- Deciding whether a change is safe to merge

Decision owners:

- Human developer
- AI Orchestrator
- Architect role
- Reviewer role

The human developer is always the final decision maker.

### Execution

Execution responsibilities include:

- Writing code
- Editing files
- Running builds
- Running tests
- Applying changes
- Fixing compile errors
- Updating project files

Execution actors:

- Human developer
- GitHub Copilot Agent Mode
- Codex
- Local scripts
- Build tools
- Test tools

Execution must happen only after the scope and architecture are approved.

### Data

Data includes:

- Source code
- JSON data
- Markdown documentation
- Git diffs
- Build logs
- Test results
- Dev logs
- Prompt templates
- Architecture decisions

Data must be explicit, traceable, and stored outside the chat whenever it becomes part of the project workflow.

ChatGPT conversations are temporary working space.
Markdown files and Git history are the durable project record.

---

## 7. Tool Roles

### ChatGPT

ChatGPT is used as:

- Orchestrator
- Architect
- Reviewer
- Validator
- Documenter
- Prompt generator for Codex and Copilot

ChatGPT should produce structured outputs and clearly mark user actions.

ChatGPT should not be treated as a local execution environment.

### Codex

Codex is used as:

- Repository analyzer
- Codebase exploration assistant
- Implementation strategy reviewer
- Diff review assistant
- Copilot prompt refinement assistant

Codex may inspect the actual repository context when available.

Codex does not replace human approval.

### GitHub Copilot Agent Mode

Copilot Agent Mode is used as:

- Bounded implementation executor
- File modification assistant
- Build-error response assistant

Copilot should receive constrained implementation requests.

Copilot must not be asked to freely redesign large systems.

### Git

Git is used as:

- Safety mechanism
- Change tracker
- Rollback mechanism
- Review boundary
- Historical record

Every meaningful AI-assisted change must be reviewable through Git diff.

### Markdown Documents

Markdown documents are used as:

- Workflow source of truth
- Architecture notes
- Prompt templates
- Dev logs
- Review records
- Validation records

The project must not rely on chat history as the only record of decisions.

---

## 8. Core Workflow

The standard AI Orchestrator workflow is:

```text
1. User provides a task request.
2. Orchestrator classifies the task.
3. Orchestrator determines required roles.
4. Architect defines final architecture and reduced-scope version.
5. Implementation Planner defines files, order, and Copilot/Codex prompt.
6. Human approves or rejects the plan.
7. Execution happens through Copilot, Codex, or manual implementation.
8. Reviewer checks architecture, runtime safety, data flow, and regression risk.
9. Validator defines build/manual test/debug verification.
10. Human runs build and tests.
11. Documenter creates dev log and remaining-risk summary.
12. Human decides whether to commit.
```

This flow may be shortened for low-risk tasks, but the approval and review boundaries must remain explicit.

---

## 9. Human Approval Principle

The workflow must include human approval gates.

AI may propose:

- Architecture
- File changes
- Implementation prompts
- Refactoring candidates
- Test scenarios
- Documentation drafts

The human developer must approve:

- Architecture direction
- Scope of implementation
- Files allowed to modify
- Any structural refactor
- Final Git commit
- Whether a task is considered complete

AI is not allowed to silently expand scope.

---

## 10. Scope Control Principle

Every task must define:

- Goal
- Context
- Scope
- Non-goals
- Allowed files
- Forbidden changes
- Validation criteria
- Known risks

This prevents AI from turning a bounded feature task into an uncontrolled refactor.

Example of a bad request:

```text
Improve the whole NPC system.
```

Example of a good request:

```text
Implement JSON-based NPC placement loading for TownScene.

Scope:
- Add NPC placement data structure.
- Add loader for placement JSON.
- Instantiate existing NPC type at configured positions.

Non-goals:
- Do not implement quest logic.
- Do not implement dialogue branching.
- Do not redesign TownScene lifecycle.
- Do not modify unrelated actor systems.
```

---

## 11. Architecture Principle

The workflow must preserve production-grade architecture even when the current implementation scope is small.

Reduced scope does not mean temporary architecture.

The correct approach is:

```text
Final-form architecture
  ↓
Reduced-scope implementation of the same structure
```

The wrong approach is:

```text
Temporary shortcut
  ↓
Later rewrite expected
```

This project should avoid designs that are expected to be thrown away.

---

## 12. Anti-Patterns

The following patterns are explicitly forbidden.

### 12.1 Unbounded AI Implementation

```text
Make the whole system better.
```

Risk:

- Unrelated refactoring
- Hidden behavior changes
- Broken architecture boundaries
- Hard-to-review diffs

### 12.2 Implementation Before Architecture

```text
Just code it first, then clean it up later.
```

Risk:

- Temporary structures become permanent
- Responsibility leaks accumulate
- Future refactoring cost increases

### 12.3 Monolithic Class Growth

Examples:

- Enemy class owns too many behavior branches
- Scene class handles loading, decision, spawning, UI, and state transitions directly
- Manager classes accumulate unrelated responsibilities

Risk:

- Low traceability
- Hard debugging
- Fragile update order
- Poor extensibility

### 12.4 Review Skipping

AI-generated code must not be accepted without review.

Minimum review areas:

- Architecture boundary
- Runtime state safety
- Lifetime/order issues
- Data consistency
- Build risk
- Regression risk
- Debuggability

### 12.5 Chat-Only Knowledge

Important decisions must not remain only in ChatGPT conversation history.

If a decision affects future work, it must be moved into:

- Architecture document
- Workflow document
- Prompt template
- AGENTS.md
- copilot-instructions.md
- Dev log

---

## 13. Initial Document Set

The AI Orchestrator workflow will be defined through the following documents.

```text
_Docs/AIWorkflow/
  00_AI_Orchestrator_Overview.md
  01_AI_Orchestrator_Protocol.md
  02_Workflow_Scope.md
  03_Agent_Roles.md
  04_Human_Approval_Gates.md
  05_Tool_Routing_Rules.md
  06_Task_Templates.md
  07_Review_Validation_Rules.md
  08_DevLog_Rules.md

_Docs/AIWorkflow/PromptTemplates/
  run_orchestrator_workflow.md
  generate_copilot_prompt.md
  run_review_stage.md
  run_validation_stage.md
  generate_devlog.md

AGENTS.md
.github/copilot-instructions.md
```

These documents should be created gradually.

This overview document is the top-level reference.

---

## 14. First Practical Target

The first real feature to test this workflow should be small enough to control but meaningful enough to validate the process.

Recommended first target:

```text
NPC placement data system
```

Reason:

- Clear data-driven structure
- Limited implementation scope
- Low failure cost
- Useful for future town systems
- Good test case for JSON loading, scene integration, validation, and documentation

Possible scope:

- Define NPC placement data
- Load placement data from JSON
- Spawn existing NPCs in TownScene using placement entries
- Do not implement quest, dialogue, or advanced interaction logic in the first pass

---

## 15. Completion Definition

This AI Orchestrator workflow is considered initially usable when the following are true:

- The orchestrator protocol is documented.
- Agent roles are documented.
- Human approval gates are documented.
- Tool routing rules are documented.
- Task templates exist.
- Review and validation rules exist.
- Dev log rules exist.
- AGENTS.md reflects the workflow.
- copilot-instructions.md reflects implementation constraints.
- One small feature has been completed using the workflow.
- The result has been reviewed, validated, documented, and committed.

---

## 16. Operating Rule

When the user says:

```text
Run the AI Orchestrator Workflow for this task.
```

or:

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.
```

The assistant should not answer with a simple implementation suggestion.

Instead, the assistant should execute the workflow stages:

```text
1. Orchestrator Intake
2. Task Classification
3. Required Roles
4. Architecture Stage
5. Implementation Planning Stage
6. Human Approval Gate
7. Copilot / Codex Prompt Generation
8. Review Criteria
9. Validation Criteria
10. Dev Log Draft
11. User Action List
```

This phrase becomes the trigger for structured AI-team workflow execution.

---

## 17. Final Principle

The purpose of this workflow is not to remove the developer from development.

The purpose is to let a solo developer operate with the support structure of a small engineering team while preserving control, traceability, and architectural integrity.

AI may accelerate the process.

AI must not replace architectural judgment, local verification, or final responsibility.

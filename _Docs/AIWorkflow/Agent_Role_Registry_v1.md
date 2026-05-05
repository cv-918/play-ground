# Agent Role Registry v1

## 1. Purpose

Agent Role Registry v1 defines the minimal durable role set for the AIWorkflow
solo game development process.

The registry exists because recent workflow tasks established three important
constraints:

- WF-029 reviewed Claude-Code-Game-Studios and decided to adapt useful role
  patterns instead of adopting a full 49-agent structure.
- WF-030 validated Codex Subagents as useful for optional, risk-based,
  read-only analysis.
- WF-031 standardized Codex Goal Prompt Contract v2 so Codex `/goal` tasks can
  be bounded, auditable, and validated.

This document turns those decisions into a small role registry that can guide
Discord orchestration, Codex `/goal` work, future subagent routing, review,
validation, and documentation.

The registry is not an executable multi-agent framework. It is a responsibility
map for routing work safely while keeping the Human Director as the final
decision-maker.

---

## 2. Operating Model

### Human Director

The Human Director is the final decision-maker for project direction, scope,
approval gates, validation acceptance, and commit decisions.

The Human Director may delegate analysis, planning, implementation prompts,
review, validation planning, documentation, or bounded file edits, but approval
does not transfer to an AI role.

### Discord Orchestrator

The Discord Orchestrator may collect task state, generate prompts, summarize
workflow status, and route the human toward the next safe action.

The Discord Orchestrator must not:

- Bypass human approval gates.
- Automatically execute Codex, Copilot, commits, pushes, releases, or external
  tools unless a future approved workflow explicitly allows that exact action.
- Treat a generated prompt as implementation approval.

### Codex `/goal`

Codex `/goal` is the bounded local execution context for repository-aware work.

Codex may inspect files, modify approved files for implementation-mode tasks,
run validation commands, and report evidence according to the current goal
prompt contract. Codex must respect the task scope, non-goals, forbidden paths,
and human decision gates.

### Codex Subagents

Codex Subagents are optional support agents. In this registry, they are primarily
used for risk-based read-only analysis, review, or validation planning.

Subagents must not modify files unless a future task explicitly grants bounded
write scope. When subagents are used, the main Codex agent or Orchestrator must
consolidate their findings before presenting a decision to the Human Director.

### Role-Based Task Routing

Roles are responsibility boundaries, not necessarily separate tools or people.
A single AI response may perform several roles if the output remains explicit.

Routing should answer:

- Which role owns the next responsibility?
- What input is required?
- What output is expected?
- Which files or tools are allowed?
- Which human decision gate must be satisfied before proceeding?

---

## 3. Role Summary Table

| Role | Primary responsibility | Activation trigger | Write permission | Human approval required |
|---|---|---|---|---|
| Orchestrator | Classify, route, control scope, and identify gates | Any orchestrated task, multi-role task, or approval-sensitive task | Workflow notes only when approved | Yes for implementation, scope expansion, tool execution, or workflow rule changes |
| Explorer | Read-only repository and context investigation | Missing file-level context, impact analysis, or risk discovery | None | Required before using findings for implementation scope changes |
| Technical Architect | Define final-form architecture and reduced-scope structure | New system, refactor, data/lifecycle boundary, or design risk | Architecture docs only when approved | Yes before implementation or architecture change |
| Gameplay Implementer | Apply approved gameplay/source changes | Approved implementation task with bounded files and validation plan | Approved source/data/docs only | Yes before any source, data, runtime, schema, or lifecycle change |
| Reviewer | Report risks, regressions, and required fixes | Diff, AI-generated output, architecture change, runtime/data change | None by default | Required to accept Major risks or proceed after findings |
| Validator | Define and assess validation evidence | Source, runtime, data, UI, scene, actor, save/load, workflow, or docs change | Validation notes only when approved | Required to accept unperformed or failed validation |
| Documentation Keeper | Record decisions, evidence, logs, and remaining risks | Meaningful workflow, architecture, implementation, review, or validation result | Approved docs/logs only | Required for workflow rule changes or completion claims |
| Tool/Workflow Engineer | Modify workflow tools, prompts, scripts, and routing behavior | Tooling task, prompt contract task, Discord command task, automation task | Approved workflow/tool files only | Yes before tool behavior, command behavior, scripts, or automation changes |

---

## 4. Required Roles

### 4.1 Orchestrator

#### Purpose

The Orchestrator turns a user request into a safe workflow path.

It controls task intake, classification, risk assessment, role selection,
context requirements, approval gates, and next-step decisions.

#### When to Activate

Activate the Orchestrator when:

- The user requests the AI Orchestrator Workflow.
- A task may affect architecture, runtime behavior, data, tooling, or workflow
  rules.
- Multiple roles are needed.
- Scope control or approval sequencing is important.
- A Codex, Copilot, Discord, review, or validation handoff is needed.

#### Inputs

- User request.
- Active task state.
- Repository and project constraints.
- Workflow rules.
- Current git status or user-provided diff.
- Known approvals, non-goals, and forbidden paths.

#### Outputs

- Task classification.
- Risk assessment.
- Required roles.
- Missing context.
- Approval gates.
- Recommended path.
- User action list.
- Next-step decision.

#### Responsibilities

- Preserve the Human Director's final authority.
- Select Fast Path or Full Path.
- Keep scope explicit and bounded.
- Decide when Explorer, Technical Architect, Reviewer, Validator,
  Documentation Keeper, or Tool/Workflow Engineer should be activated.
- Stop when approval or evidence is missing.
- Consolidate subagent findings before presenting recommendations.

#### Forbidden Behaviors

- Silently approve implementation.
- Override human approval gates.
- Treat generated prompts as approval.
- Hide missing context.
- Expand scope without approval.
- Route implementation before architecture and reduced scope are approved.
- Claim validation passed without evidence.
- Commit, push, release, or run destructive actions automatically.

#### Required Handoff Format

```md
Role: Orchestrator
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
```

#### Human Decision Gates

Human approval is required before:

- Source, data, runtime, schema, lifecycle, build, or tool behavior changes.
- Workflow rule changes.
- External tool installation.
- Commit, push, release, or destructive commands.
- Accepting unresolved Major or Critical risks.

#### Example Usage in AIWorkflow

For a gameplay feature, the Orchestrator classifies the task as Full Path,
activates Technical Architect for final-form architecture, requests approval,
routes implementation only after approval, then routes review, validation, and
documentation.

---

### 4.2 Explorer

#### Purpose

The Explorer gathers repository facts without changing files.

The Explorer exists to reduce guessing before architecture, implementation
planning, review, or validation.

#### When to Activate

Activate the Explorer when:

- File-level context is missing.
- Existing code ownership or lifecycle must be understood.
- A proposed change may touch multiple systems.
- A review requires source context.
- A data or workflow task needs current repository evidence.
- Optional Codex Subagent read-only analysis would reduce risk.

#### Inputs

- Specific research question.
- Allowed search paths.
- Forbidden paths.
- Relevant task id and context.
- Existing user-provided snippets, diffs, or logs.

#### Outputs

- Relevant files and symbols.
- Current behavior summary.
- Dependency or lifecycle observations.
- Risk notes.
- Open questions.
- Recommended next role.

#### Responsibilities

- Use repository evidence.
- Report uncertainty explicitly.
- Identify ownership, lifecycle, data flow, and integration points.
- Keep findings bounded to the question.
- Avoid unrelated analysis.
- Provide file references when useful.

#### Forbidden Behaviors

- Modify files.
- Run tools that modify project state.
- Infer implementation details without evidence.
- Expand into architecture decisions without handoff.
- Approve or implement changes.
- Rewrite the task scope.

#### Required Handoff Format

```md
Role: Explorer
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
```

#### Human Decision Gates

Human approval is required before Explorer findings are used to expand scope,
authorize implementation, change architecture, or modify files.

#### Example Usage in AIWorkflow

Before changing enemy behavior, Explorer inspects current enemy state, animation,
component, and data loading boundaries, then reports which files are likely in
scope and where lifecycle risks exist.

---

### 4.3 Technical Architect

#### Purpose

The Technical Architect defines the intended final architecture first, then a
reduced-scope implementation of the same structure.

This role protects the project from temporary shortcuts, monolithic class growth,
and mixed decision/execution/data responsibilities.

#### When to Activate

Activate the Technical Architect when:

- A new system or significant feature is proposed.
- Runtime lifecycle, ownership, or update order may change.
- JSON schema or data-driven behavior may change.
- A manager, scene, actor, or component may grow too broad.
- Future Unity migration compatibility matters.
- The implementation path is structurally unclear.

#### Inputs

- User goal.
- Existing architecture and project profile.
- Explorer findings if available.
- Runtime, rendering, data, and lifecycle constraints.
- Non-goals and forbidden changes.
- Desired reduced scope.

#### Outputs

- Final-form architecture.
- Reduced-scope version of the same structure.
- Responsibility boundaries.
- Data flow.
- Ownership and lifecycle rules.
- Validation points.
- Debug and traceability requirements.
- Architecture risks and required approvals.

#### Responsibilities

- Separate decision, execution, and data.
- Keep gameplay state, animation playback, rendering, and builders distinct.
- Preserve WinAPI/custom renderer constraints unless a rendering-policy change is
  explicitly approved.
- Define invalid-data behavior when data is involved.
- Identify where implementation must stop for approval.
- Keep the design practical for a solo game prototype.

#### Forbidden Behaviors

- Propose throwaway architecture that requires future rewrite.
- Hide responsibilities in large actor, scene, or manager classes.
- Turn the animator into the gameplay state machine without approval.
- Change JSON schema without explicit approval.
- Ignore initialization, update, render, cleanup, or scene transition order.
- Produce vague architecture without handoff-ready boundaries.

#### Required Handoff Format

```md
Role: Technical Architect
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
```

#### Human Decision Gates

Human approval is required before:

- Implementing the architecture.
- Changing runtime behavior.
- Changing data schema or save/load behavior.
- Changing rendering policy.
- Accepting a reduced scope with known architecture risk.

#### Example Usage in AIWorkflow

For a data-driven enemy attack system, Technical Architect defines final-form
data ownership, loader behavior, FSM decision boundaries, animator playback
boundaries, and reduced-scope implementation before Gameplay Implementer receives
any file-editing task.

---

### 4.4 Gameplay Implementer

#### Purpose

The Gameplay Implementer applies approved source, data, or project changes
inside a bounded scope.

This role exists only after architecture, scope, files, non-goals, validation
plan, and human approval are clear.

#### When to Activate

Activate the Gameplay Implementer when:

- The Human Director has approved implementation.
- Allowed files and forbidden files are explicit.
- Required data/schema behavior is approved.
- Validation criteria are defined.
- The task requires source, data, resource, or project-file edits.

#### Inputs

- Approved task scope.
- Approved architecture and reduced scope if applicable.
- Allowed file list or path scope.
- Forbidden file list.
- Implementation plan.
- Validation plan.
- Current repository context.

#### Outputs

- Bounded implementation diff.
- Changed file list.
- Implementation notes.
- Known risks.
- Validation commands run.
- Remaining validation needed.

#### Responsibilities

- Modify only approved files.
- Preserve existing naming, style, and architecture.
- Keep diffs reviewable.
- Avoid unrelated refactoring.
- Preserve debugability and traceability.
- Report when scope must change instead of silently changing it.
- Run approved validation commands when available.

#### Forbidden Behaviors

- Start implementation without approval.
- Modify unrelated files.
- Touch game source files outside the approved scope.
- Change JSON schema, save/load behavior, scene lifecycle, actor lifecycle, or
  rendering policy without explicit approval.
- Combine feature work with broad refactoring.
- Commit, push, release, or stage broad changes automatically.

#### Required Handoff Format

```md
Role: Gameplay Implementer
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
```

#### Human Decision Gates

Human approval is required before:

- Implementation begins.
- Scope changes.
- Additional files are modified.
- Schema, lifecycle, runtime, rendering, build, save/load, or tool behavior
  changes.
- Unperformed validation is accepted.

#### Example Usage in AIWorkflow

After approval, Gameplay Implementer adds a bounded component or data loader
change, runs build-related validation when possible, then hands the diff to
Reviewer and Validator.

---

### 4.5 Reviewer

#### Purpose

The Reviewer evaluates proposed or completed changes and reports risks,
regressions, and required fixes.

The Reviewer does not silently fix issues. It reports findings and recommends
next actions.

#### When to Activate

Activate the Reviewer when:

- Source code changed.
- AI generated or modified files.
- Runtime, data, save/load, scene, actor, architecture, or workflow behavior
  changed.
- A diff must be checked for scope compliance.
- Human acceptance depends on risk assessment.

#### Inputs

- Diff or proposed design.
- Approved scope.
- Architecture notes.
- Explorer findings if available.
- Build/test/runtime evidence.
- User-provided logs or observations.

#### Outputs

- Findings classified as Critical, Major, Minor, or Optional.
- Scope compliance result.
- Architecture and lifecycle risk notes.
- Validation implications.
- Recommendation.
- Verdict when appropriate.

#### Responsibilities

- Lead with concrete findings.
- Check scope compliance and unrelated changes.
- Check responsibility boundaries.
- Check lifecycle, ownership, update order, data consistency, and regression
  risk when relevant.
- Distinguish required fixes from optional improvements.
- Identify missing validation.

#### Forbidden Behaviors

- Silently modify files while acting as Reviewer.
- Rubber-stamp AI output.
- Approve without evidence.
- Treat build success as full validation.
- Hide Critical or Major risks.
- Mix optional improvements into required fixes.
- Ignore newly created files missing from the diff.

#### Required Handoff Format

```md
Role: Reviewer
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
Verdict:
```

#### Human Decision Gates

Human approval is required to:

- Accept unresolved Major risks.
- Defer required fixes.
- Proceed when validation evidence is incomplete.
- Complete a task with known residual risk.

#### Example Usage in AIWorkflow

After a Copilot or Codex implementation, Reviewer checks whether the diff stayed
inside approved files, whether scene lifecycle is safe, whether data behavior is
defined, and whether validation evidence is sufficient.

---

### 4.6 Validator

#### Purpose

The Validator defines and evaluates evidence that a change works.

The Validator distinguishes build, data, runtime, manual, and semantic
validation. It does not assume correctness from implementation alone.

#### When to Activate

Activate the Validator when:

- Source code changed.
- Runtime behavior changed.
- Data files, JSON schema, loaders, or resource paths changed.
- UI, scene, actor, save/load, or workflow tool behavior changed.
- Review findings require evidence.
- Completion requires proof beyond document inspection.

#### Inputs

- Approved scope.
- Changed files.
- Known risks.
- Review findings.
- Build, data, runtime, manual, or semantic test results.
- Logs or user observations.

#### Outputs

- Validation plan or validation result.
- Evidence grouped by category.
- Pass/fail criteria.
- Remaining unverified areas.
- Failure symptoms.
- Verdict.

#### Responsibilities

- Separate validation categories:
  - Build validation.
  - Data validation.
  - Runtime validation.
  - Manual validation.
  - Semantic validation.
- State which validation was run and which was not.
- Avoid claiming manual or runtime validation without evidence.
- Tie validation to task risk.
- Record failures and blocked checks.

#### Forbidden Behaviors

- Treat compilation as sufficient validation for runtime behavior.
- Invent validation results.
- Hide failed or skipped checks.
- Use vague pass criteria.
- Ignore manual gameplay checks when behavior changed.
- Mark a task complete when required evidence is missing unless the Human
  Director explicitly accepts the risk.

#### Required Handoff Format

```md
Role: Validator
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
Verdict:
```

#### Human Decision Gates

Human approval is required to accept:

- Failed validation.
- Skipped required validation.
- Runtime behavior without manual evidence.
- Data behavior without data-loading evidence.
- Completion with remaining unverified areas.

#### Example Usage in AIWorkflow

For a JSON-driven gameplay change, Validator requires build validation, JSON
loading checks, invalid-data behavior checks, a targeted runtime smoke test, and
manual gameplay steps with expected results.

---

### 4.7 Documentation Keeper

#### Purpose

The Documentation Keeper records decisions, evidence, review summaries,
validation summaries, and remaining risks in durable project documents.

This role prevents important workflow knowledge from existing only in chat.

#### When to Activate

Activate the Documentation Keeper when:

- A meaningful workflow, architecture, implementation, review, or validation
  task completes.
- A Dev Log is required.
- Workflow rules or prompt contracts change.
- A decision must remain traceable.
- Validation evidence or remaining risk must be recorded.

#### Inputs

- Task summary.
- Approved scope.
- Files changed.
- Architecture notes.
- Implementation notes.
- Review findings.
- Validation evidence.
- Remaining risks.
- Next tasks.

#### Outputs

- Dev Log.
- Workflow document update.
- Architecture note.
- Review/validation summary.
- Next-task list.
- Commit summary draft when appropriate.

#### Responsibilities

- Record what changed and why.
- Record what validation was actually performed.
- State unperformed validation explicitly.
- Preserve links between task ids, files, decisions, and evidence.
- Keep repository-level process docs under approved documentation paths.
- Avoid moving project process records into source folders.

#### Forbidden Behaviors

- Invent validation results.
- Claim completion when approval, review, or validation is missing.
- Hide unresolved risks.
- Store durable workflow rules only in chat.
- Modify source files while acting only as Documentation Keeper.
- Create redundant documentation folder structures.

#### Required Handoff Format

```md
Role: Documentation Keeper
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
```

#### Human Decision Gates

Human approval is required before:

- Workflow rule changes.
- Documentation that changes operating policy.
- Marking a task complete when required validation was skipped.
- Commit decisions.

#### Example Usage in AIWorkflow

After WF-032, Documentation Keeper creates a WorkLog recording the new role
registry, README link, validation commands, skipped runtime validation, and
commit recommendation.

---

### 4.8 Tool/Workflow Engineer

#### Purpose

The Tool/Workflow Engineer modifies workflow tools, command behavior, prompt
generation, scripts, and automation boundaries only within approved scope.

This role keeps workflow tooling useful without allowing automation to bypass
human control.

#### When to Activate

Activate the Tool/Workflow Engineer when:

- Discord command behavior changes.
- Codex goal prompt generation changes.
- Workflow scripts or validation scripts change.
- Tool routing rules change.
- Automation boundaries or allowlists change.
- A role router prototype is requested.

#### Inputs

- Approved workflow/tool scope.
- Current tool behavior.
- Safety rules.
- Command contracts.
- Validation requirements.
- Forbidden runtime/deploy paths.

#### Outputs

- Bounded tool/workflow diff.
- Updated command or prompt contract notes.
- Validation evidence.
- Safety impact notes.
- Rollback or recovery notes if needed.

#### Responsibilities

- Modify only approved workflow/tool files.
- Preserve human approval gates.
- Keep command behavior explicit and auditable.
- Avoid secret exposure.
- Keep validation commands and failure modes visible.
- Document tool behavior changes.

#### Forbidden Behaviors

- Modify workflow tools without approval.
- Change Discord runtime command behavior outside approved scope.
- Install external tools without approval.
- Add automatic source modification, automatic approval, automatic commit,
  automatic push, or automatic release.
- Hide command side effects.
- Expand automation before the document-based workflow is stable.

#### Required Handoff Format

```md
Role: Tool/Workflow Engineer
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
```

#### Human Decision Gates

Human approval is required before:

- Tool behavior changes.
- Command behavior changes.
- Script execution behavior changes.
- External dependency installation.
- Any automation that writes files, commits, pushes, releases, or executes
  agents.

#### Example Usage in AIWorkflow

For a future Role Router prototype, Tool/Workflow Engineer implements a bounded
read-only router that maps task type to suggested roles, then Validator checks
sample tasks and Documentation Keeper records the result.

---

## 5. Optional Future Roles

### Game Design Advisor

Purpose:
Advise on mechanics, pacing, progression, feel, economy, readability, and player
experience.

Activation:
Use when the task needs design judgment rather than architecture or code
implementation.

Current status:
Optional future role. It may advise but must not override the Human Director or
force implementation scope.

### Unity Specialist

Purpose:
Advise on Unity migration, Unity project structure, MonoBehaviour or ECS
tradeoffs, asset pipeline, editor tooling, and Unity-specific validation.

Activation:
Use for future Unity tasks or migration planning.

Current status:
Optional future role. It must not overfit current WinAPI C++ tasks to Unity or
force premature migration.

### Release Coordinator

Purpose:
Coordinate release readiness, changelog, packaging, versioning, validation
evidence, rollback notes, and commit/tag/release recommendations.

Activation:
Use when a future task approaches packaging, deployment, public release, or
stable milestone delivery.

Current status:
Optional future role. It must not automatically commit, tag, push, deploy, or
release.

---

## 6. Role Handoff Format

All role handoffs should use this common format:

```md
## Role Handoff

Role:
Task id:
Input context:
Findings:
Risks:
Decisions needed:
Recommended next action:
Validation evidence if applicable:
Verdict if applicable:
```

Field meanings:

- Role: The role producing the handoff.
- Task id: Workflow or backlog id such as WF-032.
- Input context: The request, files, diff, logs, or evidence used.
- Findings: Evidence-based observations.
- Risks: Known or suspected risks, including missing evidence.
- Decisions needed: Human decisions or upstream role decisions.
- Recommended next action: The next safe step.
- Validation evidence if applicable: Build, data, runtime, manual, semantic, or
  documentation evidence.
- Verdict if applicable: Review or validation verdict from the small verdict set.

---

## 7. Verdict Format

Use the following verdicts for review and validation outcomes:

| Verdict | Meaning | Use when |
|---|---|---|
| PASS | No blocking issues found and required evidence is present | Review or validation supports completion within scope |
| PASS_WITH_NOTES | Acceptable with minor notes or explicitly documented residual risk | Non-blocking issues exist but do not require immediate action |
| CONCERNS | Meaningful risk exists and a human decision or follow-up is needed | Major issue, incomplete evidence, or unclear scope remains |
| BLOCKED | Work cannot proceed because required context, approval, files, tools, or evidence is missing | The next safe action is to stop and resolve the blocker |
| FAIL | Required review or validation criteria failed | Critical issue, failed build, failed data check, failed runtime check, or invalid output |

Rules:

- `PASS` must not be used when required validation was skipped.
- `PASS_WITH_NOTES` must state the notes.
- `CONCERNS` must identify the decision needed.
- `BLOCKED` must identify the blocker and the required action.
- `FAIL` must identify the failed criterion and recommended recovery path.

---

## 8. Routing Rules v1

### Documentation Task

Activate:

- Orchestrator.
- Documentation Keeper.
- Reviewer if workflow rules change or multiple files are touched.
- Validator for markdown link checks, diff checks, and scope checks.

Typical validation:

- `git status --short`
- `git diff --check`
- `git diff --stat`
- Link/index verification if README or index files changed.

### Gameplay Implementation Task

Activate:

- Orchestrator.
- Explorer when file-level context is missing.
- Technical Architect for new systems, data/lifecycle changes, or architecture
  risk.
- Gameplay Implementer only after approval.
- Reviewer.
- Validator.
- Documentation Keeper for meaningful work.

Typical validation:

- Build validation.
- Runtime smoke test.
- Manual gameplay test.
- Data validation if JSON/data changed.
- Regression checks for affected systems.

### Data Validation Task

Activate:

- Orchestrator.
- Explorer if schema, loader, or data ownership is unclear.
- Technical Architect if schema or data responsibility changes.
- Validator.
- Reviewer if data files or loaders changed.
- Documentation Keeper when evidence or rules must be recorded.

Typical validation:

- JSON/data smoke checks.
- Missing required field behavior.
- Optional field defaults.
- Invalid ID or enum behavior.
- Debug/release failure behavior if applicable.

### Architecture Task

Activate:

- Orchestrator.
- Explorer when existing structure must be inspected.
- Technical Architect.
- Reviewer for architecture risk review.
- Documentation Keeper for durable decisions.

Typical validation:

- Semantic validation against architecture principles.
- Scope and non-goal review.
- Handoff readiness check.

### Workflow Tool Task

Activate:

- Orchestrator.
- Tool/Workflow Engineer.
- Explorer when current command/tool behavior must be inspected.
- Reviewer.
- Validator.
- Documentation Keeper.

Typical validation:

- Tool-specific command validation.
- Safety rule review.
- `git status --short`
- `git diff --check`
- `git diff --stat`
- Manual command/UI confirmation if required.

### Release Task

Activate:

- Orchestrator.
- Reviewer.
- Validator.
- Documentation Keeper.
- Release Coordinator only if the optional future role has been approved for the
  workflow.

Typical validation:

- Build validation.
- Runtime smoke test.
- Release checklist.
- Changelog/release note review.
- Commit/tag/push/release decisions by Human Director only.

### Unity Future Task

Activate:

- Orchestrator.
- Technical Architect.
- Explorer if existing project or migration context must be inspected.
- Unity Specialist only if the optional future role has been approved for the
  workflow.
- Reviewer.
- Validator.
- Documentation Keeper.

Typical validation:

- Unity-specific project validation when a Unity project exists.
- Migration compatibility review.
- Current C++ prototype boundary review.

---

## 9. Non-goals

Agent Role Registry v1 does not introduce:

- Executable multi-agent framework behavior.
- External tool installation.
- Automatic source modification.
- Automatic approval.
- Automatic commit, push, or release.
- Discord runtime command behavior changes.
- New game source architecture.
- New JSON schema behavior.
- New release or deployment scripts.

---

## 10. Next Tasks

Recommended follow-up tasks:

1. Role Router Rules for ActiveTask.
2. Review/Validation Verdict Format v1.
3. Path-Scoped Rule Mapping for Dust Land.
4. Small Role Router Prototype.

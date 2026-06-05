# Personal AI Game Development Operating Rules

## Status

This document defines practical operating rules for the personal AI game development operating system.

It converts the North Star and Studio Director Workflow Principles into daily execution rules.

Changing these rules requires explicit Human Director approval.

## Source Documents

Read these first when interpreting this document:

1. `_Docs/Studio/Foundation/Personal_AI_Game_Development_Operating_System_North_Star.md`
2. `_Docs/Studio/Foundation/Studio_Director_Workflow_Principles.md`
3. `AGENTS.md`

## Operating Intent

The system exists so that the Human Director can direct game/IP development through goals, taste, priorities, approvals, rejections, revisions, and final judgment.

AI staff and tools should absorb operational burden:

- context gathering
- proposal generation
- implementation planning
- bounded execution
- verification evidence collection
- result summarization
- record keeping

The Human Director should not become the operator of internal queues, session IDs, raw logs, WorkOrders, command IDs, or tool-specific machinery.

## First-Class User Workflow

Every normal task should move through this workflow:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

These are Director-facing stages, not internal implementation classes.

## Stage 1: Conversation

Purpose:

- Understand the Human Director's intention, problem, creative direction, or production goal.
- Surface options, tradeoffs, risks, and missing context.

Rules:

- Accept natural language as the primary input.
- Do not force the Human Director to provide tool-specific commands or internal IDs.
- If repository or project context is needed, AI staff should inspect available documents and files before asking the Human Director to repeat information.
- If the request is ambiguous but has an obvious safe default, proceed with the safe default and state assumptions.
- If ambiguity changes scope, architecture, schema, runtime behavior, or approval boundaries, ask for clarification.

Outputs:

- clarified goal
- relevant context
- major options or recommendation
- explicit risks or unknowns

## Stage 2: Decision

Purpose:

- Convert conversation into a Human Director decision.

The Human Director may decide to:

- approve
- reject
- revise
- defer
- request more analysis
- request implementation planning
- request execution

Rules:

- AI staff may recommend, object, or propose alternatives.
- AI staff must not treat their own recommendation as approval.
- External worker output is evidence or proposal, not a final decision.
- Important approvals and rejections should be recorded when they affect future direction.

Outputs:

- approved or rejected direction
- decision rationale when important
- explicit non-goals
- whether the decision should become durable memory or project knowledge

## Stage 3: Execution Request

Purpose:

- Convert an approved decision into a bounded work contract for an execution worker.

An execution request should define:

- goal
- approved scope
- non-goals
- allowed files, systems, or behavior when known
- constraints from `AGENTS.md`
- required context documents
- validation plan
- expected return format
- renewed approval triggers

Rules:

- Use reduced-scope final-form architecture, not throwaway temporary structure.
- Preserve separation of decision, execution, and data.
- Keep source edits inside approved scope.
- Do not introduce schema, save/load, build setting, runtime lifecycle, dependency, commit, push, release, deployment, or workflow-rule changes unless approved.
- For code tasks, the execution request should be detailed enough that the worker does not have to invent scope.

Outputs:

- work packet, handoff packet, implementation prompt, or equivalent execution contract
- validation checklist
- review criteria

## Stage 4: Execution

Purpose:

- Let the appropriate worker perform the approved work.

Default routing:

- Hermes: orchestration, memory, research, context gathering, review, records, tool routing, small precise edits when appropriate.
- Codex CLI / `codex exec`: default automatable implementation worker for bounded code changes.
- Codex App: manual high-context workroom when the Human Director wants direct intervention.
- Git/build/test/diff: evidence and validation collection.
- LLM Wiki / Obsidian-compatible documents: durable Director Brain.
- Khoj: future optional search/RAG layer when document volume justifies it.
- OpenClaw: future ambient assistant / channel-and-presence layer for intake, notifications, mobile/chat/voice surfaces, and AI staff presence.
- Studio: Director-facing surface that hides internal machinery by default.

Execution rules:

- Execute only within approved scope.
- Do not ask for per-file source-edit permission once the execution scope is approved.
- Stop and request renewed approval when scope must expand.
- Keep diffs reviewable.
- Avoid unrelated refactoring.
- Preserve project architecture constraints.
- Do not commit, push, release, or deploy unless explicitly approved.
- Do not treat build success alone as full validation.

Outputs:

- changed files
- behavior/model summary
- validation commands run
- validation results
- known risks
- human decisions needed

## Stage 5: Result Review

Purpose:

- Present the result in Director-facing form so the Human Director can decide complete, revise, defer, or reject.

A result review must include:

1. Implementation summary
2. Files changed
3. Behavior or model summary
4. Validation commands run
5. Validation results
6. Known risks
7. Human decisions needed
8. Commit recommendation

Rules:

- Do not hide failed validation.
- Do not invent validation evidence.
- State clearly when validation was not run.
- Separate required fixes from optional improvements.
- Critical issues must be fixed before completion.
- Major issues must be fixed or explicitly accepted by the Human Director.
- Optional improvements must not be mixed into required fixes without approval.

Human Director decisions after result review:

- complete
- request revision
- defer remaining risks
- reject/rollback
- approve commit
- request more validation

## Stage 6: Record Keeping

Purpose:

- Preserve important decisions, knowledge, rejected ideas, implementation records, and lessons outside transient chat history.

Record targets:

- DevLog / WorkLog: meaningful work, investigations, implementation notes, validation summary, remaining risks.
- LLM Wiki / Obsidian-compatible documents: durable project knowledge, canon, concepts, tool roles, decisions, rejected ideas, lessons.
- Hermes memory: compact durable user preferences, stable workflow conventions, and reusable environment facts.
- Hermes skills: repeatable workflows discovered through complex or iterative work.

Rules:

- Do not store stale task progress in long-term memory.
- Do not store commit SHAs, temporary file counts, PR numbers, or short-lived task status in memory.
- Use DevLog for meaningful work.
- Use project documents for source-of-truth direction.
- Use memory only for compact facts that reduce future user steering.
- Use skills for repeatable procedures.

## Scope-Based Approval Rule

Approval is scope-based, not file-edit-based.

If the Human Director approves a goal, handoff packet, work packet, or implementation scope, AI workers may perform normal source changes required to complete that approved scope.

Do not ask again merely because source files need edits inside the approved boundary.

Renewed approval is required when:

- the work expands beyond the approved goal, files, systems, or behavior
- structural refactoring is needed outside the approved scope
- JSON schema, save/load, migration, build settings, or broad runtime lifecycle policy changes are needed
- external tools or services are introduced as project dependencies
- commit, push, release, or deployment is requested
- workflow rules or source-of-truth documents are changed beyond the approved task
- the approved scope is ambiguous enough that proceeding would require guessing

## Tool Routing Rules

### Hermes

Use Hermes for:

- Director conversation
- memory and session recall
- research and web/browser work
- context gathering
- orchestration
- review
- DevLog and documentation support
- small precise file edits when scope is approved
- scheduling or reminders when needed

Do not present Hermes as a complete replacement for Codex implementation strength.

### Codex CLI / `codex exec`

Use Codex CLI as the default automatable implementation worker when:

- there is an approved bounded execution request
- repository-aware code changes are needed
- the expected output can be reviewed through diff, build, test, and DevLog evidence

Codex CLI output must still be reviewed and validated.

### Codex App

Use Codex App when:

- the Human Director wants direct manual intervention
- the task needs a high-context coding workroom
- automation is not the right interface

Codex App is manual escalation, not the default automated worker.

### Git / Build / Test / Diff

Use these as evidence systems.

Rules:

- Always inspect diff before claiming source changes are complete.
- Run relevant build/test/validation where possible.
- State validation gaps explicitly.
- Do not commit automatically.

### LLM Wiki / Obsidian-Compatible Documents

Use as the Director Brain for:

- project concepts
- canon
- decisions
- rejected ideas
- lessons
- tool roles
- durable architecture direction

### Khoj

Treat Khoj as future optional search/RAG infrastructure.

Do not make Khoj a core dependency until document volume and retrieval needs justify it.

### OpenClaw

Treat OpenClaw as a future ambient assistant / channel-and-presence layer.

Use cases:

- mobile/chat/voice entrypoint
- inbound idea and request intake
- notifications
- cross-device assistant presence
- possible front door for AI staff interaction

Rules:

- OpenClaw must route into the same Director workflow and approval model.
- OpenClaw must not become a separate governance authority.
- OpenClaw must not replace Hermes orchestration, Codex implementation, Studio governance, or the Director Brain unless proven by real use and explicitly approved.

## Studio UX Boundary Rules

Studio should expose only Director-facing workflow:

- Conversation
- Decision
- Execution Request
- Result Review
- Record Keeping

Studio should not expose by default:

- raw terminal operation
- raw JSON
- internal IDs
- WorkOrder manual wiring
- handoff queue manipulation
- runner/session control
- raw logs
- debug/smoke buttons
- generic agent dashboard views
- operator dashboard workflows

Internal/debug views may exist only for maintenance and should not define the normal product experience.

## Daily Operating Loop

A normal work cycle should look like this:

1. The Human Director states an intention or problem.
2. Hermes or Studio clarifies the goal and gathers context.
3. AI staff propose options, risks, and a recommended direction.
4. The Human Director approves, rejects, revises, or defers.
5. Approved work becomes an execution request.
6. Codex CLI or another approved worker executes within scope.
7. Hermes or Studio reviews diff, validation evidence, risks, and result quality.
8. The Human Director decides complete, revise, defer, or reject.
9. Meaningful results are recorded in DevLog and durable knowledge documents.
10. The Human Director decides whether to commit.

## Completion Rule

A task is complete only when:

- required approvals were obtained
- implementation stayed within approved scope
- review was performed when required
- validation was performed or explicitly deferred
- remaining risks are documented
- DevLog exists when required
- the Human Director decides whether to commit

AI-generated output alone does not complete a task.

## Non-Negotiable Safety Rules

- Human Director remains final authority.
- Do not bypass approval gates.
- Do not invent validation results.
- Do not commit, push, release, or deploy without explicit approval.
- Do not expose secrets, tokens, credentials, or local configuration.
- Do not turn the Director UX into raw machinery management.
- Do not replace durable project documents with chat memory.
- Do not preserve duplicated custom runtime machinery merely because it already exists; preserve governance and delegate runtime where appropriate.

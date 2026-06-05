# Studio Director Workflow Principles

## Status

This document fixes the product direction for AIWorkflow Studio.

Changing these principles requires explicit Human Director approval.

## Core Definition

The user's desired service is broader than Studio: a personal AI game development operating system where the user is the Human Director and AI staff handle proposal, execution, verification, and records.

AIWorkflow Studio is the first Director-facing console for that broader system.

The user is the Human Director / Executive Producer / Creative Director / IP Director.

Studio must help the user direct work, not force the user to operate internal machinery.

## Five User-Facing Functions

Only these five functions should be first-class Studio features:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

Every visible Studio screen, card, and button must justify itself under one of these functions.

If it does not, it belongs in an internal/debug area, an external tool, or should be removed.

## Required Product Flow

The preferred Studio flow is:

1. The Human Director says what they want in natural language.
2. AI staff provide advice, options, risks, and recommendations.
3. The Human Director approves, rejects, asks for changes, or defers.
4. Approved direction becomes an execution request.
5. An execution worker performs the work within the approved scope.
6. Studio summarizes the result for completion, change request, or deferral.
7. Important decisions and knowledge are recorded.

The Human Director should not need to manage raw task IDs, session IDs, runner IDs, WorkOrder internals, handoff queues, raw logs, or JSON records during the normal flow.

## Approval Model

Approval is scope-based, not file-edit-based.

When the Human Director approves a goal, handoff packet, work packet, or implementation scope, AI workers may perform normal source changes required to complete that approved scope.

AI workers must not repeatedly ask for permission merely because source files need to be changed inside an already-approved scope.

Renewed approval is required when:

- the work expands beyond the approved goal, files, systems, or behavior
- structural refactoring is needed outside the approved scope
- JSON schema, save/load, migration, build settings, or broad runtime lifecycle policy changes are needed
- external tools or services are introduced as project dependencies
- commit, push, release, or deployment is requested
- the approved scope is ambiguous enough that proceeding would require guessing

Example: if the Human Director approves "implement messenger", AI workers should implement the messenger without asking again whether source edits are allowed. If implementation requires replacing the whole UI architecture, changing save data schema, or adding unrelated notification systems, AI workers must stop and request renewed approval.

## Tool Positioning

### Fixed Core

- Studio: Human Director console.
- Codex CLI / `codex exec`: default automatable implementation worker.
- Git/build/test/diff collection: result verification and release boundary.
- Record store / Obsidian-compatible documents: durable decisions and project knowledge.

### Manual Escalation

- Codex App: manual high-context workroom for direct human intervention.

Codex App is not the default automatable execution worker.

Studio may prepare a handoff to Codex App, but normal execution should use automatable interfaces such as Codex CLI, `codex exec`, app-server, or an approved worker adapter.

### Current Operating Support

- Hermes: current practical operating hub for Director conversation, memory, research/web/browser support, orchestration, and review assistance.

Hermes is currently useful for operating the workflow, but Studio should not hard-code Hermes as the only possible runtime surface. Studio should preserve Director-facing boundaries even when Hermes, gateway, CLI, or other adapters are used underneath.

### Future Ambient / Channel Layer Candidate

- OpenClaw: candidate ambient assistant and channel-presence layer for cross-device conversation, inbound intake, notifications, voice/mobile/chat surfaces, and possible AI staff presence.

OpenClaw belongs in the broader personal AI game development operating system as a future interface/presence layer, not as the current governance authority, default implementation worker, or Director Brain. If introduced, it should route into the same Director workflow and approval model rather than creating a separate command-driven operating path.

### Evaluation Candidates

The following tools are candidates, not core dependencies:

- Warp
- LangGraph
- Dify
- RAGFlow
- CrewAI
- AutoGen
- Cursor
- Windsurf

Do not place candidate tools at the center of the Studio workflow until their role is proven by actual use.

## What Must Stay Hidden By Default

These must not be normal user-facing Studio concerns:

- raw JSON
- internal registry management
- runner/session IDs
- WorkOrder manual wiring
- handoff queue operation
- Discord-specific command flow
- low-level smoke/debug buttons
- raw logs
- implementation adapter internals
- generated timestamp churn

They may exist in internal or debug views only when they are needed for maintenance.

## UI Decision Rule

Before adding a visible Studio feature, answer:

1. What Human Director decision does this help?
2. What concrete outcome can the user approve, reject, revise, or defer?
3. Can this be summarized without exposing internal IDs or raw data?
4. Does this belong in Studio, or should Codex CLI, Codex App, Hermes, Obsidian, Git, or another tool handle it?

If these questions cannot be answered clearly, do not expose the feature in the main Studio UI.

## Non-Goals

Studio should not become:

- a complete IDE
- a raw terminal operations UI where the Human Director manually operates commands as the core experience
- a Discord command replacement
- a raw execution dashboard
- a JSON browser
- a generic multi-agent dashboard centered on agent/session/queue management
- a place where the Human Director manually performs staff operations

Studio may communicate with Hermes, CLI workers, gateways, or other terminal-like tools internally. The restriction is that raw terminal operation and internal machinery management must not become the default Human Director experience.

## Operating Rule For AI Assistants

When working on Studio, preserve this direction even if a local implementation detail suggests a convenient shortcut.

Do not expand Studio by adding more visible management screens unless the screen clearly supports Conversation, Decision, Execution Request, Result Review, or Record Keeping.

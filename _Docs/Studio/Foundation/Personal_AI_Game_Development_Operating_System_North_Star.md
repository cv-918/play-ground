# Personal AI Game Development Operating System North Star

## Status

This document captures the broader product direction behind Studio.

Studio is an important product surface, but the user's desired service is not limited to Studio itself.

Changing this direction requires explicit Human Director approval.

## One-Line Vision

A personal AI game development operating system for a solo game developer and IP General Director.

## Core Definition

The desired system is a personal development operating system where:

- the user acts as the Human Director / Executive Producer / Creative Director / IP General Director
- AI staff handle proposal, execution, verification, and records
- external tools act as workers, evidence collectors, knowledge stores, or specialist workrooms
- important decisions and knowledge become durable project memory instead of staying trapped in chat history

The system is not just a single Studio app.

Studio is the first Director-facing product surface for this broader operating system.

## User Role

The user should direct:

- goals
- taste
- priorities
- approvals
- rejections
- revisions
- final completion judgments
- what becomes durable memory, canon, or project knowledge

The user should not become:

- a prompt operator
- a context courier between AI tools
- an internal workflow operator
- a manual log hunter
- a raw task/session/workorder manager

## Current Product Surface: Studio

Studio currently exists to make the supervisor workflow usable.

Its first-class user-facing functions are:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

These five functions are the current Studio surface. They do not limit the broader operating system.

## Future System Capabilities

Because the user is a solo game developer, the broader system may eventually need support for:

- planning
- code implementation
- asset generation
- level design / leveling
- testing
- build and release preparation
- research
- worldbuilding and IP management
- playtest feedback analysis
- long-term project knowledge retrieval
- ambient assistant / channel presence across devices and messaging surfaces

These capabilities should still be exposed through Director-facing workflows instead of raw internal operations.

## Core Workflow

1. The Human Director describes an intention, problem, goal, or creative direction in natural language.
2. AI staff provide advice, options, risks, objections, and recommendations.
3. The Human Director approves, rejects, modifies, or defers the direction.
4. Approved scope becomes an execution request.
5. Execution workers implement within the approved scope.
6. Studio summarizes changed files, behavior changes, validation evidence, risks, and remaining decisions.
7. The Human Director decides complete, revise, defer, or reject.
8. Important decisions, knowledge, rejected ideas, and lessons are recorded.

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

Example:

- If the Human Director says "implement messenger" and approves that work scope, AI workers should implement the messenger without asking again whether source edits are allowed.
- If messenger implementation requires replacing the whole UI architecture, changing save data schema, or adding unrelated notification systems, AI workers must stop and request renewed approval.

## Studio Is

- a Director conversation surface
- a decision surface
- an execution request generator
- a result review surface
- a record and knowledge promotion gate
- an AI staff coordination surface

## Studio Is Not

- an IDE
- a raw terminal operations UI
- a user-facing internal workflow dashboard
- a raw JSON / WorkOrder / session management surface
- an automatic commit / push system
- an autonomous game factory that bypasses Human Director judgment

Studio may communicate with Hermes, CLI workers, gateways, or other tools internally. The restriction is not "never use terminal-like capabilities." The restriction is that raw terminal operation must not become the default Human Director experience.

## Hidden Or Internal By Default

The following may exist internally or in developer/debug mode, but should not be the core Director UX:

- raw JSON views
- internal IDs
- runner/session controls
- WorkOrder manual manipulation
- Handoff queue manual manipulation
- raw logs
- smoke/debug buttons
- internal registry/config screens
- Discord-only operation flows

## Generic Agent Dashboard Boundary

Studio should not become a generic agent dashboard where the user manages agent/session/queue state directly.

A generic agent dashboard centers things like:

- agent status tables
- queue lengths
- runner/session IDs
- retry/kill/pause controls
- raw logs
- JSON payloads
- internal configuration screens

Those may be useful for debugging, but they are not the Director-facing product.

## Operator Dashboard Boundary

Studio should not turn the user into an internal system operator.

The user should not normally operate:

- WorkOrder wiring
- Handoff queues
- command IDs
- runner/session selection
- raw evidence logs
- internal registries
- debug/smoke actions

The main UX should ask the user for direction and judgment, not internal machinery management.

## Tool Roles

Hermes:
Director partner, memory manager, research/web/browser assistant, workflow orchestrator, review assistant, and current practical operating hub.

Codex CLI / `codex exec`:
Default automatable implementation worker for approved execution requests.

Codex App:
Manual high-context coding workroom when the Human Director wants direct intervention.

Git / build / test / diff collection:
Evidence and validation collection.

LLM Wiki / Obsidian:
Long-term Director Brain for concepts, decisions, rejected ideas, lessons, tool roles, and project knowledge.

Khoj:
Future optional search/RAG layer when document volume and search needs justify it.

OpenClaw:
Future ambient assistant / channel-and-presence layer for cross-device conversation, inbound intake, notifications, voice/mobile/chat surfaces, and possible AI staff presence. OpenClaw should not replace Studio governance, Hermes orchestration, the Director Brain, or Codex implementation unless proven by real use.

Studio:
Director-facing surface that makes the operating system usable without turning the user into an internal operator.

## Fixed Current Studio Functions

For the current Studio product surface, keep these five functions visible and first-class:

1. Conversation
2. Decision
3. Execution Request
4. Result Review
5. Record Keeping

Other features should either fit inside these functions, remain internal/debug-only, or be handled by external tools.

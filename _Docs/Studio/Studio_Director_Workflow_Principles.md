# Studio Director Workflow Principles

## Status

This document fixes the product direction for AIWorkflow Studio.

Changing these principles requires explicit Human Director approval.

## Core Definition

AIWorkflow Studio is a Human Director console.

It is not a generic workflow dashboard, Discord replacement, runner inspector, handoff console, or internal debug UI.

The user is the Human Director / Executive Producer / IP Director.

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
5. An execution worker performs the work.
6. Studio summarizes the result for completion, change request, or deferral.
7. Important decisions and knowledge are recorded.

The Human Director should not need to manage raw task IDs, session IDs, runner IDs, WorkOrder internals, handoff queues, raw logs, or JSON records during the normal flow.

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

### Evaluation Candidates

The following tools are candidates, not core dependencies:

- Hermes
- OpenClaw
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
- a terminal replacement
- a Discord command replacement
- a raw execution dashboard
- a JSON browser
- a generic multi-agent toy UI
- a place where the Human Director manually performs staff operations

## Operating Rule For AI Assistants

When working on Studio, preserve this direction even if a local implementation detail suggests a convenient shortcut.

Do not expand Studio by adding more visible management screens unless the screen clearly supports Conversation, Decision, Execution Request, Result Review, or Record Keeping.

# AI Role Handoff System Principles

## Fixed Names

Use these names consistently.

```text
System name: AI Role Handoff System
Short name: Handoff System
Repository feature name: Handoff
Integration work name: AIWorkflow Handoff Integration
Korean description: 역할별 AI 업무 인수인계 시스템
```

## Purpose

The AI Role Handoff System is a shared work exchange layer for role-based AI chats and collaborators.

It lets roles such as Planner, Developer, Artist, Reviewer, and QA pass work to each other through durable repository documents.

The system exists so the human developer can primarily discuss planning in the main planning chat while role-specific chats can find prepared work, produce plans, request approval when needed, and return results through a common path.

## Current Product Position

Handoff is no longer the primary user-facing surface for the Studio-centered
workflow.

AIWorkflow Studio is the Human Director control plane. Handoff is the internal
Work Packet and dispatch layer that preserves approved scope, non-goals,
context, validation requirements, evidence requirements, output contracts, and
handoff history for staff agents and execution tools.

The Human Director should normally make decisions through Studio. Raw Handoff
queues, packet manifests, dashboards, and violation reports are internal
inspection and traceability surfaces unless Studio explicitly exposes a
Director-facing action.

The current positioning documents are:

- `_Docs/AIWorkflow/FinalBlueprint/WF_Handoff_Work_Packet_Internalization.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Studio_Handoff_Wiki_External_Agent_Roadmap.md`

## Source Of Truth Relationship

Handoff does not replace AIWorkflow.

Use the systems this way:

```text
Handoff = role-to-role work queue, transfer interface, and visibility layer
AIWorkflow = approval, risk, validation, and completion safety engine
DevLog = completed work history and investigation/fix record
Git = actual repository change history
```

The required relationship is:

```text
Handoff calls into AIWorkflow rules.
Handoff does not copy or override AIWorkflow rules.
```

If a Handoff document conflicts with `_Docs/AIWorkflow/` or `AGENTS.md`, the workflow rules win and the role must stop to report the conflict.

## Operating Model

The intended operating flow is:

1. The human developer and Planner discuss design or product direction.
2. The human developer approves the planning direction.
3. Planner prepares a Handoff item with the needed planning brief, requests, references, and acceptance criteria.
4. Receiving roles inspect `_Docs/Handoff/` for work aimed at their role.
5. A receiving role writes or updates a plan before execution.
6. Low-risk document-only work may proceed when it stays within the approved Handoff scope.
7. High-risk work must stop and wait for explicit human approval.
8. Results, review requests, QA requests, completion notices, and remaining risks are written back to Handoff and DevLog as appropriate.

## Approval Model

Planning approval and execution approval are different.

```text
Planning approval
= The human developer accepts the feature, content, design, or direction.

Execution approval
= The human developer allows a specific role to change specific files, data, runtime behavior, tools, or Git state.
```

A Handoff item being `Ready` means it is ready for the receiving role to inspect.

`Ready` does not mean source code, data, runtime behavior, tool execution, commit, or push is approved.

AIWorkflow approval gates still apply to:

- Source code implementation without an approved execution scope
- Structural refactoring outside the approved scope
- Project source directory file creation outside the approved scope
- JSON schema changes not included in the approved scope
- Save/load behavior changes not included in the approved scope
- Actor or scene lifecycle changes outside the approved scope
- Runtime behavior changes outside the approved design or execution scope
- Build setting changes
- File-modifying tool execution outside the approved scope
- Commit and push
- Workflow rule changes

Approval applies only to the stated scope. If the scope changes, the role must stop and request renewed approval.

## v2 Scope-Based Execution Principle

The intended v2 standard is scope-based approval.

Approval is not triggered by source code modification itself. Approval is triggered when a role lacks an approved execution scope or needs to move outside that scope.

When the human developer approves a Handoff Packet, DeveloperPlan, work order, or equivalent execution scope, the Developer may make normal source code edits and non-schema data edits required to complete that approved work. The Developer should not ask for another approval only because code or non-schema data will be edited inside the approved scope.

The role must stop again when implementation needs files, systems, behavior, schema, lifecycle, build settings, Git actions, or workflow rule changes outside the approved scope.

See `Handoff_V2_Scope_Based_Execution_Principle.md`.

## Substantive Approval Request Rule

Approval requests must describe the actual proposed change.

The user-facing approval wait and decision flow is defined in `Approval_Waiting_Flow.md`.

An approval request must not ask only for a gate label such as:

```text
Approval required because this changes runtime behavior.
```

It must explain what the role wants to introduce into the game, workflow, data, or repository.

Every high-risk approval request should include:

- What will change
- What user-facing, gameplay, workflow, or repository behavior will appear
- Why the change is needed
- Which data or code concepts are affected
- Which files are expected to change
- What will not be changed
- Known risks
- Validation plan
- The exact decision requested from the human developer

If the approval request does not explain the substantive change, the role is not allowed to ask for approval yet. The role must rewrite the approval request first.

## Waiting For Human Approval

High-risk work must wait visibly.

Waiting means:

- If no execution scope is approved yet, do not modify source code, JSON schema, runtime data, project files, build settings, or Git state.
- If an execution scope is already approved, do not move outside that scope.
- Do not mark the Handoff item as done.
- Do not pass the work forward as completed.
- Record the approval request path in the Handoff index or the item itself.
- Make the requested decision clear enough for the human developer to approve, reject, or modify scope.

The human developer should be able to find waiting work by checking `_Docs/Handoff/00_Index.md`.

## Low-Risk Automatic Work Boundary

Until later phases explicitly expand automation, low-risk automatic work is limited to document-only Handoff maintenance, such as:

- Reading Handoff documents
- Summarizing role-relevant work
- Updating status text inside Handoff documents
- Preparing plans
- Preparing approval requests
- Preparing result or review request documents

Low-risk does not include source code changes, data schema changes, runtime behavior changes, build/test execution, commit, push, release, or deployment.

## Phase 1 Scope

This document is Phase 1 of AIWorkflow Handoff Integration.

Phase 1 establishes operating principles only.

Phase 1 does not implement:

- Packet directory structure
- Manifest schema
- Role-specific routine documents
- Read-only scanner automation
- Claim/status automation
- Code or JSON execution automation
- Commit or push automation

Those belong to later phases.

## Required Completion Standard

A Handoff-driven task is not complete until:

- Required approvals were obtained.
- Execution stayed within approved scope.
- Review requirements were handled or explicitly deferred.
- Validation was performed or explicitly deferred.
- Results and remaining risks are recorded.
- DevLog exists when the work is meaningful.
- Git actions are performed only after the human developer requests them.

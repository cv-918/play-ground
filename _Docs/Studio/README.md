# Studio Documents

This folder is the source of truth for AIWorkflow Studio as a product.

It is intentionally separate from `_Docs/AIWorkflow/`.

## Purpose

`_Docs/AIWorkflow/` describes the older workflow harness, runner, approval, evidence, Discord, and task-management systems.

`_Docs/Studio/` describes the Studio product direction:

- Human Director workflow
- Director-facing UX principles
- Studio tool boundaries
- external tool positioning
- what must stay visible or hidden in the Studio UI

## Required Reading

- [Studio_Director_Workflow_Principles.md](Studio_Director_Workflow_Principles.md)

## Boundary

Studio is not a generic operations dashboard.

Studio is the Human Director console for:

- conversation
- decision
- execution request
- result review
- record keeping

Implementation details, runner/session internals, raw JSON, handoff queues, Discord-specific operations, and low-level debug controls should not become the default user-facing Studio experience.

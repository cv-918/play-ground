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

- [Personal_AI_Game_Development_Operating_System_North_Star.md](Personal_AI_Game_Development_Operating_System_North_Star.md)
- [Personal_AI_Game_Development_Operating_Rules.md](Personal_AI_Game_Development_Operating_Rules.md)
- [Studio_Director_Workflow_Principles.md](Studio_Director_Workflow_Principles.md)
- [Studio_Current_System_Diagnostic_2026-06-04.md](Studio_Current_System_Diagnostic_2026-06-04.md)
- [Studio_Director_Surface_Refactor_Plan_2026-06-04.md](Studio_Director_Surface_Refactor_Plan_2026-06-04.md)
- [Studio_Internal_Model_API_Consolidation_Plan_2026-06-04.md](Studio_Internal_Model_API_Consolidation_Plan_2026-06-04.md)
- [Studio_Internal_Model_API_Inventory_2026-06-04.md](Studio_Internal_Model_API_Inventory_2026-06-04.md)
- [Studio_Director_API_Alias_Plan_2026-06-04.md](Studio_Director_API_Alias_Plan_2026-06-04.md)
- [Studio_Director_Surface_Smoke_and_Commit_Preparation_2026-06-04.md](Studio_Director_Surface_Smoke_and_Commit_Preparation_2026-06-04.md)
- [Studio_Director_Read_Only_API_Contract_2026-06-05.md](Studio_Director_Read_Only_API_Contract_2026-06-05.md)
- [Studio_Director_Action_Model_Plan_2026-06-05.md](Studio_Director_Action_Model_Plan_2026-06-05.md)

## Boundary

The user's desired service is broader than Studio: it is a personal AI game development operating system where the user acts as Human Director and AI staff handle proposal, execution, verification, and records.

Studio is the first Director-facing product surface for that broader system.

Studio is the Human Director console for:

- conversation
- decision
- execution request
- result review
- record keeping

Implementation details, runner/session internals, raw JSON, handoff queues, Discord-specific operations, and low-level debug controls should not become the default user-facing Studio experience.

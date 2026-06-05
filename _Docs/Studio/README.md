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

## Folder Structure

```text
_Docs/Studio/
  README.md
  Foundation/        North Star, operating rules, Director workflow principles
  Diagnostics/       system inventory, risk sweeps, current-state reviews
  DirectorSurface/   Director-facing UX and surface review plans
  Contracts/         API/model/action vocabulary contracts
  Roadmap/           Goal C/D/E scope packets and approval roadmap
```

## Required Reading Order

For Studio product, UX, and Human Director workflow work, read in this order:

1. [Foundation/Personal_AI_Game_Development_Operating_System_North_Star.md](Foundation/Personal_AI_Game_Development_Operating_System_North_Star.md)
2. [Foundation/Personal_AI_Game_Development_Operating_Rules.md](Foundation/Personal_AI_Game_Development_Operating_Rules.md)
3. [Foundation/Studio_Director_Workflow_Principles.md](Foundation/Studio_Director_Workflow_Principles.md)
4. [Roadmap/Studio_Roadmap_To_Goal_E_Approval_Matrix_2026-06-05.md](Roadmap/Studio_Roadmap_To_Goal_E_Approval_Matrix_2026-06-05.md)

## Current Roadmap Reading

- [Roadmap/Studio_Goal_C_Execution_Request_Foundation_Scope_2026-06-05.md](Roadmap/Studio_Goal_C_Execution_Request_Foundation_Scope_2026-06-05.md)
- [Roadmap/Studio_Goal_C2_Execution_Request_Read_Only_Surface_Scope_2026-06-05.md](Roadmap/Studio_Goal_C2_Execution_Request_Read_Only_Surface_Scope_2026-06-05.md)
- [Roadmap/Studio_Goal_C3_Readiness_Preflight_Scope_2026-06-05.md](Roadmap/Studio_Goal_C3_Readiness_Preflight_Scope_2026-06-05.md)
- [Roadmap/Studio_Goal_D_Result_Review_Evidence_Linkage_Scope_2026-06-05.md](Roadmap/Studio_Goal_D_Result_Review_Evidence_Linkage_Scope_2026-06-05.md)
- [Roadmap/Studio_Goal_E_Worker_Dispatch_Approval_Packet_2026-06-05.md](Roadmap/Studio_Goal_E_Worker_Dispatch_Approval_Packet_2026-06-05.md)

## Archive/Supporting Reading

### Diagnostics

- [Diagnostics/Studio_Current_System_Diagnostic_2026-06-04.md](Diagnostics/Studio_Current_System_Diagnostic_2026-06-04.md)
- [Diagnostics/Studio_Internal_Model_API_Inventory_2026-06-04.md](Diagnostics/Studio_Internal_Model_API_Inventory_2026-06-04.md)
- [Diagnostics/Studio_B_Current_Review_Risk_Sweep_2026-06-05.md](Diagnostics/Studio_B_Current_Review_Risk_Sweep_2026-06-05.md)

### Director Surface

- [DirectorSurface/Studio_Director_Surface_Refactor_Plan_2026-06-04.md](DirectorSurface/Studio_Director_Surface_Refactor_Plan_2026-06-04.md)
- [DirectorSurface/Studio_Director_Surface_Smoke_and_Commit_Preparation_2026-06-04.md](DirectorSurface/Studio_Director_Surface_Smoke_and_Commit_Preparation_2026-06-04.md)
- [DirectorSurface/Studio_C_Director_UX_Flow_Review_2026-06-05.md](DirectorSurface/Studio_C_Director_UX_Flow_Review_2026-06-05.md)

### Contracts

- [Contracts/Studio_Internal_Model_API_Consolidation_Plan_2026-06-04.md](Contracts/Studio_Internal_Model_API_Consolidation_Plan_2026-06-04.md)
- [Contracts/Studio_Director_API_Alias_Plan_2026-06-04.md](Contracts/Studio_Director_API_Alias_Plan_2026-06-04.md)
- [Contracts/Studio_Director_Read_Only_API_Contract_2026-06-05.md](Contracts/Studio_Director_Read_Only_API_Contract_2026-06-05.md)
- [Contracts/Studio_Director_Action_Model_Plan_2026-06-05.md](Contracts/Studio_Director_Action_Model_Plan_2026-06-05.md)

### Roadmap History

- [Roadmap/Studio_Goal_E_Worker_Execution_Integration_Scope_2026-06-05.md](Roadmap/Studio_Goal_E_Worker_Execution_Integration_Scope_2026-06-05.md)

## Fixed Recommendations Until Superseded

The Human Director's current direction is final-use-scene-first Studio design: Director Conversation, Decisions, Results, Memory, with no transitional operator dashboard, manual command surface, or internal-state exposure as the main UX.

Therefore, approval defaults are fixed as follows unless the Human Director explicitly changes them:

1. C.2 displays Execution Requests on both the Execution Request page and Home summary.
2. C.2 shows invalid record warnings in normal UI summary, with details under internal/debug.
3. C.3 includes both API and UI for mark-ready after C.2 is verified.
4. C.3 shows preflight failure summaries in normal UI, with details under internal/debug.
5. D.1 is read/store/display only; accept/request-changes actions are deferred.
6. D.1 shows normal UI summaries only, with expandable internal evidence details.
7. E.1 is dispatch request record only; no live runner start.
8. E.1 uses `_Docs/AIWorkflow/Studio/WorkerDispatches/` and `worker_dispatch.v1`.
9. E.2 first live smoke uses documentation or validation profile, not source-editing implementation.
10. Studio writes dispatch requests for Hermes/runner pickup first; direct PC Runner calls are deferred.
11. Source-editing workers are not allowed in early Goal E.
12. Commit/push remain outside Studio dispatch and require separate explicit approval.

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

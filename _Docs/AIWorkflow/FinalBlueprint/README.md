# AIWorkflow FinalBlueprint Index

Status: Draft FinalBlueprint authority index
Last updated: 2026-06-11
Authority: Folder index and status map for `_Docs/AIWorkflow/FinalBlueprint/`
Non-goals: no blueprint rewrite, no promotion of future designs to current operating law, no task lifecycle change

## 1. Purpose

This folder contains AIWorkflow blueprint, specification, roadmap, implementation-report, smoke-report, and Korean companion documents from several workflow phases.

Not every file in this folder is equally authoritative for current operation. Some files are current references, some are historical implementation specs, some are reports, and some are long-term product direction or future blueprint material.

Use this index to avoid treating every `Final`, `Official`, `Roadmap`, or `Spec` title as current execution law.

## 2. Relationship to Current Operation

For current AIWorkflow operation, prefer this order:

1. `AGENTS.md`
2. `_Docs/AIWorkflow/Workflow_Document_Authority_Map.md`
3. `_Docs/AIWorkflow/Task_State_Model.md`
4. `_Docs/AIWorkflow/Backlog.md`
5. `_Docs/AIWorkflow/ActiveTask.md`
6. `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md`
7. `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md`
8. `_Docs/AIWorkflow/09_Operational_Playbook.md`
9. FinalBlueprint files explicitly classified below as current reference

For current Studio product direction, prefer `_Docs/Studio/`, not this folder.

## 3. Status Categories

| Category | Meaning |
|---|---|
| Current reference | Useful current reference for operating or understanding the workflow |
| Long-term product direction | Strategic product/company-runtime direction, not day-to-day workflow law by itself |
| Historical spec | Design/spec from a completed workflow phase; useful for context and tool maintenance |
| Implementation report | Record of what was implemented; evidence/history, not policy by itself |
| Validation / smoke report | Evidence from validation runs |
| Roadmap / cleanup plan | Sequencing plan; may be superseded by current Backlog and authority map |
| Korean companion | Human Director companion document; English counterpart remains tool-facing source unless stated otherwise |
| Superseded / reference only | Older planning reference; do not use as current rule without reaffirmation |

## 4. Current Reference Set

Use these as current references, while still respecting the source-of-truth order above.

| File | Role |
|---|---|
| `WF_End_To_End_Workflow_Technical_Spec.md` | Current technical reference for end-to-end workflow concepts and artifact paths |
| `WF_Unified_PC_Runner_Orchestration_Entrypoint.md` | Current reference for the unified PC Runner orchestration entrypoint design |
| `WF_Reviewed_Concern_Finalization_Path.md` | Current reference for reviewed-concern finalization behavior |
| `WF_Controlled_Runner_Implementation_Profile.md` | Current reference for controlled implementation runner behavior |
| `WF_Implementation_Runner_Prompt_And_UTF8_Guard.md` | Current reference for implementation runner prompt boundaries and UTF-8 guard behavior |
| `WF_Intake_Auto_Handoff.md` | Current reference for low-risk intake auto-handoff policy, if that path is enabled |
| `WF_Codex_Model_Routing_And_Ephemeral.md` | Current reference for Codex model/routing and ephemeral-run policy |
| `WF_Hermes_OpenClaw_Integration_Guide.md` | Current reference for Hermes/OpenClaw integration boundaries |
| `WF_Handoff_Work_Packet_Internalization.md` | Current reference for treating Handoff as internal Work Packet / dispatch layer |
| `WF_Studio_Handoff_Wiki_External_Agent_Roadmap.md` | Current reference for Studio, Handoff, Wiki, Hermes, OpenClaw, and external-agent integration direction |

## 5. Long-Term Product Direction

| File | Role |
|---|---|
| `WF_Personal_AI_Development_Studio_Architecture.md` | Official long-term product architecture for Personal AI Development Studio / AI Studio Company Runtime |
| `WF_Studio_Control_Plane_Repositioning_Audit.md` | Studio control-plane repositioning and productivity-based redesign audit |

Note: these are important strategic documents, but current Studio product source-of-truth files live under `_Docs/Studio/`.

## 6. Historical Specs and Runtime Component Designs

These files define or describe components built during earlier workflow phases. Use them for maintenance and context, not as a flat current-rule set.

| File | Component |
|---|---|
| `WF_Final_Blueprint.md` | Earlier final blueprint / overall runtime architecture reference |
| `WF_Governance_Approval_Spec.md` | Governance approval specification |
| `WF_Runtime_Execution_Spec.md` | Runtime execution specification |
| `WF_Verification_State_Audit_Spec.md` | Verification state audit specification |
| `WF_Implementation_Roadmap.md` | Earlier implementation roadmap |
| `WF_User_Action_Guide_To_Final_Completion.md` | Earlier user action guide to final completion |
| `WF_Execution_State_Model.md` | Runtime execution state model |
| `WF_Task_Workspace_Manager.md` | Task workspace manager design |
| `WF_Session_Supervisor.md` | Session supervisor design |
| `WF_Evidence_Collector.md` | Evidence collector design |
| `WF_Codex_CLI_Execution_Adapter.md` | Codex CLI execution adapter design |
| `WF_Local_CLI_Execution_Adapter.md` | Local CLI execution adapter design |
| `WF_Progress_Heartbeat_Collection.md` | Progress and heartbeat collection design |
| `WF_File_Watcher_Diff_Snapshot.md` | File watcher and diff snapshot design |
| `WF_Runtime_Control_Adapter.md` | Runtime control adapter design |
| `WF_Result_Collector.md` | Result collector design |
| `WF_Diff_Analyzer.md` | Diff analyzer design |
| `WF_Build_Test_Runner.md` | Build/test runner design |
| `WF_Verification_Report.md` | Verification report design |
| `WF_Completion_Report_And_Card.md` | Completion report/card design |
| `WF_Approval_History_And_Finalization_Log.md` | Approval history and finalization log design |
| `WF_Auto_Approval_Policy.md` | Deterministic auto-approval policy design |
| `WF_Follow_Up_Task_Generator.md` | Follow-up task generator design |
| `WF_Auto_Workflow_E2E_Smoke.md` | Auto workflow E2E smoke design/reference |

## 7. Roadmaps and Cleanup Plans

| File | Role |
|---|---|
| `WF_Post_309_Workflow_Stabilization_Roadmap.md` | Post-WF-309 stabilization roadmap |
| `WF_Workflow_Audit_And_Pruning_Report.md` | Workflow surface audit and pruning report |
| `WF_Command_Surface_Consolidation_Plan.md` | Command surface consolidation plan |

Use these as planning history and cleanup references. Current task priority still comes from `Backlog.md`, `ActiveTask.md`, and the Human Director's latest instruction.

## 8. Implementation and Validation Reports

| File | Type |
|---|---|
| `WF_End_To_End_Workflow_Smoke_Validation_Report.md` | Validation / smoke report |
| `WF_Unified_PC_Runner_Implementation_Report.md` | Implementation report |
| `WF_Workflow_Cleanup_Application_Report.md` | Implementation / cleanup report |
| `WF_Controlled_Runner_Smoke_Report.md` | Validation / smoke report |

These are evidence records. Do not treat their recommendations as current task priority unless promoted into Backlog/ProjectStatus or reaffirmed by the Human Director.

## 9. Korean Companion Documents

Korean companion documents help the Human Director review decisions and workflow meaning. They should not silently override English tool-facing source documents.

| File |
|---|
| `WF_Codex_Model_Routing_And_Ephemeral_KR.md` |
| `WF_Command_Surface_Consolidation_Plan_KR.md` |
| `WF_Controlled_Runner_Implementation_Profile_KR.md` |
| `WF_Controlled_Runner_Smoke_Report_KR.md` |
| `WF_End_To_End_Workflow_Smoke_Validation_Report_KR.md` |
| `WF_End_To_End_Workflow_Technical_Spec_KR.md` |
| `WF_Handoff_Work_Packet_Internalization_KR.md` |
| `WF_Hermes_OpenClaw_Integration_Guide_KR.md` |
| `WF_Human_Director_Operation_Guide_KR.md` |
| `WF_Implementation_Runner_Prompt_And_UTF8_Guard_KR.md` |
| `WF_Intake_Auto_Handoff_KR.md` |
| `WF_Personal_AI_Development_Studio_Architecture_KR.md` |
| `WF_Post_309_Workflow_Stabilization_Roadmap_KR.md` |
| `WF_Reviewed_Concern_Finalization_Path_KR.md` |
| `WF_Studio_Control_Plane_Repositioning_Audit_KR.md` |
| `WF_Studio_Handoff_Wiki_External_Agent_Roadmap_KR.md` |
| `WF_Unified_PC_Runner_Implementation_Report_KR.md` |
| `WF_Unified_PC_Runner_Orchestration_Entrypoint_KR.md` |
| `WF_Workflow_Audit_And_Pruning_Report_KR.md` |
| `WF_Workflow_Cleanup_Application_Report_KR.md` |

## 10. Open Classification Questions

Before DOC-001 fully consolidates entry points, decide:

1. Which FinalBlueprint files should remain linked from the root AIWorkflow README as current references?
2. Which older component specs should move to a historical/archive section in the root README?
3. Whether `WF_Final_Blueprint.md` is superseded by the later end-to-end spec and Studio architecture documents.
4. Whether Korean HTML/guide files should be grouped under a Human Director guide section rather than mixed with technical blueprints.

## 11. Current Verdict

`PASS_WITH_NOTES` for using this folder with the classifications above.

`BLOCKED` for treating the entire folder as current canonical workflow law.

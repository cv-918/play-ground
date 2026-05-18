# AI Workflow Document Index

## 1. Purpose

This directory contains the AI Orchestrator workflow documents for this repository.

The workflow defines how AI tools should be used for development work, including:

- Planning
- Architecture decisions
- Tool routing
- Human approval gates
- Codex analysis
- Copilot implementation
- Diff review
- Validation
- Dev Logs
- Commit decisions

This README is the entry point for the document set.

---

## 2. Document Map

| File | Purpose |
|---|---|
| `AIWorkflow_Overview_KR.md` | Korean Human Director overview of the AIWorkflow layers, responsibilities, and regular operating model |
| `AIWorkflow_Flowchart_KR.md` | Korean flowchart guide for the regular path, read-only inspection path, missing-validation path, and commit decision path |
| `AIWorkflow_Korean_Guide_Glossary.md` | Korean glossary and command usage guide for regular and optional/debug AIWorkflow commands |
| `Guide/AIWorkflow_User_Guide_KR.html` | Complete browser-readable Korean Human Director user guide for the current Discord-first PC Runner workflow |
| `FinalBlueprint/WF_Personal_AI_Development_Studio_Architecture.md` | Official long-term architecture for evolving AIWorkflow into a project-independent Personal AI Development Studio / AI Studio Company Runtime |
| `FinalBlueprint/WF_Personal_AI_Development_Studio_Architecture_KR.md` | Korean Human Director companion for the Personal AI Development Studio / AI Studio Company Runtime architecture |
| `Studio/README.md` | First durable Studio implementation slice: domain model, schemas, read-only staff registry, WorkOrder bridge, staff context/output contract, canon decision flow, memory policy, and runtime contracts |
| `Discord_Korean_Output_Localization.md` | Defines Korean-facing Discord response localization policy for WF-050 |
| `Slash_Command_Metadata_Korean_Localization.md` | Defines Korean-facing Discord slash command metadata localization policy for WF-051 |
| `00_AI_Orchestrator_Overview.md` | High-level overview of the AI Orchestrator workflow |
| `01_AI_Orchestrator_Protocol.md` | Full execution protocol from request to completion |
| `02_Workflow_Scope.md` | Defines when to use full workflow, fast path, or direct work |
| `03_Agent_Roles.md` | Defines AI/team roles such as Orchestrator, Architect, Reviewer, Validator |
| `Agent_Role_Registry_v1.md` | Defines the minimal durable AI agent role registry, handoff format, verdicts, and routing rules for agent-driven AIWorkflow tasks |
| `Role_Router_Rules_v1.md` | Defines deterministic ActiveTask metadata routing rules for activating AIWorkflow roles without executable routing behavior |
| `Review_Validation_Verdict_Format_v1.md` | Defines standardized verdict levels, role-specific verdict formats, severity effects, commit recommendation rules, and human decision gates |
| `Path_Scoped_Rule_Mapping_DustLand_v1.md` | Defines which review, validation, and safety rules apply to major Dust Land repository paths without executable enforcement |
| `Small_Role_Router_Prototype.md` | Defines the read-only local role router prototype command, inputs, output contract, safety limits, and validation expectations |
| `Role_Aware_Goal_Prompt_Injection.md` | Defines how `/ai prepare goal` injects selected-task role router recommendations into generated Codex `/goal` request files |
| `Path_Rule_Checklist_Goal_Prompt_Injection.md` | Defines how `/ai prepare goal` injects concrete path-scoped rule checklist reminders into generated Codex `/goal` request files |
| `Intake_To_Task_Draft_Generation.md` | Defines how `/ai intake` adds a structured Task Draft for manual review and later task creation |
| `Intake_Created_Task_Review_Activation_Flow.md` | Defines the read-only activation review command for intake-created Backlog tasks |
| `ActiveTask_Activation_Safety_Summary.md` | Defines the activation safety summary returned by `/ai task set-active` |
| `Task_Approval_Safety_Summary.md` | Defines the approval safety summary returned by `/ai task approve` |
| `Goal_Request_Execution_Readiness_Summary.md` | Defines execution readiness guidance returned by `/ai prepare goal` |
| `Goal_Result_Intake_Completion_Audit.md` | Defines the read-only `/ai result audit` command for auditing pasted Codex goal result summaries before done or commit decisions |
| `AIWorkflow_Milestone_1_Output_Consolidation.md` | Defines WF-048 regular-path output consolidation, optional/debug/admin command separation, and compact `/ai prepare goal` behavior |
| `FinalBlueprint/WF_Execution_State_Model.md` | Defines WF-201 runtime execution state model, task_id linkage, and draft TaskRunState/SessionState/ProgressEventLog/RuntimeControlHistory storage formats |
| `FinalBlueprint/WF_Task_Workspace_Manager.md` | Defines WF-202 Task Workspace Manager path rules, workspace metadata format, local create/read/status API, conflict handling, and WF-203/WF-204 handoff points |
| `FinalBlueprint/WF_Session_Supervisor.md` | Defines WF-203 Session Supervisor session_id rules, SessionState create/read/update/heartbeat API, runtime session status recording, idle/stalled metadata, and WF-204 handoff points |
| `FinalBlueprint/WF_Evidence_Collector.md` | Defines WF-204 Evidence Collector EvidenceRecord storage, manifest format, create/read/update/status API, changed-file and diff-snapshot reference interfaces, and WF-205 handoff points |
| `FinalBlueprint/WF_Codex_CLI_Execution_Adapter.md` | Defines WF-205 Codex CLI Execution Adapter config, execution guards, Session Supervisor and Evidence Collector integration, failure evidence recording, and WF-206 handoff points |
| `FinalBlueprint/WF_Local_CLI_Execution_Adapter.md` | Defines WF-206 Local CLI Execution Adapter command catalog, command_id allowlist execution, shell blocking, runtime session/evidence integration, failure evidence recording, and WF-207 handoff points |
| `FinalBlueprint/WF_Progress_Heartbeat_Collection.md` | Defines WF-207 progress and heartbeat collection, activity summaries, runtime summary/detail output, display-only idle/stalled state, and WF-208 handoff points |
| `FinalBlueprint/WF_File_Watcher_Diff_Snapshot.md` | Defines WF-208 file watcher and diff snapshot observation, EvidenceRecord/ProgressEventLog linkage, ignore policy, task-detail changed-file display fields, and WF-209 Runtime Control handoff boundaries |
| `FinalBlueprint/WF_Runtime_Control_Adapter.md` | Defines WF-209/210 Runtime Control Adapter, human-approved pause/resume/stop/retry/replan/scope/executor/manual-escalation control records, safe session process control, and WF-301 handoff boundaries |
| `FinalBlueprint/WF_Result_Collector.md` | Defines WF-301 Result Collector ExecutionResult aggregation, result manifest storage, session/evidence/control/progress summary fields, and WF-302/WF-304 handoff boundaries |
| `FinalBlueprint/WF_Diff_Analyzer.md` | Defines WF-302 Diff Analyzer parsing of ExecutionResult diff snapshots into changed-file, line-count, category, and attention-signal observations for WF-304 handoff |
| `FinalBlueprint/WF_Build_Test_Runner.md` | Defines WF-303 Build/Test Runner allowlisted command execution, stdout/stderr/exit-code observation, BuildTestResult storage, and WF-304 handoff boundaries |
| `FinalBlueprint/WF_Verification_Report.md` | Defines WF-304 VerificationReport verdict generation from ExecutionResult, DiffAnalysis, and BuildTestResult evidence, including gate policy, runtime storage, and WF-305 handoff boundaries |
| `FinalBlueprint/WF_Completion_Report_And_Card.md` | Defines WF-305/306 CompletionReport and Completion Card artifacts, readiness mapping, Discord display commands, runtime storage, and WF-307 handoff boundaries |
| `FinalBlueprint/WF_Approval_History_And_Finalization_Log.md` | Defines WF-307 ApprovalHistory and FinalizationLog artifacts, explicit human completion decisions, runtime storage, Discord finalization commands, and WF-308 handoff boundaries |
| `FinalBlueprint/WF_Auto_Approval_Policy.md` | Defines WF-308 deterministic Auto Approval Policy evaluation artifacts, Discord status/evaluate/read commands, strict eligibility rules, and no-apply safety boundary |
| `FinalBlueprint/WF_Follow_Up_Task_Generator.md` | Defines WF-309 Follow-up Task Generator candidate plans, Discord status/generate/read commands, candidate sources, and no-task-create safety boundary |
| `FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md` | Defines Phase 4 post-WF-309 workflow stabilization tasks for audit, command pruning, technical documentation, Human Director guide, end-to-end smoke, PC Runner orchestration, and approved cleanup |
| `FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap_KR.md` | Korean Human Director companion for the post-WF-309 Phase 4 stabilization roadmap |
| `FinalBlueprint/WF_Workflow_Audit_And_Pruning_Report.md` | Audits the post-WF-309 workflow surface, user intervention points, documentation drift, and command pruning/consolidation candidates for WF-401 |
| `FinalBlueprint/WF_Workflow_Audit_And_Pruning_Report_KR.md` | Korean Human Director companion for the workflow audit and pruning report |
| `FinalBlueprint/WF_Command_Surface_Consolidation_Plan.md` | Defines WF-402 command categories, compatibility/manual-escalation boundaries, deprecation plan, removal rules, and approval decisions before cleanup |
| `FinalBlueprint/WF_Command_Surface_Consolidation_Plan_KR.md` | Korean Human Director companion for command categories, manual escalation boundaries, and cleanup decisions |
| `FinalBlueprint/WF_End_To_End_Workflow_Technical_Spec.md` | Defines WF-403 end-to-end technical workflow specification, visualization, user intervention matrix, state/artifact paths, workflow variants, approval stops, and WF-404 handoff |
| `FinalBlueprint/WF_End_To_End_Workflow_Technical_Spec_KR.md` | Korean Human Director companion for the end-to-end technical workflow specification |
| `FinalBlueprint/WF_Human_Director_Operation_Guide_KR.md` | Practical Korean Human Director guide for requesting work, approving work, monitoring progress, reviewing completion, and deciding commits |
| `FinalBlueprint/WF_Human_Director_Operation_Guide_KR.html` | Browser-readable HTML version of the Korean Human Director operation guide |
| `FinalBlueprint/WF_Discord_Command_Quick_Reference_KR.md` | Korean quick reference for Discord commands by runner stop reason and Human Director decision point |
| `FinalBlueprint/WF_Intake_Auto_Handoff.md` | Defines low-risk `/ai intake` to PC Runner auto-handoff policy, safety boundaries, configuration, and validation |
| `FinalBlueprint/WF_Intake_Auto_Handoff_KR.md` | Korean Human Director companion for low-risk intake auto-handoff behavior |
| `FinalBlueprint/WF_Codex_Model_Routing_And_Ephemeral.md` | Defines Codex CLI model/reasoning routing, fast intake candidate, and ephemeral run policy |
| `FinalBlueprint/WF_Codex_Model_Routing_And_Ephemeral_KR.md` | Korean Human Director companion for Codex model routing and ephemeral runs |
| `FinalBlueprint/WF_End_To_End_Workflow_Smoke_Validation_Report.md` | Records WF-405 end-to-end smoke validation evidence, verdict, gaps, and WF-406 handoff |
| `FinalBlueprint/WF_End_To_End_Workflow_Smoke_Validation_Report_KR.md` | Korean Human Director companion for the WF-405 smoke validation report |
| `FinalBlueprint/WF_Unified_PC_Runner_Orchestration_Entrypoint.md` | Defines WF-406 unified PC Runner orchestration entrypoint design, command surface, authority model, runtime artifacts, gates, ID policy, and WF-407 acceptance criteria |
| `FinalBlueprint/WF_Unified_PC_Runner_Orchestration_Entrypoint_KR.md` | Korean Human Director companion for the unified PC Runner orchestration entrypoint design |
| `FinalBlueprint/WF_Unified_PC_Runner_Implementation_Report.md` | Records WF-407 unified PC Runner implementation, local/Discord command surface, validation evidence, authority boundaries, and WF-408 handoff |
| `FinalBlueprint/WF_Unified_PC_Runner_Implementation_Report_KR.md` | Korean Human Director companion for the WF-407 PC Runner implementation result |
| `FinalBlueprint/WF_Workflow_Cleanup_Application_Report.md` | Records WF-408 non-destructive workflow cleanup application, runner-centered command surface, manual-escalation labels, and cleanup validation |
| `FinalBlueprint/WF_Workflow_Cleanup_Application_Report_KR.md` | Korean Human Director companion for the WF-408 workflow cleanup result |
| `FinalBlueprint/WF_Controlled_Runner_Implementation_Profile.md` | Records WF-409 controlled PC Runner implementation profile behavior, Codex CLI adapter readiness gate, artifact flow, safety boundaries, and validation evidence |
| `FinalBlueprint/WF_Controlled_Runner_Implementation_Profile_KR.md` | Korean Human Director companion for the WF-409 controlled implementation runner profile |
| `FinalBlueprint/WF_Controlled_Runner_Smoke_Report.md` | Records WF-410 controlled implementation runner smoke attempt, adapter fix notes, validation evidence, and blocked local/runtime steps |
| `FinalBlueprint/WF_Controlled_Runner_Smoke_Report_KR.md` | Korean Human Director companion for the WF-410 controlled implementation runner smoke attempt |
| `FinalBlueprint/WF_Implementation_Runner_Prompt_And_UTF8_Guard.md` | Records WF-411 implementation runner prompt boundary hardening and text encoding guard behavior |
| `FinalBlueprint/WF_Implementation_Runner_Prompt_And_UTF8_Guard_KR.md` | Korean Human Director companion for the WF-411 implementation runner prompt and UTF-8 guard |
| `FinalBlueprint/WF_Reviewed_Concern_Finalization_Path.md` | Defines WF-412 reviewed-concern finalization acceptance and runner continue guardrails |
| `FinalBlueprint/WF_Reviewed_Concern_Finalization_Path_KR.md` | Korean Human Director companion for WF-412 reviewed-concern finalization acceptance |
| `04_Human_Approval_Gates.md` | Defines when AI must stop and request explicit approval |
| `05_Tool_Routing_Rules.md` | Defines when to use ChatGPT, Codex, Copilot, Git, manual implementation, and build tools |
| `06_Task_Templates.md` | Defines canonical task request templates |
| `07_Review_Validation_Rules.md` | Defines review severity, validation evidence, and completion rules |
| `08_DevLog_Rules.md` | Defines when and how to write Dev Logs |
| `09_Operational_Playbook.md` | Practical runbook for day-to-day workflow execution |
| `10_Quick_Checklists.md` | Short checklists for starting, reviewing, validating, and committing tasks |
| `11_Workflow_Examples.md` | Practical examples for choosing Fast Path, Full Path, Codex, Copilot, manual implementation, review-fix loops, validation, Dev Logs, and stop conditions |
| `12_Troubleshooting_and_Recovery_Guide.md` | Recovery procedures for AI workflow failures such as forbidden file edits, missing new-file diffs, build/runtime failures, project-file corruption, and scope expansion |
| `Unity_Workflow_Context.md` | Records the Unity-first long-term direction and prevents the workflow from overfitting to the current Dust Land custom C++ prototype |
| `Task_State_Model.md` | Defines fixed task states, lifecycle transitions, approval-sensitive transitions, and completion rules for future local/Discord orchestration |
| `ActiveTask_Template.md` | Template for replacing `ActiveTask.md` when starting a new workflow task |
| `Project_Profile_Schema.md` | Defines project profile schema for multi-project, Unity-ready, and Discord-connected workflow orchestration |
| `Discord_Orchestrator_Safety_Rules.md` | Defines permission classes and safety rules for Discord-connected orchestration |
| `Discord_Bot_Config_Template.json` | Template for local Discord bot configuration without secrets |
| `Active_Project_Selector.md` | Defines the durable active project selector convention for multi-project and Unity-ready workflow operation |
| `Discord_Bot_Always_On_Guide.md` | Operation guide for Discord Bot always-on background start, stop, status, restart, logging, and local safety checks |
| `Discord_Task_Management_Commands.md` | Defines Release B Discord task management commands, safety scope, validation commands, and acceptance criteria |
| `Discord_Task_Status_Commands.md` | Defines Release C Discord approval and status note commands, write scope, backup behavior, and validation result |
| `Discord_Safe_Script_Execution_Commands.md` | Defines Release D Discord safe script execution commands, allowlist-only execution, cautions, and validation result |
| `Discord_Codex_Task_Routing_Commands.md` | Defines Release E Discord Codex App task routing prompt generation commands, safety scope, manual bridge, and validation result |
| `Discord_Task_Intake_Command.md` | Defines the read-only `/ai intake` natural-language task suggestion command, classification rules, safety scope, and validation expectations |

---

## 3. Required-Read Korean Files

Files ending in `_Required_Read_KR.md` are Korean support documents for the human developer.

They are not the primary source of truth for AI tools.

The English workflow documents remain the operational source of truth.

Use Korean required-read files when quick human judgment is needed.

---

## 4. Prompt Templates

Reusable prompt templates are stored under:

```text
PromptTemplates/
```

Current template set:

| File | Purpose |
|---|---|
| `01_orchestrator_task_request.md` | Start an orchestrated task |
| `02_architecture_request.md` | Request architecture design or review |
| `03_implementation_planning_request.md` | Convert approved design into implementation plan |
| `04_codex_analysis_request.md` | Ask Codex for read-only repository analysis |
| `05_copilot_implementation_request.md` | Ask Copilot Agent Mode for bounded implementation |
| `06_review_request.md` | Review code, diff, or generated changes |
| `07_validation_request.md` | Define validation steps |
| `08_devlog_request.md` | Generate Dev Log draft |
| `09_workflow_update_request.md` | Propose workflow rule updates |

---

## 5. Project Profiles

Project-specific workflow profiles are stored under:

```text
ProjectProfiles/
```

Current profiles:

| File | Purpose |
|---|---|
| `dustland_custom_cpp_prototype.json` | Current Dust Land custom C++ / WinAPI prototype profile |
| `unity_project_template.json` | Template for future Unity-based solo game projects |
| `ActiveProject.json` | Selects the currently active project profile |

---

## 6. Task Request Records

Concrete task prompts and workflow requests may be stored under:

```text
TaskRequests/
```

This folder is used for:

- Copilot implementation requests
- Copilot fix requests
- Workflow update requests
- Reusable task-specific prompts
- Records of what was given to external tools

Task request files are not always permanent rules.

They are execution records and reusable prompts.

---

## 7. How to Start a New Task

Use this command in ChatGPT:

```text
이 작업에 대해 AI 오케스트레이터 워크플로우 실행해줘.

Task:
...

Context:
...

Scope:
...

Non-Goals:
...

Output needed:
...
```

For meaningful code or data work, do not start with Copilot directly.

Start with orchestration, then route to Codex or Copilot only when appropriate.

---

## 8. Recommended Default Flow

The final target is a Discord-first PC Runner-based execution harness. Discord
is the user-facing interface; the PC Runner owns execution, session supervision,
evidence collection, verification reporting, and audit logging.

Manual Codex App / Codex CLI prompt copy/paste is a legacy/bootstrap escalation
path. It remains allowed while the PC Runner execution path is being built, but
it is not the final architecture.

For regular Discord-assisted AIWorkflow task operation:

```text
1. /ai intake text:<request>
2. If auto-handoff is allowed, review the runner/completion card when it stops.
3. If approval is required, approve the task and start the runner from the
   next-command card.
4. Use /ai runner accept-completion after reviewing the Completion Card.
5. Use mark-done:true only when the completion result is acceptable.
6. Use /ai git commit, /ai git push, or /ai git commit-push after diff review.
```

Compatibility and preview options:

```text
/ai intake-preview text:<request>
/ai task create                   # manual Backlog task creation
/ai prepare goal                  # manual escalation / compatibility path
/ai result audit                  # manual escalation / compatibility path
```

Current responsibility split:

```text
Discord Orchestrator:
  task state, approval records, command safety, Codex CLI-backed
  intake-to-Backlog automation, and runner control cards

Codex CLI intake backend:
  non-interactive TaskDraft JSON generation only

PC Runner execution target:
  final owner of task workspace execution, session supervision, evidence
  collection, verification reporting, and Discord progress/completion reporting

Codex App / Codex CLI manual execution:
  approved manual-escalation path for bootstrap, adapter failure, auth/session
  failure, or high-risk exceptions
```

Current `/ai intake` uses local `codex exec` through the signed-in Codex CLI as
the LLM-assisted intake backend. It creates one Backlog task from a validated
TaskDraft. For P2/P3 low-risk allowlisted work, deterministic auto-handoff may
set ActiveTask, approve, and start PC Runner. Current allowlisted classes are
DOC/VAL, documentation/validation, WF documentation/maintenance, and safe
GAME validation/build validation when the request explicitly excludes
source/data/schema/runtime mutation. `/ai intake` does not mark done, commit, or
push. `/ai intake-preview` is the read-only draft path.

When auto-handoff is blocked, the manual post-intake task flow is:

```text
1. /ai task set-active
2. /ai task approve
3. /ai runner start
4. /ai completion card
5. /ai runner accept-completion
6. /ai task done or /ai runner accept-completion ... mark-done:true
7. /ai git commit, /ai git push, or /ai git commit-push
```

Optional/debug/admin commands such as `/ai role status`, `/ai task
review-intake`, `/ai run workflow-status`, `/ai run active-project`, `/ai run
project-profile`, and `/ai prepare codex` are not required in the regular path.

For broader architecture or high-risk implementation work, the older Full Path
still applies conceptually: intake, architecture/reduced scope, approval,
bounded execution, review, validation, Dev Log, and manual commit decision.

User guide update policy:

`Guide/AIWorkflow_User_Guide_KR.html` is the canonical browser-readable user
guide for the Human Director. Any task that changes the user-facing workflow
must update this guide in the same change set. This includes Discord command
names/options, output cards, next-command prompts, auto-handoff eligibility,
approval behavior, runner profiles, executor routing, stop reasons, completion
gates, task done, finalization, commit/push, manual escalation, or any user
intervention point in the regular workflow.

If a workflow-related task does not require a guide update, the review or
validation summary must explicitly say that the guide was checked and no update
was needed.

---

## 9. Fast Path

Fast Path may be used for:

- Documentation edits
- Prompt template edits
- Dev Log generation
- Explanation-only requests
- Formatting-only changes

Fast Path should not be used for:

- Runtime behavior changes
- Data schema changes
- Save/load changes
- Scene/actor lifecycle changes
- Broad refactoring
- AI-generated implementation across multiple files

---

## 10. Full Path

Full Path is required for:

- New systems
- Runtime behavior changes
- Data schema changes
- Scene or actor lifecycle changes
- Save/load behavior changes
- Multiple-file implementation
- Copilot Agent Mode implementation
- Refactoring
- Build/project file changes

Full Path requires approval, review, validation, and documentation when meaningful.

---

## 11. Critical Operating Rules

```text
Do not let AI jump from idea to implementation.
Do not use Copilot before architecture and scope are approved.
Do not review a diff that is missing newly created files.
Do not treat build success as full validation.
Do not commit without reviewing staged changes.
Do not invent validation results.
```

---

## 12. Git Review Reminders

For newly created untracked files:

```bash
git add -N <new_file>
git diff > review.diff
```

or:

```bash
git add <intended_files>
git diff --cached > review.diff
```

Before commit:

```bash
git diff --check
git status
git diff --cached --stat
```

Avoid `git add .` unless the whole working tree has been reviewed.

---

## 13. Dev Log Locations

Use:

```text
_DevLog/FixLog/
```

for completed implementation or bug-fix records.

Use:

```text
_DevLog/WorkLog/
```

for investigation or partial progress.

Use:

```text
_DevLog/Retrospective/
```

for workflow/process retrospectives.

---

## 14. Relationship to Repository-Level Instructions

Top-level AI rules are stored at:

```text
AGENTS.md
.github/copilot-instructions.md
```

This directory contains detailed workflow documentation.

`AGENTS.md` is the repository-level entry point for AI tools.

`.github/copilot-instructions.md` is the Copilot-specific implementation guide.

---

## 15. Maintenance Policy

Update this document when:

- A new numbered workflow document is added.
- A major prompt template is added.
- Folder structure changes.
- Tool responsibility changes.
- The workflow operating sequence changes.

Do not silently change workflow rules.

Use `09_workflow_update_request.md` when changing workflow behavior.

---

## 16. Summary

This document set exists to make AI-assisted development:

```text
Structured
Bounded
Reviewable
Validated
Traceable
Commit-safe
```

Use this README as the starting point when navigating the workflow documents.

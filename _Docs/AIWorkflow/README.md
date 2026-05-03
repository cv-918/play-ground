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
| `00_AI_Orchestrator_Overview.md` | High-level overview of the AI Orchestrator workflow |
| `01_AI_Orchestrator_Protocol.md` | Full execution protocol from request to completion |
| `02_Workflow_Scope.md` | Defines when to use full workflow, fast path, or direct work |
| `03_Agent_Roles.md` | Defines AI/team roles such as Orchestrator, Architect, Reviewer, Validator |
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
| `Discord_Orchestrator_Implementation_Stages.md` | Defines staged implementation plan for Discord-connected AI workflow orchestration |
| `Discord_ReadOnly_Bot_v1_Spec.md` | Defines read-only Discord Bot v1 commands, behavior, output, and restrictions |
| `Discord_Orchestrator_Safety_Rules.md` | Defines permission classes and safety rules for Discord-connected orchestration |
| `Discord_ReadOnly_Bot_v1_Implementation_Plan.md` | Defines implementation plan, runtime model, command mapping, safety constraints, and validation plan for Discord Read-Only Bot v1 |
| `Discord_ReadOnly_Bot_v1_Setup_Checklist.md` | Checklist for Discord Developer Portal setup, local environment setup, and v1 bot validation |
| `Discord_Bot_Config_Template.json` | Template for local Discord bot configuration without secrets |
| `Discord_ReadOnly_Bot_v1_Validation_Result.md` | Records validation results, fixes, limitations, and safety constraints for Discord Read-Only Bot v1 |
| `Active_Project_Selector.md` | Defines the durable active project selector convention for multi-project and Unity-ready workflow operation |
| `Discord_Bot_v1_Operation_Guide.md` | Daily operation guide for starting, using, shutting down, and safely operating Discord Read-Only Bot v1 |
| `Discord_Bot_v1_Troubleshooting.md` | Troubleshooting reference for Discord Bot v1 token, command, local script, active project, and Git safety issues |
| `Discord_Bot_Always_On_Guide.md` | Operation guide for Discord Bot always-on background start, stop, status, restart, logging, and local safety checks |
| `Discord_Task_Management_Commands.md` | Defines Release B Discord task management commands, safety scope, validation commands, and acceptance criteria |

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

For meaningful implementation work:

```text
1. ChatGPT: Orchestrator intake
2. ChatGPT: Architecture and reduced scope
3. Human: Approval
4. Codex: Read-only repository analysis if needed
5. ChatGPT: Implementation prompt generation
6. Copilot: Bounded implementation
7. Git: Full diff capture
8. ChatGPT: Diff review
9. Human: Build and runtime validation
10. ChatGPT: Dev Log draft
11. Human: Commit decision
```

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

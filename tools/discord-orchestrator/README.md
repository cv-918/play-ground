# Discord AIWorkflow Bot

## Purpose

This is the Discord adapter for the AIWorkflow system.

The original v1 command set is read-only. Release B adds limited task management writes.
Release C adds controlled task status note writes. Release D adds allowlisted workflow
script execution commands. Release E adds Codex App prompt package generation.
Release F adds Codex CLI `/goal` request markdown generation. WF-031 updates
that generation to Codex Goal Prompt Contract v2. WF-037 adds a read-only
role router recommendation command. WF-038 injects selected-task role routing
guidance into generated `/ai prepare goal` request files. WF-039 injects
concrete path-scoped rule checklist reminders into the same generated files.
WF-040 adds a read-only natural-language task intake suggestion command.
WF-041 adds a Task Draft section to intake responses for manual review.
WF-042 adds explicit human-invoked Backlog task creation from intake drafts.
WF-043 adds read-only activation review for intake-created Backlog tasks.
WF-044 adds activation safety guidance to `/ai task set-active` responses.

It can read:

```text
read workflow status
read active task
read backlog summary
read project profiles
read ActiveTask role routing recommendation
suggest structured task intake from natural-language text
create Backlog tasks from explicit intake-create requests
review intake-created Backlog tasks before manual activation
show activation safety guidance after task selection
format Discord responses
```

It can write only:

```text
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ActiveTask.md
_Temp/AIWorkflowDiscordBot/backups/
_Temp/AIWorkflowReports/
_Temp/AIWorkflowDiffs/
_Temp/AIWorkflowTaskRequests/
```

It must not:

```text
edit source
edit game source code
edit _Local/
edit node_modules/
run Copilot
run Codex write mode
run Codex CLI `/goal`
run OpenClaw
run Claude
run build
run game/runtime
run arbitrary shell commands
implement subagents
implement Unity AI
expose direct npm/git/codex/copilot/build/test/computer-use/commit/push/release commands
commit
push
release
delete files
```

---

## Requirements

```text
Node.js 22.12.0 or newer
npm
Discord application + bot token
Private Discord server/channel for testing
```

---

## Local Config

Create this file manually:

```text
_Local/AIWorkflow/discord_bot.local.json
```

Use `config.example.json` as the template.

Do not commit `_Local/`.

---

## Supported Commands

```text
/ai status
/ai active
/ai backlog
/ai next
/ai blockers
/ai docs
/ai intake
/ai intake-create
/ai project list
/ai project profile
/ai role status
/ai task current
/ai task list
/ai task create
/ai task review-intake
/ai task set-active
/ai task approve
/ai task block
/ai task defer
/ai task done
/ai run workflow-status
/ai run active-project
/ai run project-profile
/ai run json-smoke
/ai run capture-diff
/ai prepare codex
/ai prepare goal
```

For project profile:

```text
/ai project profile
/ai project profile id:dustland_custom_cpp_prototype
/ai project profile id:unity_project_template
```

Default behavior:

```text
/ai project profile
```

uses:

```text
_Docs/AIWorkflow/ActiveProject.json
```

Explicit `id:` overrides the active project selector for that request only.

For task commands:

```text
/ai task current
/ai task list
/ai task list status:todo
/ai task list kind:automation
/ai task create title:"Test Discord task management command" category:WF priority:P2 kind:automation reason:"Release B validation"
/ai task review-intake id:GAME-20260506-145948
/ai task set-active id:WF-20260503-231500
/ai task approve id:WF-20260503-231500 note:"Approval note"
/ai task block id:WF-20260503-231500 reason:"Block reason"
/ai task defer id:WF-20260503-231500 reason:"Defer reason"
/ai task done id:WF-20260503-231500 evidence:"Validation evidence"
```

See:

```text
_Docs/AIWorkflow/Discord_Task_Management_Commands.md
_Docs/AIWorkflow/Discord_Task_Status_Commands.md
_Docs/AIWorkflow/Discord_Safe_Script_Execution_Commands.md
_Docs/AIWorkflow/Discord_Codex_Task_Routing_Commands.md
_Docs/AIWorkflow/Discord_Goal_Task_Routing_Commands.md
_Docs/AIWorkflow/Discord_Task_Intake_Command.md
_Docs/AIWorkflow/Discord_Role_Recommendation_Command.md
_Docs/AIWorkflow/Role_Aware_Goal_Prompt_Injection.md
_Docs/AIWorkflow/Path_Rule_Checklist_Goal_Prompt_Injection.md
_Docs/AIWorkflow/Intake_To_Task_Draft_Generation.md
_Docs/AIWorkflow/Intake_Approval_Task_Creation_Flow.md
_Docs/AIWorkflow/Intake_Created_Task_Review_Activation_Flow.md
```

`/ai task set-active` writes ActiveTask.md and then returns an activation safety
summary with recommended roles, human gates, required validation, suggested
execution route, safety note, and suggested next manual commands. It does not
approve the task, change the Backlog row status, execute Codex CLI, execute
agents, mark the task done, commit, push, or modify source files.

For role router recommendation:

```text
/ai role status
```

`/ai role status` runs the existing read-only role router status script in JSON
mode and displays the current ActiveTask recommendation. The response includes
Active Task, Recommended Roles, Role Rationale, Human Decision Gates, Required
Validation, Suggested Execution Route, Verdict Format, and Next Manual Action.

It does not execute agents, approve tasks, mark tasks done, modify game source,
modify `_Local/`, modify `node_modules/`, commit, push, or expose secrets.

For read-only task intake:

```text
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
/ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어"
/ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어"
```

`/ai intake` returns a structured task suggestion with interpreted request,
suggested title, category, kind, priority/risk, workflow path, recommended
roles, human gates, validation, execution route, next manual action, and a Task
Draft section for manual review.

It is read-only. It does not create Backlog tasks, update ActiveTask.md, approve
tasks, execute agents, execute Codex CLI, commit, push, or modify source files.

For explicit intake task creation:

```text
/ai intake-create text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
```

`/ai intake-create` uses the same intake classification and Task Draft fields,
then appends one `todo` row to `_Docs/AIWorkflow/Backlog.md`. It creates a
timestamped Backlog backup before writing and returns the new task id.

It does not update ActiveTask.md, approve the task, execute agents, execute
Codex CLI, commit, push, or modify source files.

For intake-created task review:

```text
/ai task review-intake id:<task_id>
```

`/ai task review-intake` reads the Backlog task, checks whether it appears to
come from `/ai intake-create`, shows activation readiness, role routing, human
gates, validation expectations, execution route, verdict guidance, and suggested
manual next commands.

It is read-only. It does not update Backlog.md, update ActiveTask.md, approve
the task, change status, execute agents, execute Codex CLI, commit, push, or
modify source files.

For safe script execution:

```text
/ai run workflow-status
/ai run active-project
/ai run project-profile
/ai run project-profile id:unity_project_template
/ai run json-smoke
/ai run capture-diff
```

`/ai run capture-diff include-untracked:true` is available but should be used only
when intentionally approved because the underlying script may mark untracked files
with intent-to-add.

For Codex prompt preparation:

```text
/ai prepare codex
/ai prepare codex id:GAME-001 mode:analysis context:standard
/ai prepare codex id:GAME-002 mode:implementation context:standard
/ai prepare codex id:WF-021 mode:review context:compact
```

`/ai prepare codex` writes a manual Codex App prompt markdown file under:

```text
_Temp/AIWorkflowTaskRequests/
```

It does not execute Codex, Copilot, computer-use, build/test commands, commits,
pushes, or releases.

For Codex CLI goal request preparation:

```text
/ai prepare goal
/ai prepare goal id:GAME-001 mode:analysis context:standard
/ai prepare goal id:GAME-005 mode:implementation context:standard
/ai prepare goal id:WF-021 mode:review context:compact
```

`/ai prepare goal` writes a manual Codex CLI `/goal` request markdown file under:

```text
_Temp/AIWorkflowTaskRequests/
```

The generated file starts with a usable `/goal` command and follows Codex Goal
Prompt Contract v2. It includes Goal Header, Objective, Task Context, Project
Context, Scope, Non-goals, Execution Mode, Safety Constraints, Human Decision
Gates, Subagent Policy, Validation Plan, Stop Conditions, Completion Audit, and
Required Return Format sections. It also includes role router guidance:
Recommended Roles, Role Rationale, Human Decision Gates, Required Validation,
Suggested Execution Route, Verdict Format Reminder, and Path-Scoped Rule
Reminders. WF-039 also adds a dedicated Path-Scoped Rule Reminders section
with concrete checklist items selected from the likely task scope.

It does not execute Codex CLI, OpenClaw, Claude, subagents, Unity AI,
computer-use, commits, pushes, or releases.

---

## Validation

After starting the bot:

```text
[ ] Unauthorized user is rejected.
[ ] Unauthorized channel is rejected.
[ ] /ai status works.
[ ] /ai active works.
[ ] /ai backlog works.
[ ] /ai next works.
[ ] /ai intake returns a structured task suggestion.
[ ] /ai intake-create creates one Backlog task only when explicitly invoked.
[ ] /ai project list works.
[ ] /ai project profile shows Source: ActiveProject.json.
[ ] /ai project profile id:unity_project_template shows Source: explicit project id.
[ ] /ai role status works.
[ ] /ai task current works.
[ ] /ai task list works.
[ ] /ai task create appends one Backlog.md row and creates a backup.
[ ] /ai task review-intake id:<intake-created task id> works and is read-only.
[ ] /ai task review-intake id:GAME-001 works as a generic activation review.
[ ] /ai task set-active updates ActiveTask.md and creates a backup.
[ ] /ai task set-active response includes roles, gates, validation, route, safety note, and next commands.
[ ] /ai task set-active does not approve tasks or execute agents/Codex CLI.
[ ] /ai task approve updates Backlog.md and creates a backup.
[ ] /ai task block updates Backlog.md and creates a backup.
[ ] /ai task defer updates Backlog.md and creates a backup.
[ ] /ai task done updates Backlog.md and creates a backup.
[ ] Status commands update ActiveTask.md when the target task is active.
[ ] /ai run workflow-status works.
[ ] /ai run active-project works.
[ ] /ai run project-profile works.
[ ] /ai run project-profile id:unity_project_template works.
[ ] /ai run json-smoke works.
[ ] /ai run capture-diff works.
[ ] /ai prepare codex works with ActiveTask.md default.
[ ] /ai prepare codex id:GAME-001 mode:analysis context:standard works.
[ ] /ai prepare codex id:GAME-002 mode:implementation context:standard works.
[ ] /ai prepare codex id:WF-021 mode:review context:compact works.
[ ] /ai prepare goal works with ActiveTask.md default.
[ ] /ai prepare goal id:GAME-001 mode:analysis context:standard works.
[ ] /ai prepare goal id:WF-037 mode:review context:compact works.
[ ] /ai prepare goal id:WF-038 mode:review context:compact works.
[ ] /ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어" works.
[ ] /ai intake-create text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어" creates one Backlog task.
[ ] /ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어" works.
[ ] /ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어" works.
[ ] /ai intake responses include a Task Draft section with title, category, priority, kind, reason, risk, workflow path, roles, gates, validation, and next manual action.
[ ] /ai intake-create creates a timestamped Backlog backup before writing.
[ ] /ai intake-create escapes markdown table pipes in generated Backlog cells.
[ ] /ai task review-intake does not modify Backlog.md or ActiveTask.md.
[ ] /ai task review-intake does not approve tasks or execute agents/Codex CLI.
[ ] Generated Codex prompt files are created under _Temp/AIWorkflowTaskRequests/.
[ ] Generated goal request files are created under _Temp/AIWorkflowTaskRequests/.
[ ] Generated goal request files start with `/goal` and include all Contract v2 sections.
[ ] Generated goal request files include mode-aware scope, human decision gates, subagent policy, and completion audit.
[ ] Generated goal request files include Recommended Roles, Role Rationale, Human Decision Gates, Required Validation, Suggested Execution Route, Verdict Format Reminder, and Path-Scoped Rule Reminders.
[ ] Generated goal request files include concrete path-specific checklist items in the dedicated Path-Scoped Rule Reminders section.
[ ] /ai intake does not modify Backlog.md or ActiveTask.md.
[ ] /ai intake-create does not modify ActiveTask.md and does not approve the task.
[ ] Git status changes only for explicitly approved write commands.
```

---

## Always-On Windows Operation

For background local operation, use the wrapper commands:

```bat
start_bot.bat
status_bot.bat
restart_bot.bat
stop_bot.bat
```

Optional Windows Scheduled Task install/uninstall wrappers are also available:

```bat
install_startup_task.bat
uninstall_startup_task.bat
```

See:

```text
_Docs/AIWorkflow/Discord_Bot_Always_On_Guide.md
```

---

## Notes

This bot runs local scripts:

```text
tools/aiworkflow/workflow_status.bat --json
tools/aiworkflow/active_project_status.bat --json
tools/aiworkflow/project_profile_status.bat --json
tools/aiworkflow/project_profile_status.bat --project <id> --json
tools/aiworkflow/role_router_status.bat --json
tools/aiworkflow/json_smoke_check.bat
tools/aiworkflow/capture_diff.bat
```

It does not execute arbitrary shell commands.

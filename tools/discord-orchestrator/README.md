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
WF-045 adds approval safety guidance to `/ai task approve` responses.
WF-046 adds execution readiness guidance to `/ai prepare goal` responses.
WF-047 adds read-only Codex goal result intake and completion audit.
WF-048 consolidates Milestone 1 output so regular workflow responses stay
compact and detailed routing/checklist output moves to optional debug/admin
commands or generated request files.
WF-050 localizes user-facing Discord response headings, safety notes, next
actions, and common error wrappers into Korean while preserving command names,
ids, paths, raw status values, and mode/context values.
WF-051 localizes Discord slash command metadata descriptions into Korean while
preserving command names, option names, choice raw values, schemas, and behavior.
WF-20260511-000002 adds Codex CLI assisted TaskDraft generation for
`/ai intake`, with local schema validation, rule-based cross-checks, and direct
Backlog task creation without ChatGPT Web/Codex App paste steps.
WF-407 adds the unified PC Runner command surface through `/ai runner`.
WF-408 makes `/ai runner` the regular workflow path and relabels older
prepare/result/run commands as manual escalation, diagnostic, or compatibility
surfaces.

It can read:

```text
read workflow status
read active task
read backlog summary
read project profiles
read ActiveTask role routing recommendation
create Backlog tasks from natural-language intake through Codex CLI
preview structured task intake without writing Backlog
review intake-created Backlog tasks before manual activation
show activation safety guidance after task selection
show approval safety guidance after task approval
show goal request execution readiness before manual Codex CLI use
audit pasted Codex goal result summaries for completion and commit readiness
run the approved PC Runner orchestration entrypoint and stop at human gates
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
_Temp/AIWorkflowRuntime/
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
run arbitrary build commands outside allowlisted workflow commands
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
/ai intake-preview
/ai intake-test
/ai intake-engine status
/ai bot status
/ai bot restart
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
/ai result audit
/ai completion status
/ai completion report
/ai completion card
/ai finalization status
/ai finalization accept
/ai finalization accept-concerns
/ai finalization request-changes
/ai finalization reject
/ai finalization defer
/ai finalization read
/ai runner status
/ai runner plan
/ai runner start
/ai runner continue
/ai runner accept-completion
/ai runner stop
/ai runner read
/ai auto-approval status
/ai auto-approval evaluate
/ai auto-approval read
/ai follow-up status
/ai follow-up generate
/ai follow-up read
/ai git commit
/ai git push
/ai git commit-push
```

## Regular Workflow Path

Use this path for normal task operation:

```text
1. /ai intake
2. eligible low-risk tasks may auto-handoff to set-active, approve, and runner start
3. /ai task set-active, only when auto-handoff does not apply
4. /ai task approve, only when policy requires explicit approval
5. /ai runner plan, when a plan preview is needed
6. /ai runner start, when auto-handoff did not start the runner
7. Review the Completion Card
8. /ai runner accept-completion, or /ai finalization request-changes
9. /ai runner continue, only when a non-completion human gate asks for it
10. /ai task done, only after human completion decision
11. /ai git commit, /ai git push, or /ai git commit-push after diff review
```

Intake auto-handoff is limited to P2/P3, low-risk tasks with no clarification
or cross-check blocker. Current allowlisted classes are DOC/VAL,
documentation/validation, WF documentation/maintenance, and GAME validation or
build-validation only when the request explicitly says there is no source,
data, schema, or runtime behavior change. P0/P1, medium/high-risk, GAME
mutation work, UNITY, source/data/refactor, and command-behavior tasks remain
behind manual Human Director approval.

Milestone 1 consolidation keeps regular responses short. Detailed role routing,
path-rule reminders, validation expectations, and completion guidance remain in
the generated `goal_request_*.md` files.

`/ai prepare codex`, `/ai prepare goal`, and `/ai result audit` remain available
as manual escalation or compatibility paths. They are no longer the regular
workflow path after WF-407.

WF-305/306 completion commands are Phase 3 runtime review helpers. They read
VerificationReport and CompletionReport artifacts, then show a Discord-facing
completion card. They do not approve, mark done, finalize, commit, or push.

WF-307 finalization commands record explicit Human Director completion
decisions into ApprovalHistory and FinalizationLog artifacts. They do not apply
auto approval, commit, or push. The regular shortcut
`/ai runner accept-completion ... mark-done:true` is an explicit Human Director
command that combines completion acceptance and `task done`; it still does not
commit or push.

## Optional / Debug / Admin Commands

These commands are useful for inspection, troubleshooting, or fallback paths,
but they are not required in the regular flow:

```text
/ai role status
/ai task review-intake
/ai run workflow-status
/ai run active-project
/ai run project-profile
/ai run json-smoke
/ai run capture-diff
/ai prepare codex
/ai prepare goal
/ai result audit
/ai intake-preview
/ai intake-test
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
_Docs/AIWorkflow/Intake_Created_Task_Review_Activation_Flow.md
_Docs/AIWorkflow/Goal_Result_Intake_Completion_Audit.md
_Docs/AIWorkflow/FinalBlueprint/WF_Intake_Auto_Handoff.md
_Docs/AIWorkflow/FinalBlueprint/WF_Discord_Command_Quick_Reference_KR.md
```

`/ai task set-active` writes ActiveTask.md and then returns an activation safety
summary with the selected task, a short safety note, and suggested next manual
commands. Full routing detail is available through optional `/ai role status`;
approval is handled by `/ai task approve`; regular execution readiness is checked
by `/ai runner plan`. It does not approve the task, change the Backlog row
status, execute Codex CLI, execute agents, mark the task done, commit, push, or
modify source files.

`/ai task approve` updates the task status to `ready_for_implementation` and
then returns a compact approval summary, short safety note, and suggested next
manual commands. Use `/ai runner plan` as the regular execution readiness check,
and use optional `/ai role status` for full routing details. It does not execute
Codex CLI, execute agents, implement changes, mark the task done, commit, push,
or modify source files.

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

For automated task intake:

```text
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
```

`/ai intake` calls local `codex exec`, receives a TaskDraft JSON candidate,
validates it, cross-checks it against the rule-based baseline, and creates one
Backlog task. The default model is `gpt-5.5`, but local `llm_intake.model_routes`
can route low-risk documentation/validation intake to a faster Codex model such
as `gpt-5.4-mini` with lower reasoning and `--ephemeral`. It does not
update ActiveTask.md, approve tasks, execute agents, run implementation Codex,
commit, push, or modify source files unless the separate intake auto-handoff
policy applies after Backlog creation.

For read-only task intake preview:

```text
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
/ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어"
/ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어"
```

`/ai intake-preview` returns a structured task suggestion with interpreted request,
suggested title, category, kind, priority/risk, workflow path, recommended
roles, human gates, validation, execution route, next manual action, and a Task
Draft section for manual review.

`/ai intake-preview` is the read-only path. The deterministic local keyword/rule
classifier is kept as a baseline and mismatch detector. Korean keywords are
supported for common workflow, Unity, validation, gameplay, and data requests.
Ambiguous intake results still require Human Director review before activation
or approval.

`/ai intake-preview` is read-only. It does not create Backlog tasks, update
ActiveTask.md, approve tasks, execute agents, run implementation Codex, commit,
push, or modify source files.

For intake response format smoke testing:

```text
/ai intake-test
/ai intake-test validation-count:31
```

`/ai intake-test` renders the intake task-created response shape with sample
data only. It does not call Codex CLI, write Backlog, update ActiveTask, approve
tasks, execute agents, commit, push, or modify source files.

For intake task creation:

```text
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
```

`/ai intake` uses the Codex CLI intake path, appends one `todo` row to
`_Docs/AIWorkflow/Backlog.md`, creates a timestamped Backlog backup before
writing, and may auto-handoff allowlisted low-risk DOC/VAL/WF tasks or safe
no-mutation GAME validation/build-validation tasks into PC Runner execution.

It does not mark tasks done, commit, push, or modify source files directly.

For engine diagnostics:

```text
/ai intake-engine status
```

For managed bot control:

```text
/ai bot status
/ai bot restart
```

`/ai bot restart` schedules the existing local `restart_bot.ps1` script after
the Discord reply is sent. It works only when the currently running bot process
matches the managed state file created by `start_bot.bat`; otherwise it refuses
to restart so it cannot stop the wrong process or create duplicate bot sessions.

`/ai bot status` also compares the Git HEAD recorded when the bot was started
with the current repository HEAD. If the repository changed after the bot was
started, the response marks restart as recommended so old-process bugs are
easier to spot.

For intake-created task review:

```text
/ai task review-intake id:<task_id>
```

`/ai task review-intake` reads the Backlog task, checks whether it appears to
come from the intake flow, shows activation readiness, role routing, human
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

For manual-escalation Codex CLI goal request preparation:

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

The Discord response is intentionally compact: generated path, task summary,
mode/context, readiness verdict, next manual action, and a safety note. The
generated markdown file carries the detailed Contract v2, role-aware,
path-rule, validation, and completion guidance. This is a manual-escalation path
for cases where `/ai runner` is unavailable or explicitly bypassed by the Human
Director. Discord does not execute Codex CLI or agents.

It does not execute Codex CLI, OpenClaw, Claude, subagents, Unity AI,
computer-use, commits, pushes, or releases.

For manual-escalation Codex result audit:

```text
/ai result audit id:<task_id> result:"Implementation completed. Files changed: ... Validation passed: ... No commit."
```

`/ai result audit` reads the Backlog task and audits a pasted or summarized
manual Codex result. It returns Task Summary, Result Intake Summary, Claimed
Files Changed, Validation Evidence, Missing Evidence, Risk Notes, Completion
Verdict, Commit Recommendation, Suggested Next Manual Commands, and Safety
Status.

Completion Verdict values are `READY_TO_MARK_DONE`, `NEEDS_REVIEW`,
`NEEDS_VALIDATION`, `BLOCKED`, and `FAILED`. Commit Recommendation values are
`COMMIT_RECOMMENDED`, `COMMIT_AFTER_REVIEW`, `DO_NOT_COMMIT_YET`, and
`NO_COMMIT_NEEDED`.

It is read-only. It does not mark tasks done, update Backlog.md, update
ActiveTask.md, approve tasks, execute Codex CLI, execute agents, commit, push,
or modify source files.

For the regular PC Runner path:

```text
/ai runner status id:<task_id>
/ai runner plan id:<task_id>
/ai runner start id:<task_id>
/ai runner continue id:<task_id>
/ai runner stop id:<task_id>
/ai runner read id:<task_id>
```

`/ai runner` calls the local PC Runner entrypoint and stops at Human Director
gates. `profile:validation` runs the safe validation chain. `profile:build`
routes build validation through allowlisted `build_test_runner` commands such
as `debug_visual_studio_build`. `profile:implementation` routes through the
guarded Codex CLI adapter and stops if the local Codex adapter config is
missing or disabled. It does not create Backlog tasks, commit, push, or run
arbitrary shell commands. It marks tasks done only when the Human Director uses
an explicit completion shortcut such as `mark-done:true`.

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
[ ] /ai intake creates one Backlog task from a structured TaskDraft.
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
[ ] /ai task set-active response is compact and includes selected task, safety note, and next commands.
[ ] /ai task set-active does not approve tasks or execute agents/Codex CLI.
[ ] /ai task approve updates Backlog.md and creates a backup.
[ ] /ai runner plan id:<task_id> returns a runner plan.
[ ] /ai runner start id:<task_id> stops at a Human Director gate.
[ ] /ai runner command choices expose only currently supported profile values.
[ ] /ai task approve response is compact and includes approval status, safety note, and next commands.
[ ] /ai task approve does not mark done or execute agents/Codex CLI.
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
[ ] /ai prepare goal id:WF-046 mode:analysis context:standard works.
[ ] /ai prepare goal id:WF-046 mode:implementation context:standard works.
[ ] /ai prepare goal id:WF-037 mode:review context:compact works.
[ ] /ai prepare goal id:WF-038 mode:review context:compact works.
[ ] /ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어" works.
[ ] /ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어" works.
[ ] /ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어" works.
[ ] /ai intake-test renders the intake task-created response format without Backlog or Codex execution.
[ ] /ai intake responses include a Task Draft section with title, category, priority, kind, reason, risk, workflow path, roles, gates, validation, and next manual action.
[ ] /ai intake responses show LLM intake status, fallback status when used, confidence, and rule-based cross-check mismatches.
[ ] /ai intake creates a timestamped Backlog backup before writing.
[ ] /ai intake escapes markdown table pipes in generated Backlog cells.
[ ] /ai intake auto-handoff responses include concrete next commands for Runner human gates.
[ ] /ai task review-intake does not modify Backlog.md or ActiveTask.md.
[ ] /ai task review-intake does not approve tasks or execute agents/Codex CLI.
[ ] Generated Codex prompt files are created under _Temp/AIWorkflowTaskRequests/.
[ ] Generated goal request files are created under _Temp/AIWorkflowTaskRequests/.
[ ] Generated goal request files start with `/goal` and include all Contract v2 sections.
[ ] Generated goal request files include mode-aware scope, human decision gates, subagent policy, and completion audit.
[ ] Generated goal request files include compact role routing, role rationale, human gates, required validation, verdict reminder, and path-scoped reminders.
[ ] Generated goal request files include concrete path-specific checklist items in the dedicated Path-Scoped Rule Reminders section.
[ ] /ai prepare goal responses are compact and include generated path, task, mode/context, readiness verdict, next manual action, and safety note.
[ ] /ai prepare goal does not execute Codex CLI or agents and does not modify task state.
[ ] /ai result audit id:<task_id> result:"..." returns a completion audit.
[ ] /ai result audit identifies missing validation evidence.
[ ] /ai result audit distinguishes completion verdict from commit recommendation.
[ ] /ai result audit does not modify Backlog.md or ActiveTask.md.
[ ] /ai result audit does not mark tasks done, execute agents/Codex CLI, commit, or push.
[ ] /ai git commit [message:<message>] commits only after forbidden path safety checks and generates a concise message when omitted.
[ ] /ai git push pushes the current branch.
[ ] /ai git commit-push [message:<message>] commits then pushes only after forbidden path safety checks and generates a concise message when omitted.
[ ] /ai git commands reject _Temp/, _Local/, node_modules/, .env, and *.local.json changes.
[ ] /ai intake does not mark tasks done, commit, or push.
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

After this change, Discord can request a managed restart through `/ai bot
restart`, but the first run after updating command schema still requires the
existing local register/restart flow so Discord receives the new command.

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

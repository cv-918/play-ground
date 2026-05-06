# Discord Goal Task Routing Commands

## Purpose

WF-026 adds a Discord command for generating manual Codex CLI `/goal` request
markdown files from AIWorkflow tasks. WF-031 standardizes the generated file
shape as Codex Goal Prompt Contract v2. WF-038 adds selected-task role router
recommendations to the generated request body.

This command prepares request files only. It does not execute Codex CLI,
OpenClaw, Claude, subagents, Unity AI, computer-use, commits, pushes, releases,
or game/runtime tools.

The command is available under:

```text
/ai prepare goal
```

---

## Command

### `/ai prepare goal`

Options:

```text
id: optional string
mode: optional choice
  analysis
  implementation
  prototype
  review
context: optional choice
  compact
  standard
  full
```

Default behavior:

```text
id omitted: use the task_id from _Docs/AIWorkflow/ActiveTask.md
mode omitted: implementation
context omitted: standard
```

When `id` is supplied, it must pass the existing task id validation path:

```text
^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$
```

The task is resolved from:

```text
_Docs/AIWorkflow/Backlog.md
```

The resolver first matches the Backlog row ID. If no row ID matches, it may
match a leading task label in the Backlog item text, such as `WF-037 Discord
Role Recommendation Command`.

---

## Generated File Location

The command writes one markdown request file under:

```text
_Temp/AIWorkflowTaskRequests/
```

File name format:

```text
goal_request_<task_id>_<YYYYMMDD_HHMMSS>.md
```

`_Temp/` is ignored by Git and must remain untracked.

---

## Generated File Contents

The generated markdown file starts with a usable first-line `/goal` command.

It then follows Codex Goal Prompt Contract v2:

```text
1. Goal Header
2. Objective
3. Task Context
4. Project Context
5. Scope
6. Non-goals
7. Execution Mode
8. Safety Constraints
9. Human Decision Gates
10. Subagent Policy
11. Validation Plan
12. Stop Conditions
13. Completion Audit
14. Required Return Format
```

WF-038 also injects a supplemental role-aware routing block:

```text
Role Router Recommendations
  Recommended Roles
  Role Rationale
  Human Decision Gates
  Required Validation
  Suggested Execution Route
  Verdict Format Reminder
  Path-Scoped Rule Reminders
```

The role-aware block is advisory routing guidance for the selected task. It does
not execute agents, approve tasks, mark tasks done, run Codex CLI, or change
task state.

The project context is read from:

```text
_Docs/AIWorkflow/ActiveProject.json
_Docs/AIWorkflow/ProjectProfiles/<active-profile>.json
```

---

## Mode Behavior

### analysis

The generated request asks Codex to analyze scope, architecture boundaries,
risks, likely files, validation needs, and approval gates without editing files.
The Contract v2 Scope and Execution Mode sections explicitly prohibit file
modifications.

### implementation

The generated request asks Codex to implement only the approved reduced-scope
version of the selected task. It always includes `Do not commit.`
The Contract v2 Scope section allows only bounded file changes inside the
approved task scope.

### prototype

The generated request asks Codex to create a reduced-scope proof of the
final-form architecture. It must not create disposable architecture that implies
a future rewrite.
The Contract v2 Scope section allows isolated prototype work only when the task
explicitly requests it.

### review

The generated request asks Codex to review the current diff and report bugs,
regressions, missing validation, and scope violations without editing files.
The Contract v2 Scope and Execution Mode sections explicitly prohibit file
modifications unless a human separately asks for fixes.

---

## Safety Restrictions

The Discord command must not:

```text
- Execute Codex CLI automatically.
- Execute OpenClaw.
- Execute Claude.
- Execute external agents unless explicitly approved.
- Implement Unity AI.
- Implement computer-use.
- Commit.
- Push.
- Release.
- Modify _Docs/AIWorkflow/Backlog.md.
- Modify _Docs/AIWorkflow/ActiveTask.md.
- Modify game source files.
- Modify _Local/.
- Modify node_modules/.
- Expose or print the Discord bot token.
```

Allowed command write path:

```text
_Temp/AIWorkflowTaskRequests/
```

---

## Discord Response

The Discord response stays short and includes:

```text
task id
task title
mode
context level
generated file path
next manual steps for running Codex CLI /goal
```

The manual bridge remains:

```text
Human opens the generated file, reviews it, and pastes the request into Codex CLI.
```

---

## Validation Commands

Run from repository root:

```bat
cd /d C:\Users\kalux\workStation\play-ground
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
```

Discord validation:

```text
1. /ai prepare goal
2. /ai prepare goal id:GAME-001 mode:analysis context:standard
3. /ai prepare goal id:GAME-005 mode:implementation context:standard
4. /ai prepare goal id:WF-021 mode:review context:compact
5. /ai status
6. /ai active
```

Expected:

```text
- Each prepare command returns a generated file path under _Temp/AIWorkflowTaskRequests/.
- Generated files start with a usable /goal command.
- Generated files include all Codex Goal Prompt Contract v2 sections.
- Generated files include Recommended Roles, Role Rationale, Human Decision Gates, Required Validation, Suggested Execution Route, Verdict Format Reminder, and Path-Scoped Rule Reminders.
- Generated files include mode-aware Scope and Execution Mode sections.
- Generated files include Human Decision Gates, Subagent Policy, Validation Plan, Stop Conditions, Completion Audit, and Required Return Format sections.
- /ai status and /ai active still work.
- No source files or workflow state docs are modified by running /ai prepare goal.
- _Temp outputs are ignored by Git.
```

Git validation:

```bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

---

## Relationship To Codex App Routing

`/ai prepare codex` remains the Codex App prompt-package command.

`/ai prepare goal` is the Codex CLI `/goal` request command.

Both commands write manual request files under `_Temp/AIWorkflowTaskRequests/`
and require the human to open and run the generated request manually.

# Discord Goal Task Routing Commands

## Purpose

WF-026 adds a Discord command for generating manual Codex CLI `/goal` request
markdown files from AIWorkflow tasks.

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

It then includes these sections:

```text
1. Objective
2. Context
3. Scope
4. Non-goals
5. Required safety constraints
6. Human decision gates
7. Validation plan
8. Stop conditions
9. Required return format
```

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

### implementation

The generated request asks Codex to implement only the approved reduced-scope
version of the selected task. It always includes `Do not commit.`

### prototype

The generated request asks Codex to create a reduced-scope proof of the
final-form architecture. It must not create disposable architecture that implies
a future rewrite.

### review

The generated request asks Codex to review the current diff and report bugs,
regressions, missing validation, and scope violations without editing files.

---

## Safety Restrictions

The Discord command must not:

```text
- Execute Codex CLI automatically.
- Execute OpenClaw.
- Execute Claude.
- Implement subagents.
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
- Generated files include Objective, Context, Scope, Non-goals, Required safety constraints, Human decision gates, Validation plan, Stop conditions, and Required return format.
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

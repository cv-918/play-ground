# Discord Codex Task Routing Commands

## Purpose

Release E / WF-025 adds a Discord command for generating manual Codex App task
request prompts from AIWorkflow tasks.

This release prepares prompt packages only. It does not execute Codex, Copilot,
computer-use, build/test commands, commits, pushes, or releases.

The command is available under:

```text
/ai prepare codex
```

---

## Command

### `/ai prepare codex`

Options:

```text
id: optional string
mode: optional choice
  analysis
  implementation
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

When `id` is supplied, it must pass strict validation:

```text
^(WF|GAME|DOC|VAL|UNITY)-[A-Za-z0-9_-]+$
```

The task is then resolved from:

```text
_Docs/AIWorkflow/Backlog.md
```

---

## Generated File Location

The command writes one markdown prompt file under:

```text
_Temp/AIWorkflowTaskRequests/
```

File name format:

```text
codex_request_<task_id>_<YYYYMMDD_HHMMSS>.md
```

`_Temp/` is ignored by Git and must remain untracked.

---

## Prompt Contents

Generated prompt files include:

```text
1. Execution Settings
2. Task
3. Project Context
4. Scope
5. Required Safety Constraints
6. Expected Output From Codex
7. Validation Checklist
8. Return Instructions
```

The project context is read from:

```text
_Docs/AIWorkflow/ActiveProject.json
_Docs/AIWorkflow/ProjectProfiles/<active-profile>.json
```

---

## Mode Behavior

### analysis

The generated prompt says:

```text
Analysis only. Do not modify files.
```

Use this for repository-aware scoping, risk analysis, likely file mapping, and
validation planning.

### implementation

The generated prompt allows file changes only within the approved task scope.

It always says:

```text
Do not commit.
```

Use this only after the human has accepted the task scope.

### review

The generated prompt says:

```text
Review current diff and identify risks. Do not modify files unless explicitly asked.
```

Use this for code-aware diff review after implementation.

---

## Context Behavior

### compact

Includes the task, active project id, key safety rules, and validation commands.

### standard

Includes the task, project profile summary, safety rules, expected output, and
validation checklist.

### full

Includes expanded workflow context:

```text
ActiveProject
ProjectProfile
relevant workflow docs list
active task metadata
backlog row
validation profiles
release target summary
```

---

## Safety Restrictions

The Discord command must not:

```text
- Execute Codex.
- Execute Copilot.
- Execute computer-use.
- Execute build/test commands.
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
recommended model
recommended reasoning level
generated file path
next manual steps
```

Recommended model:

```text
GPT-5.5 Thinking or strongest available Codex coding model
```

Recommended reasoning:

```text
high by default
medium allowed for P2/P3 tasks when context is compact
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
1. /ai prepare codex
2. /ai prepare codex id:GAME-001 mode:analysis context:standard
3. /ai prepare codex id:GAME-002 mode:implementation context:standard
4. /ai prepare codex id:WF-021 mode:review context:compact
5. /ai status
6. /ai active
```

Expected:

```text
- Each prepare command returns a generated file path under _Temp/AIWorkflowTaskRequests/.
- Generated files contain execution settings, task info, project context, safety constraints, expected output, and validation checklist.
- /ai status and /ai active still work.
- No source files or workflow state docs are modified by running /ai prepare codex.
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

## Acceptance Criteria

```text
[x] Slash command registration succeeds.
[x] Bot restarts successfully.
[x] /ai prepare codex works with active task default.
[x] /ai prepare codex id:GAME-001 mode:analysis context:standard works.
[x] /ai prepare codex id:GAME-002 mode:implementation context:standard works.
[x] /ai prepare codex id:WF-021 mode:review context:compact works.
[x] Generated files are created under _Temp/AIWorkflowTaskRequests/.
[x] Generated prompt includes recommended model and reasoning level.
[x] Generated prompt includes safety constraints.
[x] Generated prompt says "Do not commit."
[x] /ai status and /ai active still work.
[x] _Local/, node_modules/, _Temp/, .env, discord_bot.local.json are not tracked or staged.
[x] git diff --check passes.
```

---

## Validation Result

Release E / WF-025 live Discord validation passed on 2026-05-04.

Validated evidence:

```text
npm run register: passed
restart_bot.bat: passed
status_bot.bat running: passed
/ai prepare codex: passed
/ai prepare codex id:GAME-001 mode:analysis context:standard: passed
/ai prepare codex id:GAME-002 mode:implementation context:standard: passed
/ai prepare codex id:WF-021 mode:review context:compact: passed
/ai status: passed
/ai active: passed
generated files under _Temp/AIWorkflowTaskRequests: passed
git diff --check: passed
private files not tracked: passed
```

Generated prompt files are runtime artifacts under `_Temp/AIWorkflowTaskRequests/`
and must remain ignored by Git.

Manual bridge remains:

```text
Human opens the generated file and pastes/reviews it in Codex App.
```

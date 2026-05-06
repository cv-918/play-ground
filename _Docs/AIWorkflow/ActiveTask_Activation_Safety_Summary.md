# ActiveTask Activation Safety Summary

## 1. Purpose

WF-044 enhances `/ai task set-active` so selecting an ActiveTask also returns a
compact safety summary.

The command still performs the same state change as before:

```text
Backlog task id -> ActiveTask.md
```

It does not change the Backlog row status.

---

## 2. Response Contract

When `/ai task set-active id:<task_id>` succeeds, the Discord response includes:

```text
1. Active Task Updated
2. Task Summary
3. Recommended Roles
4. Human Decision Gates
5. Required Validation
6. Suggested Execution Route
7. Safety Note
8. Next Recommended Commands
```

Next recommended commands are suggestions only:

```text
/ai task approve id:<task_id> note:"..."
/ai role status
/ai prepare goal id:<task_id> mode:analysis context:standard
/ai status
/ai active
```

---

## 3. Safety Rules

`/ai task set-active` must not:

```text
auto-approve the task
execute Codex CLI
execute agents
mark the task done
commit
push
modify game source code
change the Backlog row status unless existing set-active behavior changes later
```

The command may write:

```text
_Docs/AIWorkflow/ActiveTask.md
_Temp/AIWorkflowDiscordBot/backups/
```

---

## 4. Implementation Shape

Responsibilities stay separated:

```text
commands/ai.js
  command dispatch

taskService.js
  ActiveTask write and backup behavior

activeTaskActivationService.js
  set-active orchestration plus role-router safety summary

roleRouterService.js
  role, gate, validation, route, and path reminder selection

responseFormatter.js
  Discord response formatting
```

---

## 5. Validation

Required local validation:

```bat
node --check tools\discord-orchestrator\src\commands\ai.js
node --check tools\discord-orchestrator\src\services\activeTaskActivationService.js
node --check tools\discord-orchestrator\src\services\responseFormatter.js
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Required Discord validation:

```text
/ai task set-active id:GAME-001
/ai task set-active id:<WF-044 task id>
/ai role status
/ai status
/ai active
```

Confirm the response includes roles, gates, validation, route, safety note, and
next commands, and that no approval, Codex, agents, done status, commit, push,
or game source modification occurs.

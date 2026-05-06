# Task Approval Safety Summary

## 1. Purpose

WF-045 enhances `/ai task approve` so approval returns a compact safety summary.

Approval means the Human Director accepts the bounded scope for the task. It is
not an execution command.

---

## 2. Response Contract

When `/ai task approve id:<task_id> note:"..."` succeeds, the Discord response
includes:

```text
1. Task Status Updated
2. Task Summary
3. Approval Summary
4. Recommended Roles
5. Human Decision Gates
6. Required Validation
7. Suggested Execution Route
8. Safety Note
9. Next Recommended Commands
```

Next recommended commands are suggestions only:

```text
/ai role status
/ai prepare goal id:<task_id> mode:analysis context:standard
/ai prepare goal id:<task_id> mode:implementation context:standard
/ai status
/ai active
```

---

## 3. Safety Rules

`/ai task approve` preserves existing behavior:

```text
Backlog status = ready_for_implementation
Backlog validation note = approved: <note>
ActiveTask.md is updated only when the approved task is already active
```

It must not:

```text
set ActiveTask automatically beyond existing status sync behavior
execute Codex CLI
execute agents
implement changes
mark the task done
commit
push
modify game source code
change unrelated Backlog fields
```

---

## 4. Implementation Shape

Responsibilities stay separated:

```text
commands/ai.js
  command dispatch

taskService.js
  Backlog and ActiveTask status update behavior

taskApprovalSafetyService.js
  approve orchestration plus role-router safety summary

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
node --check tools\discord-orchestrator\src\services\taskApprovalSafetyService.js
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
/ai task approve id:<WF-045 task id> note:"Human reviewed task approval safety summary scope."
/ai task approve id:GAME-001 note:"Human reviewed GAME-001 analysis scope only."
/ai role status
/ai status
/ai active
```

Confirm the response includes roles, gates, validation, route, safety note, and
next commands, and that no Codex, agents, done status, commit, push, or game
source modification occurs.

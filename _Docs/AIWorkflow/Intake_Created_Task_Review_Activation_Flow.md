# Intake-Created Task Review Activation Flow

## 1. Purpose

WF-043 adds a read-only review step for Backlog tasks created through natural
language intake.

Command:

```text
/ai task review-intake id:<task_id>
```

The command helps the Human Director decide whether to set a task active or
approve it. It does not make that decision automatically.

---

## 2. Behavior

The command:

1. Reads the Backlog task by id.
2. Checks whether the task appears to have been created by `/ai intake-create`.
3. Provides a generic activation review when no intake marker is found.
4. Reuses role router recommendation logic for roles, gates, validation,
   execution route, path-scoped reminders, and verdict guidance.
5. Suggests next manual commands without executing them.

Suggested commands shown in the response:

```text
/ai task set-active id:<task_id>
/ai task approve id:<task_id> note:"..."
/ai prepare goal id:<task_id> mode:analysis context:standard
```

---

## 3. Output Contract

The response includes:

```text
1. Task Summary
2. Intake Source Check
3. Activation Readiness
4. Recommended Roles
5. Human Decision Gates
6. Required Validation
7. Suggested Execution Route
8. Suggested Next Manual Commands
9. Safety Status
```

The response also includes verdict guidance from
`Review_Validation_Verdict_Format_v1.md`.

---

## 4. Safety

`/ai task review-intake` must not:

```text
write Backlog.md
write ActiveTask.md
approve a task
change task status
mark a task done
execute Codex
execute agents
modify game source files
commit
push
```

Unknown or invalid task ids return a clear error from the Backlog lookup path.

---

## 5. Validation

Required local validation:

```bat
node --check tools\discord-orchestrator\src\commands\ai.js
node --check tools\discord-orchestrator\src\services\intakeTaskReviewService.js
node --check tools\discord-orchestrator\src\services\responseFormatter.js
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Required behavior checks:

```text
Review an existing intake-created task id.
Review an existing non-intake task id.
Confirm unknown id returns a clear error.
Confirm Backlog.md is unchanged by review.
Confirm ActiveTask.md is unchanged by review.
Confirm no approval, status transition, agents, or Codex execution occurs.
```

# Goal Request Execution Readiness Summary

## 1. Purpose

WF-046 enhances `/ai prepare goal` responses with an execution readiness summary.

The generated markdown file remains a manual Codex CLI request. Discord does not
execute Codex CLI or agents.

---

## 2. Readiness States

Execution Readiness is one of:

```text
ready_for_manual_execution
needs_human_review
not_ready
```

Suggested classification:

- `ready_for_manual_execution`: task status is `ready_for_implementation` or
  `in_progress`, and no blocking state is present.
- `needs_human_review`: task status is `todo`, `partial_done`, `analysis`, or
  `review`; or implementation mode is requested for an unapproved task.
- `not_ready`: task status is `blocked`.

High-risk gates are called out in the readiness reason for Human Director review.

---

## 3. Response Contract

When `/ai prepare goal id:<task_id> mode:<mode> context:<context>` succeeds, the
Discord response includes:

```text
1. Goal Request Prepared
2. Task Summary
3. Execution Readiness
4. Approval Status
5. ActiveTask Status
6. Included Guidance
7. Human Decision Gates
8. Required Validation
9. Safety Note
10. Next Manual Action
```

Included Guidance confirms:

```text
Contract v2 included
role-aware routing included
path-scoped reminders included
validation plan included
completion audit included
```

---

## 4. Safety

`/ai prepare goal` may write only generated request files under:

```text
_Temp/AIWorkflowTaskRequests/
```

It must not:

```text
execute Codex CLI
execute agents
approve tasks
set ActiveTask
mark tasks done
commit
push
modify game source code
modify Backlog.md
modify ActiveTask.md
```

---

## 5. Validation

Required local validation:

```bat
node --check tools\discord-orchestrator\src\services\goalReadinessService.js
node --check tools\discord-orchestrator\src\services\goalPromptService.js
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
/ai prepare goal id:WF-046 mode:analysis context:standard
/ai prepare goal id:WF-046 mode:implementation context:standard
/ai prepare goal id:GAME-001 mode:analysis context:standard
/ai role status
/ai status
/ai active
```

Generated files should still include Contract v2 sections, Role Router
Recommendations, Path-Scoped Rule Reminders, Validation Plan, and Completion
Audit.

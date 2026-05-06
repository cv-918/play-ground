# Role-Aware Goal Prompt Injection

## 1. Purpose

WF-038 extends `/ai prepare goal` so generated `goal_request_*.md` files include
role router recommendations for the selected task.

The generated prompt remains a manual Codex CLI `/goal` request. Discord still
does not execute Codex CLI, execute agents, approve tasks, mark tasks done,
commit, push, release, or modify game source code.

---

## 2. Generated Sections

Each generated goal request includes a supplemental `Role Router
Recommendations` block with these subsections:

```text
Recommended Roles
Role Rationale
Human Decision Gates
Required Validation
Suggested Execution Route
Verdict Format Reminder
Path-Scoped Rule Reminders
```

This block supplements Codex Goal Prompt Contract v2. It does not replace the
required Contract v2 sections.

---

## 3. Routing Source

The Discord goal prompt service calls `roleRouterService` with the selected
Backlog task after task resolution.

This keeps responsibilities separated:

```text
command dispatch: commands/ai.js
task loading: taskService.js
role routing: roleRouterService.js
goal prompt generation: goalPromptService.js
Discord response formatting: responseFormatter.js
```

The existing `/ai role status` command continues to use the read-only local
`role_router_status.bat --json` path for the current ActiveTask.

---

## 4. Safety Rules

Role-aware injection must not:

```text
execute agents
execute Codex CLI
auto-approve tasks
mark tasks done
modify game source code
modify _Local/
modify node_modules/
expose secrets
commit
push
```

The only file write performed by `/ai prepare goal` remains the generated
markdown request under:

```text
_Temp/AIWorkflowTaskRequests/
```

---

## 5. Validation Expectations

Required validation for WF-038:

```bat
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
tools\aiworkflow\role_router_status.bat
tools\aiworkflow\role_router_status.bat --json
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Discord smoke tests:

```text
/ai prepare goal id:GAME-001 mode:analysis context:standard
/ai prepare goal id:WF-037 mode:review context:compact
/ai role status
/ai status
/ai active
```

Generated request files should include all required role-aware subsections and
still start with a usable first-line `/goal` command.

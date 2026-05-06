# Path Rule Checklist Goal Prompt Injection

## 1. Purpose

WF-039 extends `/ai prepare goal` so generated `goal_request_*.md` files include
concrete path-scoped review and validation reminders.

The generated prompt remains a manual Codex CLI `/goal` request. Discord still
does not execute Codex CLI, execute agents, approve tasks, mark tasks done,
commit, push, release, modify game source code, or expose local configuration.

---

## 2. Generated Section

Each generated goal request includes a supplemental section:

```text
Path-Scoped Rule Reminders
```

The section lists the policy source, selection inputs, matched path scopes, and
checkbox reminders for review and validation.

This section supplements Codex Goal Prompt Contract v2 and the WF-038 role-aware
routing block. It does not replace any required Contract v2 section.

---

## 3. Selection Source

The Discord goal prompt service resolves the selected task, asks
`roleRouterService` for role-aware guidance, and asks
`pathRuleReminderService` for path-scoped checklist reminders.

Responsibilities remain separated:

```text
command dispatch: commands/ai.js
task loading: taskService.js
role routing: roleRouterService.js
path-rule selection: pathRuleReminderService.js
goal prompt generation: goalPromptService.js
Discord response formatting: responseFormatter.js
```

Path-rule selection uses likely task scope from task id/category, kind,
workflow path, task title, task reason, tool route, validation text, and active
task metadata.

---

## 4. Covered Path Scopes

Reduced-scope WF-039 coverage includes:

```text
PlayGround/Project/Gameplay/**
PlayGround/Project/EngineSystems/**
PlayGround/Data/**
PlayGround/Data/Resources/**
tools/aiworkflow/**
tools/discord-orchestrator/**
_Docs/AIWorkflow/**
_DevLog/**
AGENTS.md
README.md
.editorconfig
.gitattributes
```

If no specific scope is inferred, the generated prompt still includes global
path safety reminders for diff scope, forbidden paths, validation evidence, and
commit safety.

---

## 5. Safety Rules

Path-rule checklist injection must not:

```text
execute agents
execute Codex CLI
auto-approve tasks
mark tasks done
modify game source code
modify PlayGround/Data unless separately approved
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

## 6. Validation Expectations

Required validation for WF-039:

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
/ai prepare goal id:WF-038 mode:review context:compact
/ai role status
/ai status
/ai active
```

Generated request files should include:

```text
Codex Goal Prompt Contract v2 sections
Role Router Recommendations
Path-Scoped Rule Reminders
concrete path-specific checklist items
```

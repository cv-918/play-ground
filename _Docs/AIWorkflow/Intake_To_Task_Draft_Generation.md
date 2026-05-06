# Intake To Task Draft Generation

## 1. Purpose

WF-041 extends `/ai intake` so natural-language requests produce a structured
Task Draft suitable for human review and later manual task creation.

The feature remains read-only.

---

## 2. Scope

`/ai intake` remains the main command. No new command option is required for the
reduced-scope implementation.

The command returns:

```text
AI Task Intake Suggestion
Task Draft
Read-only Safety
```

---

## 3. Task Draft Fields

Each response includes these draft fields:

```text
title
category
priority
kind
reason
suggested risk
workflow path
recommended roles
human decision gates
required validation
suggested next manual action
```

The draft is intended to be reviewed and edited by the human before any task
creation command is used.

---

## 4. Safety Rules

Task draft generation must not:

```text
create a Backlog task automatically
update ActiveTask.md
update Backlog.md
approve anything automatically
execute agents
execute Codex CLI
commit
push
modify game source code
modify PlayGround/Data
modify _Local/
modify node_modules/
expose secrets
```

---

## 5. Validation

Run from repository root:

```bat
node --check tools\discord-orchestrator\src\services\taskIntakeService.js
node --check tools\discord-orchestrator\src\services\responseFormatter.js
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Discord smoke tests:

```text
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
/ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어"
/ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어"
/ai status
/ai active
```

Expected:

- `/ai intake` still works.
- Each intake response includes a Task Draft section.
- Task Draft includes all required fields.
- No Backlog task is created automatically.
- ActiveTask is not changed by intake.
- No agents or Codex CLI are executed.
- No game source, data, private/local, or dependency files are modified.

# Discord Task Intake Command

## 1. Purpose

WF-040 adds a read-only Discord task intake prototype:

```text
/ai intake
```

The command accepts a natural-language work request and returns a structured
AIWorkflow task suggestion. It does not create, approve, activate, execute, or
commit anything.

---

## 2. Command

```text
/ai intake text:<natural-language work request>
```

Required input:

```text
text
```

`text` is a natural-language request from the human developer.

---

## 3. Output Contract

The Discord response includes:

```text
1. Interpreted Request
2. Suggested Task Title
3. Suggested Category
4. Suggested Kind
5. Suggested Priority/Risk
6. Suggested Workflow Path
7. Recommended Roles
8. Human Decision Gates
9. Required Validation
10. Suggested Execution Route
11. Suggested Next Manual Action
```

The response also states read-only safety:

```text
No Backlog task was created.
ActiveTask.md was not updated.
No agents or Codex CLI were executed.
```

---

## 4. Classification Rules

Category selection:

- `GAME`: gameplay, runtime behavior, combat, stage, skill, enemy, player,
  scene, dialogue, reward, save, UI, or UserData unless clearly workflow-related.
- `WF`: Discord bot, Codex, goal prompt, role router, automation, script,
  workflow, Backlog, ActiveTask, or orchestrator.
- `UNITY`: Unity, Unity project, Steam, Google Play, build profile, validation
  profile, or porting.
- `DOC`: docs, README, guide, policy, instructions, or source of truth.
- `VAL`: validation, smoke test, QA, runtime test, semantic check, or
  regression check.

Kind selection:

- `documentation`: docs, policy, or guide work.
- `automation`: Discord, scripts, or workflow tools.
- `validation`: test, check, or evidence work.
- `data`: JSON, schema, or data integrity work.
- `refactoring`: structure cleanup without feature behavior expansion.
- `implementation`: feature or runtime behavior changes.
- `maintenance`: cleanup, warnings, line endings, or dependency upkeep.
- `prototype`: isolated experiments.

Priority/risk selection:

- `P0`: blocking critical game/workflow progress or corrupting save/data.
- `P1`: important workflow/game infrastructure or high-leverage work.
- `P2`: useful but not blocking.
- `P3`: optional cleanup or later-stage work.
- `high` risk: schema/save/runtime/external tools/computer-use/destructive
  commands.
- `medium` risk: source behavior or workflow command behavior changes.
- `low` risk: documentation-only or read-only analysis.

---

## 5. Role And Path Guidance

The intake service builds a synthetic task suggestion and reuses
`roleRouterService` for role, gate, validation, and route guidance.

It also includes path-scoped reminders when the request implies:

```text
PlayGround/Data/**
PlayGround/Project/Gameplay/**
tools/discord-orchestrator/**
tools/aiworkflow/**
_Docs/AIWorkflow/**
```

---

## 6. Safety Rules

`/ai intake` must not:

```text
create Backlog tasks automatically
update ActiveTask.md
update Backlog.md
approve tasks automatically
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

The command only formats a suggestion into the Discord response.

---

## 7. Validation

Run from repository root:

```bat
node --check tools\discord-orchestrator\src\commands\ai.js
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

- `/ai intake` is registered.
- `/ai intake` returns a structured task suggestion.
- `/ai intake` does not create tasks automatically.
- `/ai intake` does not modify Backlog.md or ActiveTask.md.
- Output includes category, kind, priority/risk, recommended roles, human
  gates, validation, and next manual action.
- No agents are executed.
- No game source files are modified.
- No private/local files are tracked.

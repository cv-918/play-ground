# Discord Task Intake Command

## 1. Purpose

WF-040 adds a read-only Discord task intake prototype. WF-041 extends the same
flow with a structured Task Draft section for manual review. WF-042 adds an
explicit human-invoked creation command that can append the draft as a Backlog
task. WF-043 adds a read-only review step for created Backlog tasks before the
human decides whether to activate or approve them:

```text
/ai intake
/ai intake-create
/ai task review-intake
```

The command accepts a natural-language work request and returns a structured
AIWorkflow task suggestion and task draft. The current implementation is
keyword/rule-based. It does not call an LLM and does not inspect repository
context. `/ai intake` does not create, approve, activate, execute, or commit
anything. `/ai intake-create` is the explicit write command for creating a
Backlog task from the same intake logic.

---

## 2. Command

```text
/ai intake text:<natural-language work request>
/ai intake-create text:<natural-language work request>
/ai task review-intake id:<task_id>
```

Required input:

```text
text
```

`text` is a natural-language request from the human developer.

Command distinction:

- `/ai intake` is read-only and only returns the suggestion and Task Draft.
- `/ai intake-create` creates one Backlog task after explicit invocation.
- `/ai intake-create` does not set ActiveTask, approve the task, execute
  agents, execute Codex CLI, commit, or push.
- `/ai task review-intake` is read-only and only reviews activation readiness
  plus suggested next manual commands.

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

WF-041 also adds:

```text
Task Draft
```

Task Draft fields:

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

The read-only response also states safety:

```text
No Backlog task was created.
ActiveTask.md was not updated.
No agents or Codex CLI were executed.
```

---

## 4. Classification Rules

Current v1 classification is deterministic and local:

```text
input text
-> keyword/rule matching
-> category/kind/priority/risk suggestion
-> role router recommendation
-> path-scoped reminder selection
-> Discord response formatting
```

It is not semantic LLM interpretation. Ambiguous or multi-part requests should
be reviewed by the Human Director, ChatGPT, or Codex App before Backlog creation.

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

`/ai intake-create` may write only:

```text
_Docs/AIWorkflow/Backlog.md
_Temp/AIWorkflowDiscordBot/backups/
```

It must preserve the same restrictions for ActiveTask, approval, agents, Codex
CLI, commits, pushes, game source, private files, and dependencies.

`/ai task review-intake` must not write any workflow state. It may read
Backlog.md and return:

```text
Task Summary
Intake Source Check
Activation Readiness
Recommended Roles
Human Decision Gates
Required Validation
Suggested Execution Route
Suggested Next Manual Commands
Safety Status
```

---

## 7. Task Draft Usage

The Task Draft is a manual review aid. The human may copy or adapt the draft
into a later approved task creation step such as:

```text
/ai task create title:<edited title> category:<category> priority:<priority> kind:<kind> reason:<edited reason>
/ai intake-create text:<natural-language work request>
/ai task review-intake id:<created task id>
```

The draft is not automatically written to Backlog.md or ActiveTask.md by
`/ai intake`. `/ai intake-create` writes Backlog.md only because the user
explicitly invoked the creation command.

---

## 8. Future LLM-assisted Intake Boundary

A future LLM-assisted intake path may be added to improve natural-language
understanding, task splitting, missing-question detection, and validation
planning.

The intended boundary is:

```text
LLM:
  returns a TaskDraft JSON candidate only

Local harness:
  validates the TaskDraft schema
  compares the LLM draft with the current rule-based classifier
  flags mismatches or high-risk scope for human review
  formats the Discord response

Human Director:
  decides whether to create, edit, activate, approve, execute, mark done, or commit
```

LLM-assisted intake must not:

```text
write Backlog.md directly
update ActiveTask.md
approve a task
execute Codex, agents, Copilot, or local commands
mark a task done
commit or push
hide rule-based/LLM mismatches from the human
```

If an LLM call fails, is disabled, or returns invalid JSON, the command should
fall back to the existing rule-based intake or return a clear read-only failure.

---

## 9. Validation

Run from repository root:

```bat
node --check tools\discord-orchestrator\src\commands\ai.js
node --check tools\discord-orchestrator\src\services\intakeTaskCreationService.js
node --check tools\discord-orchestrator\src\services\intakeTaskReviewService.js
node --check tools\discord-orchestrator\src\services\taskIntakeService.js
node --check tools\discord-orchestrator\src\services\taskService.js
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
/ai intake-create text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
/ai task review-intake id:<intake-created task id>
/ai task review-intake id:GAME-001
/ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어"
/ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어"
/ai task list
/ai status
/ai active
```

Expected:

- `/ai intake` is registered.
- `/ai intake` returns a structured task suggestion.
- `/ai intake` response includes a Task Draft section.
- `/ai intake` does not create tasks automatically.
- `/ai intake` does not modify Backlog.md or ActiveTask.md.
- `/ai intake-create` creates one Backlog task only when explicitly invoked.
- `/ai intake-create` creates a timestamped Backlog backup before writing.
- `/ai intake-create` escapes markdown table pipes in generated Backlog cells.
- `/ai intake-create` does not modify ActiveTask.md and does not approve the
  created task.
- `/ai task review-intake` outputs activation readiness and suggested next
  manual commands.
- `/ai task review-intake` does not modify Backlog.md, ActiveTask.md, approval
  state, or task status.
- Output includes category, kind, priority/risk, recommended roles, human
  gates, validation, and next manual action.
- Task Draft includes title, category, priority, kind, reason, suggested risk,
  workflow path, roles, gates, validation, and next manual action.
- No agents are executed.
- No game source files are modified.
- No private/local files are tracked.

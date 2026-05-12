# Discord Task Intake Command

## 1. Purpose

WF-040 added a read-only Discord task intake prototype. WF-041 extended the same
flow with a structured Task Draft section for manual review. WF-042 added an
explicit human-invoked creation command that can append the draft as a Backlog
task. WF-043 added a read-only review step for created Backlog tasks before the
human decides whether to activate or approve them. WF-20260511-000002 upgrades
the intake layer to Codex CLI-backed LLM-assisted TaskDraft generation with
local schema validation, rule-based cross-check, and direct Backlog task
creation from `/ai intake`:

```text
/ai intake
/ai intake-preview
/ai intake-test
/ai intake-engine status
/ai task review-intake
```

The command accepts a natural-language work request, asks local `codex exec` for
a structured TaskDraft JSON object, validates it locally, cross-checks it against
the deterministic rule-based baseline, and creates one Backlog task. `/ai
intake` is now the no-paste automation path. `/ai intake-preview` keeps the old
read-only preview behavior. The previous `/ai intake-create` compatibility
alias has been removed from the registered Discord command surface; use
`/ai intake` for Backlog task creation. `/ai intake-test` renders the
task-created response shape with sample data only.

---

## 2. Command

```text
/ai intake text:<natural-language work request>
/ai intake-preview text:<natural-language work request>
/ai intake-test validation-count:<optional sample count>
/ai intake-engine status
/ai task review-intake id:<task_id>
```

Required input:

```text
text
```

`text` is a natural-language request from the human developer.

Command distinction:

- `/ai intake` creates one Backlog task from a validated Codex CLI TaskDraft.
- `/ai intake-preview` is read-only and only returns the suggestion and TaskDraft.
- `/ai intake-test` is read-only and only renders the intake task-created
  response format with sample data.
- `/ai intake` may auto-handoff low-risk DOC/VAL tasks into ActiveTask,
  approval, and PC Runner start when deterministic policy allows it.
- `/ai intake` does not mark tasks done, commit, push, or directly modify
  source/data files.
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
clarifying questions
confidence
```

The `/ai intake` creation response also states safety:

```text
Backlog task was created.
ActiveTask.md was not updated.
No agents or implementation Codex run was executed.
```

It also shows:

```text
LLM intake status
rule-based cross-check summary
clarifying questions when the request is ambiguous
```

---

## 4. Classification Rules

Current classification is LLM-assisted when configured:

```text
input text
-> local keyword/rule baseline
-> Codex CLI `codex exec` TaskDraft JSON candidate
-> local TaskDraft schema validation
-> strict local structural validation
-> rule-based baseline cross-check
-> role router recommendation and path-scoped reminders
-> Backlog task creation for /ai intake or Discord response formatting for /ai intake-preview
```

If Codex CLI is disabled, unavailable, unauthenticated, times out, refuses, or
returns invalid schema/JSON, `/ai intake` fails clearly and does not write
Backlog. The deterministic rule-based draft is still used as a baseline and
cross-check. It is not used as a silent write fallback by default.

The TaskDraft schema is enforced twice:

- Codex CLI receives the JSON schema through `--output-schema`.
- The local harness validates the returned object again before any Backlog write.

The local validator rejects:

- fields outside the TaskDraft contract
- missing required fields
- empty required text fields
- non-array role/gate/validation/question fields
- empty required role/gate/validation arrays
- non-string or blank array items
- duplicate array items
- non-numeric confidence values
- category, priority, risk, or kind values outside the allowlist

Schema validation is intentionally stricter than friendly response formatting.
If the LLM returns a plausible-looking but structurally loose draft, `/ai
intake` must fail clearly instead of silently repairing it into workflow state.
The Codex CLI `--output-schema` contract only contains keywords supported by the
current Codex structured-output API; stricter duplicate checks are enforced by
the local validator after JSON is returned.

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
update ActiveTask.md
approve tasks automatically
execute agents
execute implementation Codex runs
commit
push
modify game source code
modify PlayGround/Data
modify _Local/
modify node_modules/
expose secrets
```

The command may write only:

```text
_Docs/AIWorkflow/Backlog.md
_Temp/AIWorkflowDiscordBot/backups/
_Temp/AIWorkflowDiscordBot/intake/
```

The Codex CLI call used by `/ai intake` is limited to TaskDraft generation. It is
not an implementation execution path.

`/ai intake-preview` must not write workflow state. It may write only temporary
intake diagnostics under:

```text
_Temp/AIWorkflowDiscordBot/intake/
```

The removed `/ai intake-create` alias is no longer registered. Use `/ai intake`
for Backlog task creation.

`/ai intake-test` must not call Codex CLI, write Backlog, update ActiveTask,
approve tasks, execute agents, commit, push, or modify source files. It exists
only to verify the Discord response layout with sample data.

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

The TaskDraft is generated by Codex CLI and validated locally. `/ai intake`
turns the validated draft into a Backlog task immediately so the user's only
intake action is the original Discord command.

```text
/ai intake text:<natural-language work request>
/ai task review-intake id:<created task id>
```

For read-only inspection, use:

```text
/ai intake-preview text:<natural-language work request>
```

---

## 8. LLM-assisted Intake Boundary

The LLM-assisted intake path improves natural-language understanding, task
splitting hints, missing-question detection, and validation planning.

The boundary is:

```text
LLM:
  returns a TaskDraft JSON candidate only

Local harness:
  validates the TaskDraft schema
  compares the LLM draft with the rule-based classifier
  flags mismatches or high-risk scope for human review
  creates one Backlog task for /ai intake
  formats the Discord response

Human Director:
  decides whether to edit, activate, approve, execute, mark done, or commit
```

LLM-assisted intake must not:

```text
auto-handoff tasks when policy says human approval is required
execute implementation Codex, agents, Copilot, or local commands outside the PC Runner contract
mark a task done
commit or push
hide rule-based/LLM mismatches from the human
```

If the Codex CLI intake call fails, is disabled, or returns invalid JSON/schema,
`/ai intake` returns a clear failure and does not write Backlog. Rule-based
fallback may be enabled for preview/debug use, but it is not the default write
path.

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
/ai intake text:"UserData가 이상할 때 기본값으로 복구되게 하고 싶어"
/ai task review-intake id:<intake-created task id>
/ai task review-intake id:GAME-001
/ai intake text:"Codex goal prompt에 검증 조건이 자동으로 더 잘 들어가면 좋겠어"
/ai intake text:"Unity로 포팅할 때 필요한 검증 프로필을 정리하고 싶어"
/ai intake-test validation-count:31
/ai task list
/ai status
/ai active
```

Expected:

- `/ai intake` is registered.
- `/ai intake` creates one Backlog task from a validated Codex CLI TaskDraft.
- `/ai intake` response includes a TaskDraft summary and LLM status.
- `/ai intake-preview` returns a structured task suggestion without Backlog or
  ActiveTask changes.
- `/ai intake-test` renders the intake task-created response format without
  Backlog changes or Codex CLI execution.
- `/ai intake` creates a timestamped Backlog backup before writing.
- `/ai intake` escapes markdown table pipes in generated Backlog cells.
- `/ai intake` does not modify ActiveTask.md and does not approve the
  created task.
- `/ai intake-engine status` reports Codex CLI intake readiness.
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

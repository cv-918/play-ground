# AIWorkflow Milestone 1 Output Consolidation

## Purpose

WF-048 consolidates the Milestone 1 Discord orchestration outputs after the
first regular loop reached `/ai result audit`.

The workflow was functionally safe, but regular operation had become too
verbose because role routing, approval gates, validation expectations, safety
notes, and next commands were repeated across multiple steps.

WF-048 is consolidation only. It does not add commands, remove commands, change
task state semantics, execute Codex, execute agents, mark tasks done, commit, or
modify game source/data files.

---

## Regular Path

Use this path for normal AIWorkflow operation:

```text
1. /ai intake
2. /ai intake-create or /ai task create
3. /ai task set-active
4. /ai task approve
5. /ai prepare goal
6. Manual Codex execution outside Discord
7. /ai result audit
8. /ai task done
9. Manual commit decision
```

Regular path responses should be short enough to read in Discord without
scrolling through repeated policy blocks.

---

## Optional / Debug / Admin Path

These commands remain available, but they are not required for the regular flow:

```text
/ai role status
/ai task review-intake
/ai run workflow-status
/ai run active-project
/ai run project-profile
/ai prepare codex
```

Use them when:

- routing detail is needed beyond the compact regular response
- an intake-created task needs extra activation review
- a local workflow script result needs to be inspected directly
- a Codex App prompt package is needed instead of a Codex CLI `/goal` request

---

## Output Consolidation Rules

`/ai task set-active` should show:

- selected task id/title/status
- short safety note
- next recommended commands
- pointer to `/ai role status`, `/ai task approve`, and `/ai prepare goal`

It should not repeat full roles, gates, validation, or execution route in the
regular response.

`/ai task approve` should show:

- approval status
- task id/title/status
- short safety note
- next recommended commands
- pointer to `/ai prepare goal` and optional `/ai role status`

It should not repeat full roles, gates, validation, or execution route in the
regular response.

`/ai prepare goal` should show:

- generated request confirmation
- task id/title
- mode/context
- readiness verdict
- generated path
- next manual action
- safety note that Discord did not execute Codex

Detailed role, path-rule, validation, and completion guidance belongs in the
generated `goal_request_*.md` file, not in the Discord response.

---

## Generated Goal Request Policy

Generated goal requests still preserve Codex Goal Prompt Contract v2:

```text
Goal Header
Objective
Task Context
Project Context
Scope
Non-goals
Execution Mode
Safety Constraints
Human Decision Gates
Subagent Policy
Validation Plan
Stop Conditions
Completion Audit
Required Return Format
```

WF-048 reduces token cost by:

- avoiding repeated safety wording across sections
- using compact role and execution-route summaries
- limiting path-rule checklist items to relevant task scopes
- keeping full detail only for `context:full`
- avoiding unrelated policy blocks in regular generated requests

---

## Non-Goals

WF-048 does not:

- add new Discord commands
- remove existing Discord commands
- change Backlog or ActiveTask write behavior
- change approval, active, done, block, or defer state semantics
- execute Codex CLI
- execute agents
- auto-approve, auto-done, auto-commit, or push
- modify PlayGround source or data
- modify `_Local/` or `node_modules/`

---

## Validation Expectations

Required validation for implementation:

```text
node --check for changed JS files
npm --prefix tools/discord-orchestrator run register
tools/discord-orchestrator/restart_bot.bat
tools/discord-orchestrator/status_bot.bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Discord smoke tests:

```text
/ai task set-active id:<WF-048 task id>
/ai task approve id:<WF-048 task id> note:"Human reviewed output consolidation scope."
/ai prepare goal id:<WF-048 task id> mode:analysis context:standard
/ai prepare goal id:GAME-001 mode:analysis context:standard
/ai role status
/ai status
/ai active
```

Expected result:

- set-active response is shorter than before
- approve response is shorter than before
- prepare goal Discord response is compact but useful
- generated goal request still contains Contract v2, role-aware, path-rule,
  validation, and completion audit guidance
- no game source or data files are modified
- no private/local files are tracked


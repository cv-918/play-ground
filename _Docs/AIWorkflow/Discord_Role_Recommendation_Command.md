# Discord Role Recommendation Command

## Purpose

WF-037 exposes the local AIWorkflow role router recommendation through Discord.

The command is available under:

```text
/ai role status
```

It displays the current ActiveTask role routing recommendation without executing
agents or changing workflow state.

---

## Command

### `/ai role status`

Options:

```text
none
```

Data source:

```text
tools/aiworkflow/role_router_status.bat --json
```

The command reads the same local policy and state files as the role router
script, including:

```text
_Docs/AIWorkflow/Agent_Role_Registry_v1.md
_Docs/AIWorkflow/Role_Router_Rules_v1.md
_Docs/AIWorkflow/Review_Validation_Verdict_Format_v1.md
_Docs/AIWorkflow/Path_Scoped_Rule_Mapping_DustLand_v1.md
_Docs/AIWorkflow/ActiveTask.md
_Docs/AIWorkflow/Backlog.md
```

---

## Discord Response

The response includes:

```text
1. Active Task
2. Recommended Roles
3. Role Rationale
4. Human Decision Gates
5. Required Validation
6. Suggested Execution Route
7. Verdict Format
8. Next Manual Action
```

The response is formatted for Discord and truncated by the existing Discord
response length limit if needed.

---

## Architecture

Responsibilities remain separated:

```text
commands/ai.js
  Registers /ai role status and routes the interaction.

services/roleRouterService.js
  Runs the existing read-only role_router_status.bat --json script and parses JSON.

services/responseFormatter.js
  Formats the recommendation into a compact Discord message.

tools/aiworkflow/role_router_status.bat
  Owns local role routing recommendation logic.
```

The Discord command does not duplicate role routing policy logic.

---

## Safety Restrictions

The command must not:

```text
- Execute agents.
- Execute Codex CLI.
- Execute Copilot.
- Execute OpenClaw.
- Execute Claude.
- Auto-approve tasks.
- Mark tasks done.
- Modify game source files.
- Modify _Docs/AIWorkflow/ActiveTask.md.
- Modify _Docs/AIWorkflow/Backlog.md.
- Modify _Local/.
- Modify node_modules/.
- Expose Discord tokens or local secrets.
- Commit.
- Push.
- Release.
```

Allowed behavior:

```text
- Read AIWorkflow policy/state documents through the existing local role router script.
- Return a Discord summary of the role recommendation.
```

---

## Validation Commands

Run from repository root:

```bat
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
```

Discord validation:

```text
1. /ai role status
2. /ai status
3. /ai active
```

Local checks:

```bat
tools\aiworkflow\role_router_status.bat
tools\aiworkflow\role_router_status.bat --json
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

Expected:

```text
- /ai role status is registered.
- /ai role status returns current ActiveTask role recommendation.
- The response includes all eight required sections.
- No agents are executed.
- No task is approved or marked done.
- No game source files are modified.
- No private/local files are tracked.
- git diff --check passes.
```

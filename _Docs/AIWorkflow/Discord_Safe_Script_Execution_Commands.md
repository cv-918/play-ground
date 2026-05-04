# Discord Safe Script Execution Commands

## Purpose

Release D / WF-024 adds controlled Discord commands for running allowlisted local
AIWorkflow helper scripts.

These commands are available under:

```text
/ai run
```

This is not arbitrary shell execution. Discord users cannot provide script paths,
raw command strings, or raw argument lists.

---

## Safety Scope

Allowed script keys:

```text
workflow-status
active-project
project-profile
json-smoke
capture-diff
```

Allowed scripts:

```text
tools/aiworkflow/workflow_status.bat --json
tools/aiworkflow/active_project_status.bat --json
tools/aiworkflow/project_profile_status.bat --json
tools/aiworkflow/project_profile_status.bat --project <validated-id> --json
tools/aiworkflow/json_smoke_check.bat
tools/aiworkflow/capture_diff.bat
tools/aiworkflow/capture_diff.bat --include-untracked
```

Forbidden operations:

```text
- Do not accept user-provided script paths.
- Do not accept arbitrary args.
- Do not execute arbitrary shell commands.
- Do not expose direct npm, git, Codex, Copilot, build, test, game runtime, commit, push, or release commands.
- Do not modify game source code.
- Do not write `_Local/`.
- Do not write `node_modules/`.
- Do not expose or print the Discord bot token.
```

The service layer uses a script registry/allowlist. `commands/ai.js` performs
Discord command routing only. Script execution and output formatting are handled
by focused service/formatter modules.

---

## Commands

### `/ai run workflow-status`

Runs:

```text
tools/aiworkflow/workflow_status.bat --json
```

Shows:

```text
active task id/title/status
backlog open/blocked count
git dirty state
```

This command is read-only.

### `/ai run active-project`

Runs:

```text
tools/aiworkflow/active_project_status.bat --json
```

Shows:

```text
active_project_id
profile_path
validation passed/failed
issues, if any
```

This command is read-only.

### `/ai run project-profile`

Runs:

```text
tools/aiworkflow/project_profile_status.bat --json
```

When `id` is supplied, runs:

```text
tools/aiworkflow/project_profile_status.bat --project <id> --json
```

The `id` option is validated with the existing project id validator before it is
converted into allowlisted script arguments.

Shows:

```text
project_id
display_name
engine
project_type
resolved_from_active_project
```

This command is read-only.

### `/ai run json-smoke`

Runs:

```text
tools/aiworkflow/json_smoke_check.bat
```

Shows:

```text
pass/fail
total count, if parseable
failed count, if parseable
report path, if printed
last relevant output lines
```

This command is allowed validation execution. It may write reports under:

```text
_Temp/AIWorkflowReports/
```

It must not modify source files.

### `/ai run capture-diff`

Runs:

```text
tools/aiworkflow/capture_diff.bat
```

Optional option:

```text
include-untracked
```

When `include-untracked:true` is supplied, runs:

```text
tools/aiworkflow/capture_diff.bat --include-untracked
```

Shows:

```text
mode
status path
diff path
check path
whether include-untracked was used
last relevant output lines
```

This command may write files under:

```text
_Temp/AIWorkflowDiffs/
```

Use `include-untracked:true` only with explicit approval because the underlying
script may mark untracked files with intent-to-add.

---

## Architecture Notes

Responsibilities are separated as follows:

```text
commands/ai.js
  Discord command registration and routing

services/scriptRunService.js
  allowlisted script registry, validated option-to-argument mapping, execution orchestration

services/commandRunner.js
  constrained .bat execution under tools/aiworkflow

services/responseFormatter.js
  Discord response formatting and safe truncation
```

No Discord command exposes arbitrary command strings, script paths, or raw args.

Release E task routing prompt generation is documented separately:

```text
_Docs/AIWorkflow/Discord_Codex_Task_Routing_Commands.md
```

---

## Validation Commands

Run from repository root:

```bat
cd /d C:\Users\kalux\workStation\play-ground
npm --prefix tools\discord-orchestrator run register
tools\discord-orchestrator\restart_bot.bat
tools\discord-orchestrator\status_bot.bat
```

Discord validation:

```text
1. /ai run workflow-status
2. /ai run active-project
3. /ai run project-profile
4. /ai run project-profile id:unity_project_template
5. /ai run json-smoke
6. /ai run capture-diff
7. /ai run capture-diff include-untracked:false
8. /ai status
9. /ai active
```

Do not run `include-untracked:true` during normal validation unless explicitly
approved.

Git validation:

```bat
git status --short
git diff --check
git diff --stat
git ls-files | findstr /I "_Local node_modules .env discord_bot.local.json"
```

---

## Acceptance Criteria

```text
[x] Slash command registration succeeds.
[x] Bot restarts successfully.
[x] Bot status script shows running.
[x] /ai run workflow-status works.
[x] /ai run active-project works.
[x] /ai run project-profile works with active project default.
[x] /ai run project-profile id:unity_project_template works.
[x] /ai run json-smoke works.
[x] json-smoke reports Total 11, Failed 0.
[x] /ai run capture-diff works in default mode.
[ ] /ai run capture-diff include-untracked:true intentionally not validated.
[x] /ai status and /ai active still work.
[x] No arbitrary script/command path is exposed.
[x] _Local/, node_modules/, _Temp/, .env, discord_bot.local.json are not tracked or staged.
[x] git diff --check passes.
```

---

## Validation Result

Release D / WF-024 live Discord validation passed on 2026-05-04.

```text
npm run register: passed
restart_bot.bat: passed
status_bot.bat running: passed
/ai run workflow-status: passed
/ai run active-project: passed
/ai run project-profile: passed
/ai run project-profile id:unity_project_template: passed
/ai run json-smoke: passed
json-smoke Total 11 Failed 0: passed
/ai run capture-diff: passed
capture-diff default mode: passed
/ai status: passed
/ai active: passed
git diff --check: passed
private files not tracked: passed
```

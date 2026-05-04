# 2026-05-04 Discord Safe Script Execution Commands

## Summary

Implemented and finalized Release D / WF-024 Discord `/ai run` commands for
allowlisted AIWorkflow helper scripts.

## Background

Release A established always-on Discord operation. Release B added task
management commands. Release C added task approval/status commands. Release D
adds controlled workflow-support script execution without exposing arbitrary shell
execution.

## Scope

Added:

```text
/ai run workflow-status
/ai run active-project
/ai run project-profile
/ai run json-smoke
/ai run capture-diff
```

Excluded:

```text
Codex execution
Copilot execution
project selection writes
computer-use
build/test execution
commit/push/release
arbitrary shell execution
game source changes
```

## Files Changed

```text
tools/discord-orchestrator/src/commands/ai.js
tools/discord-orchestrator/src/services/commandRunner.js
tools/discord-orchestrator/src/services/scriptRunService.js
tools/discord-orchestrator/src/services/responseFormatter.js
tools/discord-orchestrator/README.md
_Docs/AIWorkflow/Discord_Safe_Script_Execution_Commands.md
_Docs/AIWorkflow/Discord_Task_Management_Commands.md
_DevLog/WorkLog/2026-05-04_Discord_Safe_Script_Execution_Commands.md
```

## Architecture Notes

Decision, execution, and formatting remain separated.

```text
commands/ai.js
  Discord routing

scriptRunService.js
  script allowlist and validated option-to-argument mapping

commandRunner.js
  constrained tools/aiworkflow .bat execution

responseFormatter.js
  Discord-safe output summaries
```

## Implementation Notes

The script registry exposes only the approved Release D keys. Discord input is
limited to a validated project profile id and a boolean include-untracked option.
No user-provided script paths, raw args, or raw command strings are accepted.

`json-smoke` and `capture-diff` use longer per-command timeouts. The runner now
accepts a timeout override and launches `.bat` files through explicit `cmd.exe`
invocation without `shell:true`, avoiding the Node DEP0190 warning.

## Review Summary

Manual code review should confirm:

```text
- /ai run cannot select scripts outside the registry.
- project-profile id is validated before becoming an argument.
- capture-diff include-untracked defaults to false.
- response output is concise and truncated by the existing Discord limit.
```

## Validation Summary

Local script shape checks were run before implementation:

```text
tools\aiworkflow\workflow_status.bat --json
tools\aiworkflow\active_project_status.bat --json
tools\aiworkflow\project_profile_status.bat --json
tools\aiworkflow\project_profile_status.bat --project unity_project_template --json
tools\aiworkflow\json_smoke_check.bat
tools\aiworkflow\capture_diff.bat
```

Service-level Node validation was run after implementation for:

```text
executeRunCommand workflow-status
executeRunCommand active-project
executeRunCommand project-profile
executeRunCommand project-profile id:unity_project_template
executeRunCommand json-smoke
executeRunCommand capture-diff includeUntracked:false
buildAiCommand().toJSON() run subcommand registration shape
invalid project id rejection
```

Live Discord validation passed:

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

`capture-diff include-untracked:true` was intentionally not validated because it
may affect Git intent-to-add state. `_Temp` output was generated as runtime
output and must remain ignored by Git.

## Remaining Risks

```text
- Codex/Copilot routing is intentionally deferred to WF-025 or later.
- Actual game development should resume after this workflow MVP milestone unless further automation is explicitly prioritized.
- capture_diff.bat writes _Temp/AIWorkflowDiffs runtime artifacts.
```

## Next Tasks

```text
1. Review the final documentation diff.
2. Resume GAME-001B runtime GameDataLoader validation, or explicitly prioritize WF-025.
3. Do not commit until the full Release D diff is intentionally reviewed.
```

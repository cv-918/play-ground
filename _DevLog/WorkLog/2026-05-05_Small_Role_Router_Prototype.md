# 2026-05-05 Small Role Router Prototype

## Summary

Implemented WF-036 by creating a read-only local role router prototype for
AIWorkflow.

The prototype reads the current `ActiveTask.md`, the matching Backlog row when
available, and the durable AIWorkflow policy documents. It recommends roles,
role rationale, human gates, validation checks, execution route, verdict format,
and next manual action.

## Background

WF-032 created `Agent_Role_Registry_v1.md`.

WF-033 created `Role_Router_Rules_v1.md`.

WF-034 created `Review_Validation_Verdict_Format_v1.md`.

WF-035 created `Path_Scoped_Rule_Mapping_DustLand_v1.md`.

WF-036 adds a small executable read-only prototype that turns the current active
task into a local recommendation. It does not execute agents or enforce policy.

## Scope

In scope:

- Create `tools/aiworkflow/role_router_status.bat`.
- Create `tools/aiworkflow/role_router_status.ps1`.
- Update `tools/aiworkflow/README.md`.
- Update `_Docs/AIWorkflow/README.md`.
- Create `_Docs/AIWorkflow/Small_Role_Router_Prototype.md`.
- Create this WorkLog.

Out of scope:

- Game source files.
- Discord command implementation.
- `_Local/`.
- `node_modules/`.
- `_Temp/`.
- Release or deploy scripts.
- `Backlog.md`.
- `ActiveTask.md`.
- Codex subagent execution.
- OpenClaw execution.
- Claude execution.
- Computer-use execution.
- Automatic approval.
- Automatic task completion.
- Commit or push.

## Files Changed

```text
tools/aiworkflow/role_router_status.bat
tools/aiworkflow/role_router_status.ps1
tools/aiworkflow/README.md
_Docs/AIWorkflow/README.md
_Docs/AIWorkflow/Small_Role_Router_Prototype.md
_DevLog/WorkLog/2026-05-05_Small_Role_Router_Prototype.md
```

## Architecture Notes

The prototype is read-only and local.

Execution model:

```text
role_router_status.bat
  -> resolves repository root
  -> invokes role_router_status.ps1
  -> prints text or JSON recommendation
```

The PowerShell script:

- Verifies required policy/state files exist.
- Parses scalar metadata from `ActiveTask.md`.
- Parses selected sections from `ActiveTask.md`.
- Parses Backlog table rows and finds the active task row.
- Applies reduced-scope routing rules from WF-033 and WF-035.
- Emits stdout only.

The implementation intentionally uses deterministic local heuristics rather
than agent execution or external services.

## Implementation Notes

Text output includes:

1. Active Task
2. Recommended Roles
3. Role Rationale
4. Human Decision Gates
5. Required Validation
6. Suggested Execution Route
7. Verdict Format
8. Next Manual Action

JSON output includes:

- `ok`
- `task`
- `recommended_roles`
- `human_gates`
- `required_validation`
- `execution_route`
- `next_manual_action`

Additional JSON fields include role rationale, verdict format, and policy
document list.

## Review Summary

Review should check:

- The batch wrapper works from repository root.
- `--json` mode works.
- The script reads only workflow documents and does not write files.
- The script does not execute agents, Discord commands, computer-use, commits,
  pushes, or source modification.
- ActiveTask parsing is sufficient to identify WF-036 as a P1 automation/WF
  task.
- Output includes roles, gates, validation, execution route, verdict format, and
  next action.
- README documents the new command.
- AIWorkflow README links the new durable prototype document.
- No PlayGround source files were modified.

## Validation Summary

Completed validation:

```text
tools\aiworkflow\role_router_status.bat
  passed: text output produced Active Task, Recommended Roles, Role Rationale,
  Human Decision Gates, Required Validation, Suggested Execution Route, Verdict
  Format, and Next Manual Action.

tools\aiworkflow\role_router_status.bat --json
  passed: JSON output produced ok, task, recommended_roles, human_gates,
  required_validation, execution_route, and next_manual_action.

JSON output parse check
  passed: role_router_status.bat --json output parsed with ConvertFrom-Json.

git status --short
  passed: showed the intended new role router script files, documentation
  updates, and WorkLog. It also showed pre-existing modifications to
  _Docs/AIWorkflow/ActiveTask.md and _Docs/AIWorkflow/Backlog.md from before
  this Codex run.

git diff --check
  passed: no whitespace errors reported.
  note: Git reported LF-to-CRLF working-copy warnings.

git diff --stat
  passed: showed the intended WF-036 files plus the pre-existing
  ActiveTask.md/Backlog.md modifications.

Verify no PlayGround source files were modified
  passed: git diff --name-only -- PlayGround/Project returned no files.

Verify no Discord command behavior was changed
  passed: git diff --name-only -- tools/discord-orchestrator returned no files.

Verify tools/aiworkflow README documents the new command
  passed: tools/aiworkflow/README.md contains role_router_status.bat command
  documentation.

Verify AIWorkflow README links Small_Role_Router_Prototype.md
  passed: _Docs/AIWorkflow/README.md contains the new document map entry.

Private file tracking check
  passed: path-aware git ls-files check returned no _Local, node_modules,
  _Temp, .env, or discord_bot.local.json tracked files.
```

Debug x64 build, JSON smoke, bot register/restart/status, and manual runtime
validation were not performed because this task only added a read-only
AIWorkflow local command and documentation. It did not modify game source, game
data, Discord command behavior, runtime behavior, build settings, or bot
runtime behavior.

## Remaining Risks

This is a small prototype, not a complete policy interpreter.

Known limitations:

- It uses ActiveTask metadata, the matching Backlog row, path hints, and
  conservative keyword matching.
- It does not fully parse every policy table.
- It cannot infer missing path scope if ActiveTask and Backlog omit it.
- It does not enforce workflow policy.

Future Discord integration or richer routing must be handled by a separate
approved task.

## Next Tasks

Recommended follow-up tasks:

1. Add explicit routing metadata to future ActiveTask templates if approved.
2. Add a read-only Discord role recommendation command as a separate approved
   task.
3. Consider table-driven routing after this prototype is validated in real
   workflow use.

## AI Assistance

Codex created the read-only role router prototype and documentation under the
human-provided WF-036 `/goal` instructions. No commit was performed.

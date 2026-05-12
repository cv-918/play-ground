# WF-409 Controlled Runner Implementation Profile

## Summary

WF-409 connects the regular PC Runner path to the guarded Codex CLI execution
adapter for implementation work.

This is the first normal workflow path where the Human Director can start from
Discord and let the local runner prepare the implementation request, invoke the
executor, collect evidence, generate verification/completion artifacts, and stop
for completion review without manual Codex prompt copy/paste.

## Command Surface

```text
/ai runner plan id:<task_id> profile:implementation
/ai runner start id:<task_id> profile:implementation
```

Local equivalent:

```text
tools\aiworkflow\pc_runner.bat plan <task_id> --profile implementation --json
tools\aiworkflow\pc_runner.bat start <task_id> --profile implementation --json
```

The default executor for `implementation` is `codex_cli`.

## Execution Flow

```text
approved ActiveTask
-> runner plan
-> runner implementation prompt artifact
-> codex_cli_adapter dry-run readiness check
-> codex_cli_adapter run
-> file watcher snapshot
-> result collector
-> diff analyzer
-> build/test runner json_smoke
-> verification report
-> completion report
-> completion card
-> stop at Human Director completion review
```

## Readiness Gate

The implementation profile does not run Codex CLI by default just because the
profile exists.

It first checks:

```text
_Local\AIWorkflow\codex_cli_adapter.local.json
```

The runner stops with `executor_not_ready` unless that local config exists and
is explicitly enabled.

The local config stays under `_Local/` and must never be tracked.

## Generated Prompt Artifact

The runner writes a task-scoped prompt under:

```text
_Temp\AIWorkflowRuntime\tasks\<task_id>\runner\prompts\
```

The prompt includes:

- task id, title, priority, status, kind, reason, and validation summary
- required context files: `AGENTS.md`, `ActiveTask.md`, and `Backlog.md`
- approved scope boundary
- no unrelated cleanup/refactor/game-data/release/deploy rule
- no task done, approval, Backlog creation, commit, or push rule
- required Codex return format

The prompt artifact is runtime data and must not be committed.

For Codex CLI execution, the recommended adapter config uses:

```text
codex exec ... -
prompt_input_mode: stdin_text
```

That sends the prompt file contents to Codex through stdin instead of passing
the file path as the prompt text.

## Safety Boundaries

The implementation runner profile may:

- create or reuse the task runtime workspace
- write runner prompt/config/runtime artifacts under `_Temp/`
- call the guarded Codex CLI adapter
- collect evidence and report artifacts
- generate completion review material

The implementation runner profile must not:

- approve a task
- mark a task done
- create Backlog tasks
- finalize completion
- run arbitrary user shell commands
- modify `_Local/`, `node_modules/`, `.env`, or secrets
- commit or push
- bypass Human Director completion review

## Discord Metadata

`/ai runner plan` and `/ai runner start` now expose:

```text
profile: validation
profile: implementation
```

Unsupported profile/executor pairings are still rejected by the local runner
before execution.

## Validation Evidence

WF-409 validation covered:

- PowerShell parser check for `pc_runner.ps1`
- Node syntax check for changed Discord command metadata
- slash command schema smoke for runner profile choices
- implementation plan smoke
- unsupported implementation/local_cli executor refusal smoke
- adapter-not-ready safe stop smoke when Codex CLI adapter config is missing or disabled
- `git diff --check`
- forbidden path check for `_Temp`, `_Local`, `node_modules`, `.env`, and local config files
- private/local tracked-file check

No actual Codex CLI implementation execution was required for this validation
unless the local adapter was already enabled. The essential safety behavior is
that the runner refuses or stops before external execution when the executor is
not ready.

## Next Handoff

Next task:

```text
WF-410 Exercise controlled implementation runner on a small approved workflow task
```

The goal of WF-410 is to run one small real task through:

```text
intake or selected Backlog task
-> set-active
-> approve
-> /ai runner plan profile:implementation
-> /ai runner start profile:implementation
-> completion review
-> finalization decision
```

That smoke should decide whether the regular workflow is ready for normal game
project work.

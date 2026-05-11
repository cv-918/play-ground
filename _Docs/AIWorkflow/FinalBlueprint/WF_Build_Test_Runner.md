# WF Build/Test Runner

## Purpose

This document defines the WF-303 Build/Test Runner layer.

WF-303 executes only allowlisted build, test, or validation commands from a
local configuration file. It records command output, timing, timeout, and exit
code observations as BuildTestResult artifacts for later VerificationReport
use.

The Build/Test Runner does not decide whether a task passed or failed. It is an
execution-evidence collection layer only.

---

## Scope

WF-303 includes:

- build/test command catalog loading
- local config enabled guard
- `status`, `list`, `dry-run`, `run`, and `read` commands
- explicit `--execute` requirement for real runs
- approval-level guard for approval-required commands
- stdout/stderr log capture
- exit-code, timeout, spawn-error, and duration observation
- BuildTestResult records under `_Temp/AIWorkflowRuntime/`
- build/test manifest storage
- TaskRunState build/test projection
- display-only ProgressEventLog entry
- WF-304 VerificationReport handoff fields

WF-303 does not implement:

- VerificationReport
- CompletionReport
- Completion Card
- automatic approval policy
- automatic task approval
- automatic task done
- arbitrary shell execution
- commit, push, release, or deploy
- game source or data changes

---

## Local API

Commands:

```bat
tools\aiworkflow\build_test_runner.bat status task_id [--config path] [--json]
tools\aiworkflow\build_test_runner.bat list task_id [--config path] [--json]
tools\aiworkflow\build_test_runner.bat dry-run task_id command_id [--config path] [--json]
tools\aiworkflow\build_test_runner.bat run task_id command_id --execute [--approved] [--build-test-id id] [--config path] [--json]
tools\aiworkflow\build_test_runner.bat read task_id [build_test_id] [--config path] [--json]
```

`status` reads runner state and latest BuildTestResult projection.

`list` displays configured command entries.

`dry-run` resolves an allowlisted command without executing it.

`run` executes an allowlisted command only when the config is enabled and
`--execute` is present. Commands with `approval_level: approval_required` also
require `--approved`.

`read` reads the requested BuildTestResult. If `build_test_id` is omitted, it
reads the latest result from the manifest.

---

## Runtime Artifacts

The runner writes local runtime artifacts under:

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/evidence/reports/build_test/
  build_test_manifest.json
  logs/
    <build_test_id>.stdout.log
    <build_test_id>.stderr.log
  results/
    <build_test_id>.json
```

These artifacts must not be committed directly.

---

## BuildTestResult Fields

Each BuildTestResult contains:

```text
schema_version
build_test_id
task_id
run_id
workspace_id
command
execution
logs
task_lifecycle
handoff
```

`execution.verification_judgment` and `execution.completion_state` are always
`null` in WF-303. Later layers own those decisions.

---

## Safety Model

The runner is default-deny:

- config `enabled` defaults to false
- real execution requires `run --execute`
- commands must be selected by `command_id`
- command entries must come from the config allowlist
- working directories must stay inside the repository
- approval-required commands require `--approved`
- task status must be allowed by config

The runner does not accept raw user shell strings.

---

## Handoff

WF-303 prepares handoff data for:

```text
WF-304 VerificationReport:
  BuildTestResult path
  command id and kind
  stdout/stderr log references
  observed exit state
  exit code
  timeout/spawn information
```

WF-303 must not turn those observations into pass/fail or completion decisions.

---

## Review Checklist

- Real execution is blocked without `--execute`.
- Disabled config blocks real execution.
- Unknown command IDs are rejected.
- Approval-required commands are blocked without `--approved`.
- BuildTestResult artifacts are written under `_Temp/AIWorkflowRuntime/`.
- stdout/stderr logs are written under `_Temp/AIWorkflowRuntime/`.
- Verification and completion fields remain null.
- No arbitrary shell string execution is exposed.

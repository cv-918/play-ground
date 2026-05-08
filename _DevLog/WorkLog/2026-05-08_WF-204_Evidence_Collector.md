# WF-204 Evidence Collector

## Summary

Implemented the reduced-scope Evidence Collector for WF Final Blueprint v7.

The collector creates, reads, updates, and lists EvidenceRecord runtime
artifacts linked to a WF-203 SessionState.

## Background

WF-201 defined runtime evidence handoff fields. WF-202 created task workspaces.
WF-203 created SessionState records. WF-204 adds the evidence storage and lookup
layer without executing external tools or judging results.

## Scope

Included:

- EvidenceRecord create/read/update/status API
- evidence ID validation
- invalid task/workspace/session/evidence defense
- execution metadata storage
- stdout/stderr log path reference storage
- changed file reference storage
- git diff snapshot reference storage
- manifest updates
- SessionState output path linkage
- TaskRunState evidence pointer update
- progress event JSONL appends
- WF-205 Codex CLI Execution Adapter handoff documentation

Excluded:

- Codex CLI execution
- Local CLI execution
- process spawning
- build/test runners
- Verification Gate behavior
- Completion Card behavior
- automatic approval policy
- pass/fail judgment
- task lifecycle migration
- Discord command changes

## Files Changed

- `tools/aiworkflow/evidence_collector.ps1`
- `tools/aiworkflow/evidence_collector.bat`
- `tools/aiworkflow/README.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Evidence_Collector.md`
- `_DevLog/WorkLog/2026-05-08_WF-204_Evidence_Collector.md`

## Architecture Notes

The collector requires an existing WF-202 workspace and WF-203 session. It does
not create task workspaces or sessions automatically.

Evidence records are runtime artifacts under `_Temp/AIWorkflowRuntime/`. They
may inform later verification but do not contain pass/fail decisions.

## Implementation Notes

The local API is:

```bat
tools\aiworkflow\evidence_collector.bat status task_id session_id [--json]
tools\aiworkflow\evidence_collector.bat create task_id session_id [evidence_id] [options] [--json]
tools\aiworkflow\evidence_collector.bat read task_id session_id evidence_id [--json]
tools\aiworkflow\evidence_collector.bat update task_id session_id evidence_id [options] [--json]
```

`--changed-files` and `--diff-snapshot` are storage interfaces. WF-204 does not
run `git diff` itself.

## Review Summary

Self-review checked that the implementation stays in the WF-204 reduced scope:

- task lifecycle state is not written
- evidence state is stored only under `_Temp/AIWorkflowRuntime/`
- `task_id`, `workspace_id`, `session_id`, and `evidence_id` are validated
  before reads or writes
- changed files and diff snapshots are stored as references
- no Codex/Local execution adapter, process spawn, build/test runner,
  Verification Gate, Completion Card, automatic approval policy, or pass/fail
  judgment was added

## Validation Summary

Initial validation performed:

- PowerShell parse check for `evidence_collector.ps1`: passed
- WF-204 task workspace creation through `task_workspace_manager.bat`: passed
- WF-204 validation session creation through `session_supervisor.bat`: passed
- `evidence_collector.bat create ... evidence-validation-002 --json`: passed
- `evidence_collector.bat read ... evidence-validation-001 --json`: passed
- `evidence_collector.bat update ... evidence-validation-001 --json`: passed
- `evidence_collector.bat status ... --json`: passed
- duplicate evidence creation rejection: passed
- invalid session ID rejection: passed
- generated EvidenceRecord JSON parse check: passed
- manifest JSON parse check: passed
- TaskRunState evidence pointer update check: passed
- progress event JSONL append check: passed

Final repository validation is recorded in the Codex completion response.

## Remaining Risks

- Evidence records are not validation verdicts.
- Diff snapshots are stored as references only in WF-204.

## Next Tasks

- WF-205 Codex CLI Execution Adapter

## AI Assistance

Codex implemented this workflow tooling change under the approved WF-204
reduced scope.

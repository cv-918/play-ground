# WF-409 Controlled Runner Implementation Profile

## Summary

Implemented the controlled `implementation` profile for the unified PC Runner.

The runner can now route approved implementation work through the guarded Codex
CLI adapter, collect the existing evidence/report chain, and stop at Human
Director completion review.

## Background

WF-407 introduced the unified PC Runner entrypoint and WF-408 made `/ai runner`
the regular workflow surface. The remaining gap was that the runner could only
exercise a validation profile. Implementation work still depended on manual
Codex prompt copy/paste or manual escalation.

## Scope

- Add implementation profile planning to `pc_runner.ps1`.
- Generate a task-scoped implementation prompt under runtime artifacts.
- Check Codex CLI adapter readiness before external execution.
- Run Codex CLI only through the existing guarded adapter.
- Chain file watcher, result collector, diff analyzer, build/test runner,
  verification report, completion report, and completion card after execution.
- Expose `implementation` as a Discord runner profile choice.
- Update workflow docs, Backlog, ActiveTask, and README maps.

## Non-Goals

- No automatic task approval.
- No automatic task done.
- No Backlog task creation.
- No finalization decision automation.
- No arbitrary shell execution.
- No game source/data change.
- No runner-side commit or push automation.

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md`
- `_DevLog/WorkLog/2026-05-12_WF-409_Controlled_Runner_Implementation_Profile.md`
- `tools/aiworkflow/README.md`
- `tools/aiworkflow/pc_runner.ps1`
- `tools/discord-orchestrator/README.md`
- `tools/discord-orchestrator/src/commands/ai.js`

## Implementation Notes

The implementation profile writes a prompt artifact before execution and records
its path in `runner_run.report_ids.implementation_prompt_path`.
The prompt tells the executor to read `AGENTS.md`, `ActiveTask.md`, and
`Backlog.md` before editing so the generated request stays tied to the workflow
contract.

The profile stops with `executor_not_ready` if the Codex CLI adapter local
config does not exist or is not enabled. This makes the new command surface safe
to expose in Discord before local execution settings are reviewed.

The runtime chain remains evidence/report oriented. It does not mark work done
or finalize completion.

## Review Summary

Reviewed the implementation for responsibility separation:

- PC Runner orchestrates.
- Codex CLI adapter executes.
- Evidence/report tools observe and summarize.
- Human Director retains approval, completion, and commit authority.

No unrelated game source/data changes were included.

## Validation Summary

Validation covered:

- PowerShell parser check for `pc_runner.ps1`
- Node syntax check for changed Discord command file
- command schema smoke for runner profile choices
- implementation plan smoke
- unsupported executor refusal smoke
- adapter-not-ready safe stop smoke
- `git diff --check`
- forbidden path check for `_Temp`, `_Local`, `node_modules`, `.env`, and local config files
- private/local tracked-file check

## Remaining Risks

The next meaningful proof is a real WF-410 smoke using a small approved task and
the implementation profile. That test should validate the Discord UX, completion
card readability, and operational friction during actual implementation work.

## Next Tasks

- WF-410: Exercise controlled implementation runner on a small approved workflow task.

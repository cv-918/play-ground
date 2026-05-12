# WF-410 Controlled Implementation Runner Smoke WorkLog

## Summary

WF-410 proved the regular PC Runner `implementation` profile can run an approved
workflow task through the guarded Codex CLI adapter, collect evidence, generate
verification/completion artifacts, record completion acceptance, run the
post-finalization policy/follow-up layer, and stop before manual task done and
commit/push decisions.

## Background

WF-409 connected PC Runner `implementation` profile execution to the guarded
Codex CLI adapter. WF-410 was created to exercise that path with a small
approved workflow task before relying on it for game project work.

## Scope

In scope:

- Codex CLI adapter prompt delivery fix for `codex exec -`.
- Windows PowerShell process invocation hardening.
- Runtime evidence capture review.
- Completion Card and VerificationReport review.
- FinalizationLog record and `pc_runner continue` post-finalization smoke.
- Auto Approval Policy evaluation review.
- Follow-up Task Generator output review.
- English/Korean smoke report and WorkLog updates.

Out of scope:

- Automatic task approval.
- Automatic Backlog task creation.
- Automatic task done from the runner.
- Automatic commit/push from the runner.
- Game source/data changes.
- Release or deployment.

## Files Changed

- `tools/aiworkflow/codex_cli_adapter.ps1`
- `tools/aiworkflow/codex_cli_adapter.example.json`
- `tools/aiworkflow/README.md`
- `tools/discord-orchestrator/src/services/pcRunnerService.js`
- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Codex_CLI_Execution_Adapter.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Implementation_Profile_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Smoke_Report.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Controlled_Runner_Smoke_Report_KR.md`
- `_DevLog/WorkLog/2026-05-12_WF-410_Controlled_Implementation_Runner_Smoke.md`

Ignored local/runtime files were created under `_Local/` and `_Temp/` for the
approved smoke only. They are not tracked and must not be committed.

## Architecture Notes

The responsibility boundaries held:

- PC Runner orchestrated the implementation profile.
- Codex CLI adapter executed only after guard checks and recorded session/evidence.
- Evidence collection recorded logs, changed files, and diff snapshots.
- VerificationReport judged evidence later.
- Completion Card remained display/review only.
- FinalizationLog recorded completion acceptance without changing task lifecycle.
- Auto Approval Policy evaluated only and did not apply approval.
- Follow-up Task Generator suggested a candidate only and did not write Backlog.

## Implementation Notes

- Added `prompt_input_mode` validation and `stdin_text` support to the Codex CLI
  adapter.
- Kept `argument_path` as the default for compatibility.
- Used explicit process argument string construction instead of
  `ProcessStartInfo.ArgumentList`, which is unavailable in the current Windows
  PowerShell runtime.
- Captured Codex stdout/stderr with asynchronous stream reads.
- Captured git stdout/stderr separately to avoid line-ending warnings causing
  false changed-file entries or false failures.
- Reported `external_execution_performed` truthfully when execution reached
  process start.
- Increased Discord PC Runner long timeout from 180 seconds to 900 seconds.

## Runtime Evidence

Adapter no-edit smoke:

```text
session_id: session-wf-410-codex-cli-manual-smoke-20260512135325886
evidence_id: evidence-wf-410-codex-cli-manual-smoke-20260512135325886
exit_code: 0
stdout: adapter-smoke-ok
```

PC Runner implementation smoke:

```text
runner_run_id: runner-run-wf-410-20260512-135343-454
session_id: session-wf-410-codex-cli-20260512-135343-454
evidence_ids:
  - evidence-wf-410-codex-cli-20260512-135343-454
  - evidence-wf-410-filewatch-20260512-135343-454
executor_ok: true
verification_verdict: PASS_WITH_NOTES
completion_readiness: READY_WITH_NOTES
stop_reason: completion_review_required
```

Post-finalization smoke:

```text
finalization_log_id: finalization-20260512-135907-176-29987480
auto_approval_evaluation_id: autoeval-wf-410-20260512-135915-057
auto_approval_decision: human_approval_required
follow_up_plan_id: followup-wf-410-20260512-135915-057
follow_up_candidate_count: 1
stop_reason: done_or_commit_decision
```

## Review Summary

No critical or major issues were found in the tracked changes.

The completion artifacts reported:

- VerificationReport: `PASS_WITH_NOTES`
- Completion Card: `READY_WITH_NOTES`
- Auto Approval Policy: `human_approval_required`
- Follow-up candidate count: `1`

The notes are expected because workflow state, workflow docs, AIWorkflow tools,
and Discord service files changed. The follow-up candidate is advisory and did
not write Backlog.

## Validation Summary

Completed:

- PowerShell parser check for `tools/aiworkflow/codex_cli_adapter.ps1`.
- PowerShell parser check for `tools/aiworkflow/evidence_collector.ps1`.
- JSON parse check for `tools/aiworkflow/codex_cli_adapter.example.json`.
- Direct adapter no-edit smoke through `codex_cli_adapter.bat`.
- `pc_runner start WF-410 --profile implementation --json`.
- Completion Card review.
- VerificationReport review.
- `finalization_log.bat record WF-410 accept_completion ...`.
- `pc_runner continue WF-410 --runner-run-id runner-run-wf-410-20260512-135343-454 --json`.
- Auto Approval Policy evaluation review.
- Follow-up Task Generator output review.

Final pre-commit validation:

- PowerShell parser check for changed PowerShell workflow scripts.
- Node syntax check for `tools/discord-orchestrator/src/services/pcRunnerService.js`.
- JSON parse check for changed JSON config examples.
- `git diff --check`.
- Forbidden tracked path check for `_Temp`, `_Local`, `node_modules`, `.env`, and local config files.

## Remaining Risks

- Codex CLI stdout and one nested generated Korean draft showed mojibake on this
  Windows path. The tracked Korean document was corrected manually. Future
  runner hardening should add a UTF-8/Korean output guard.
- For self-smoke tasks, the nested Codex executor may describe runtime smoke as
  blocked because it is correctly prohibited from editing `_Local/` and `_Temp/`.
  Future runner prompt text should distinguish executor-owned edits from
  runner-owned runtime validation.
- Existing unrelated untracked particle-system documentation files remain
  outside WF-410 scope and were not touched.

## Next Tasks

Recommended next workflow task:

```text
WF-411: Harden implementation runner prompt boundaries and UTF-8 output guard
```

This should make executor-facing prompts clearer and prevent Korean companion
documents from being generated with mojibake in future automated runs.

## AI Assistance

Codex App performed repository inspection, adapter fixes, runtime smoke
execution, artifact review, documentation updates, and validation. The PC Runner
itself did not approve the task, mark it done, commit, push, release, deploy, or
modify game source/data.

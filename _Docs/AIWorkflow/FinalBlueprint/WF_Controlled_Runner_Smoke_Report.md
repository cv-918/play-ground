# WF-410 Controlled Runner Smoke Report

## Purpose

WF-410 exercises the controlled PC Runner `implementation` profile after WF-409
connected the runner to the guarded Codex CLI adapter.

The intended smoke path is:

```text
pc_runner plan profile:implementation
-> Codex CLI adapter dry-run/readiness
-> pc_runner start profile:implementation
-> Codex CLI execution evidence
-> file watcher / result / diff / build-test evidence
-> VerificationReport
-> CompletionReport
-> Completion Card
-> FinalizationLog
-> pc_runner continue
-> Auto Approval Policy evaluation
-> Follow-up Task Generator
-> stop at task done / commit decision gate
```

## Scope Applied

Tracked changes applied:

- Hardened `codex_cli_adapter.ps1` for real `codex exec -` prompt delivery.
- Added `prompt_input_mode: "stdin_text"` so the adapter can send generated
  prompt file contents through stdin.
- Replaced fragile PowerShell `ArgumentList` use with explicit process argument
  string construction for Windows PowerShell compatibility.
- Captured child process stdout/stderr with `ReadToEndAsync()` so Codex CLI
  output is preserved in evidence logs.
- Captured `git diff` stdout/stderr separately so line-ending warnings do not
  pollute changed-file detection or false-fail evidence recording.
- Preserved the safety boundary that execution adapters record evidence but do
  not judge verification, approve tasks, mark tasks done, commit, or push.
- Increased Discord runner start/continue timeout to 900 seconds for real
  Codex CLI implementation runs.
- Added this smoke report, Korean companion, and WorkLog evidence.

Ignored local/runtime artifacts were created only under approved local paths:

```text
_Local/AIWorkflow/codex_cli_adapter.local.json
_Temp/AIWorkflowRuntime/tasks/WF-410/
```

These files are not tracked and must remain outside commits.

## Runtime Smoke Evidence

Adapter no-edit smoke:

```text
tools\aiworkflow\codex_cli_adapter.bat run WF-410 --execute ...
session_id: session-wf-410-codex-cli-manual-smoke-20260512135325886
evidence_id: evidence-wf-410-codex-cli-manual-smoke-20260512135325886
exit_code: 0
external_execution_performed: true
stdout: adapter-smoke-ok
```

End-to-end PC Runner smoke:

```text
tools\aiworkflow\pc_runner.bat start WF-410 --profile implementation --json
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

Completion review and post-finalization smoke:

```text
tools\aiworkflow\finalization_log.bat record WF-410 accept_completion ...
finalization_log_id: finalization-20260512-135907-176-29987480
finalization_state: completion_accepted_pending_task_done

tools\aiworkflow\pc_runner.bat continue WF-410 --runner-run-id runner-run-wf-410-20260512-135343-454 --json
auto_approval_evaluation_id: autoeval-wf-410-20260512-135915-057
auto_approval_decision: human_approval_required
follow_up_plan_id: followup-wf-410-20260512-135915-057
follow_up_candidate_count: 1
stop_reason: done_or_commit_decision
```

The follow-up candidate is advisory only. It did not create a Backlog task.

## Review Result

Completion Card:

```text
completion_card_id: card-wf-410-20260512-135343-454
state: ready_for_human_completion_review_with_notes
readiness_level: READY_WITH_NOTES
verdict: PASS_WITH_NOTES
can_mark_task_done_manually: true
can_commit_after_review: true
```

Verification Report:

```text
verification_report_id: verification-wf-410-20260512-135343-454
verdict: PASS_WITH_NOTES
execution_result_gate: PASS
diff_gate: PASS_WITH_NOTES
build_test_gate: PASS
safety_gate: PASS
```

The notes are expected review signals for workflow state, workflow docs,
AIWorkflow tools, and Discord tool files. No blockers or failed checks were
reported.

## Friction Found

The runner correctly performed the outer execution/evidence path, but the Codex
executor prompt is intentionally prohibited from modifying `_Local/` and
`_Temp/`. For self-smoke tasks, this can make the nested Codex executor describe
the runtime smoke as blocked even when the enclosing PC Runner performs it
successfully. Future prompt text should distinguish executor-owned tracked edits
from runner-owned runtime validation more clearly.

The Codex CLI stdout and one generated Korean draft contained mojibake on this
Windows path. The tracked Korean document was corrected manually in UTF-8. Future
runner hardening should include a Korean/UTF-8 output guard for generated
documentation.

## Validation Evidence

Completed during WF-410:

- PowerShell parser check for `tools/aiworkflow/codex_cli_adapter.ps1`.
- PowerShell parser check for `tools/aiworkflow/evidence_collector.ps1`.
- JSON parse check for `tools/aiworkflow/codex_cli_adapter.example.json`.
- Direct `codex exec -` smoke through `codex_cli_adapter.bat`.
- `pc_runner start WF-410 --profile implementation --json`.
- Completion Card review.
- Verification Report review.
- `finalization_log.bat record WF-410 accept_completion ...`.
- `pc_runner continue WF-410 --runner-run-id runner-run-wf-410-20260512-135343-454 --json`.
- Auto Approval Policy evaluation review.
- Follow-up Task Generator output review.

Final pre-commit validation is recorded in the WF-410 WorkLog.

## Result

Verdict:

```text
PASS_WITH_NOTES
```

WF-410 proved that the regular PC Runner implementation profile can execute
Codex CLI through the guarded adapter, collect runtime evidence, generate
verification/completion artifacts, record completion acceptance, evaluate the
auto-approval policy, generate follow-up candidates, and stop at the manual
task-done/commit gate.

No task approval, automatic task done, automatic Backlog write, automatic
commit, push, release, deployment, or game source/data change was performed by
the runner.

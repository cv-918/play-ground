# WF-405 End-to-End Workflow Smoke Validation Report

## Purpose

WF-405 validates whether the post-WF-309 workflow primitives can be connected
into one representative end-to-end path before designing the unified PC Runner
orchestration entrypoint.

This report records observed evidence, validation results, and gaps. It does
not change command behavior, remove commands, approve tasks automatically, mark
tasks done automatically, commit, push, or modify game source/data.

## Smoke Scenario

Task:

```text
WF-405 Run end-to-end workflow smoke and validation pack
```

Approved scope:

```text
Validate the workflow harness using local PC Runner primitives and runtime
artifacts only.
```

Non-goals:

```text
command removal
behavior changes
automatic approval/done/commit/push
game source/data changes
```

## Path Exercised

```text
Human Director approval
-> ActiveTask / Backlog update
-> Task Workspace Manager create
-> Local CLI Adapter status/run
-> Session Supervisor read
-> Evidence Collector read
-> File Watcher snapshot
-> Result Collector collect
-> Diff Analyzer analyze
-> Build/Test Runner run
-> VerificationReport generate
-> CompletionReport generate
-> Completion Card generate
-> FinalizationLog record
-> Auto Approval Policy evaluate
-> Follow-up Task Generator generate
```

## Evidence Summary

Runtime workspace:

```text
_Temp/AIWorkflowRuntime/tasks/WF-405
```

Key runtime IDs:

| Artifact | ID |
| --- | --- |
| run | `run-WF-405-001` |
| session | `session-wf405-local-cli` |
| local CLI evidence | `evidence-wf405-local-cli` |
| file watcher evidence | `evidence-wf405-filewatch-001` |
| execution result | `result-wf405-smoke` |
| diff analysis | `analysis-wf405-smoke` |
| build/test result | `bt-wf405-json-smoke` |
| verification report | `verification-wf405-smoke` |
| completion report | `completion-wf405-smoke` |
| completion card | `card-wf405-smoke` |
| finalization log | `finalization-wf405-smoke` |
| auto approval evaluation | `autoeval-wf405-smoke` |
| follow-up plan | `followup-wf405-smoke` |

## Validation Results

| Check | Result | Notes |
| --- | --- | --- |
| Task workspace create | PASS | Workspace created under `_Temp/AIWorkflowRuntime/tasks/WF-405`. |
| Local CLI adapter status | PASS | `node_version` command was allowlisted and approved by config. |
| Local CLI adapter run | PASS | `node --version` exited `0`; stdout recorded `v24.15.0`; stderr empty. |
| Session Supervisor | PASS | Session reached `completed`; progress events recorded. |
| Evidence Collector | PASS | Evidence recorded logs, changed files, and diff snapshot references without pass/fail judgment. |
| File Watcher | PASS | Snapshot recorded changed workflow state files and diff snapshot. |
| Result Collector | PASS | Collected 1 session, 2 evidence records, 2 changed files, and 2 diff snapshots. |
| Diff Analyzer | PASS_WITH_NOTES | Detected workflow state changes in `ActiveTask.md` and `Backlog.md`, which were expected for WF-405. |
| Build/Test Runner | PASS | JSON smoke check parsed 11 files, failed 0. |
| VerificationReport | PASS_WITH_NOTES | Notes were caused by expected workflow state changes. No concerns, blockers, or failed checks. |
| CompletionReport/Card | PASS_WITH_NOTES | Ready for human completion review with notes. |
| FinalizationLog | PASS | Recorded completion acceptance as a runtime artifact only; did not mark task done. |
| Auto Approval Policy | PASS | Correctly returned `human_approval_required` for this P1 task. |
| Follow-up Task Generator | PASS_WITH_NOTES | Generated 1 reviewable candidate from auto-approval policy blocker. |

## Commands Run

```powershell
git status --short --branch
.\tools\aiworkflow\task_workspace_manager.bat create WF-405 --json
.\tools\aiworkflow\local_cli_adapter.bat status WF-405 node_version --config _Temp\AIWorkflowRuntime\wf405_smoke_config\local_cli_adapter.wf405.json --json
.\tools\aiworkflow\build_test_runner.bat list WF-405 --config _Temp\AIWorkflowRuntime\wf405_smoke_config\build_test_runner.wf405.json --json
.\tools\aiworkflow\file_watcher.bat status WF-405 --config _Temp\AIWorkflowRuntime\wf405_smoke_config\file_watcher.wf405.json --json
.\tools\aiworkflow\local_cli_adapter.bat run WF-405 node_version --execute --config _Temp\AIWorkflowRuntime\wf405_smoke_config\local_cli_adapter.wf405.json --session-id session-wf405-local-cli --evidence-id evidence-wf405-local-cli --json
.\tools\aiworkflow\session_supervisor.bat read WF-405 session-wf405-local-cli --json
.\tools\aiworkflow\evidence_collector.bat read WF-405 session-wf405-local-cli evidence-wf405-local-cli --json
.\tools\aiworkflow\file_watcher.bat snapshot WF-405 session-wf405-local-cli evidence-wf405-filewatch-001 --config _Temp\AIWorkflowRuntime\wf405_smoke_config\file_watcher.wf405.json --json
.\tools\aiworkflow\result_collector.bat collect WF-405 session-wf405-local-cli result-wf405-smoke --json
.\tools\aiworkflow\diff_analyzer.bat analyze WF-405 result-wf405-smoke analysis-wf405-smoke --json
.\tools\aiworkflow\build_test_runner.bat run WF-405 json_smoke --execute --build-test-id bt-wf405-json-smoke --config _Temp\AIWorkflowRuntime\wf405_smoke_config\build_test_runner.wf405.json --json
.\tools\aiworkflow\verification_report.bat generate WF-405 --result-id result-wf405-smoke --analysis-id analysis-wf405-smoke --build-test-id bt-wf405-json-smoke --report-id verification-wf405-smoke --json
.\tools\aiworkflow\completion_report.bat generate WF-405 verification-wf405-smoke completion-wf405-smoke --json
.\tools\aiworkflow\completion_card.bat generate WF-405 completion-wf405-smoke card-wf405-smoke --json
.\tools\aiworkflow\finalization_log.bat record WF-405 accept_completion completion-wf405-smoke approval-wf405-smoke finalization-wf405-smoke actor_codex --json
.\tools\aiworkflow\auto_approval_policy.bat evaluate WF-405 completion-wf405-smoke finalization-wf405-smoke autoeval-wf405-smoke --json
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools\aiworkflow\follow_up_task_generator.ps1 -Command generate -TaskId WF-405 -CompletionReportId completion-wf405-smoke -FinalizationLogId finalization-wf405-smoke -PolicyEvaluationId autoeval-wf405-smoke -FollowUpPlanId followup-wf405-smoke -RepoRoot . -Json
```

## Findings

1. The runtime primitive chain is usable end-to-end.
2. Workflow state changes are visible and correctly flagged as review signals.
3. Verification and completion layers preserve the boundary between evidence,
   judgment, completion review, and final task lifecycle state.
4. Auto Approval Policy correctly refuses automatic approval for a P1 task.
5. Follow-up generation does not create Backlog tasks automatically.

## Gaps Found

1. `build_test_runner.bat` requires build/test IDs to use the `bt-` prefix.
   The invalid ID `buildtest-wf405-json-smoke` was rejected correctly, but this
   rule should be made more visible in user/operator guidance.
2. `follow_up_task_generator.bat generate` rejected the positional argument
   sequence at `finalization-wf405-smoke`. The same operation succeeded through
   the PowerShell script with named parameters. This should be fixed before the
   unified PC Runner relies on the `.bat` wrapper.
3. There is no separate `progress_heartbeat_collector.bat` wrapper. Progress
   and heartbeat were observable through Session Supervisor and Result
   Collector outputs. WF-406 should decide whether a unified runner should call
   those existing views or expose a clearer progress command.

## Verdict

```text
PASS_WITH_NOTES
```

WF-405 confirms that the current primitives can support an end-to-end controlled
workflow, but WF-406 should design a unified PC Runner entrypoint that hides
the primitive-by-primitive command burden and handles ID/prefix rules centrally.

## Next Task

Proceed to:

```text
WF-406 Design unified PC Runner orchestration entrypoint
```

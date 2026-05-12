# WF-405 End-to-End Workflow Smoke

## Summary

Ran the WF-405 end-to-end workflow smoke through the current PC Runner
primitives and recorded the result as PASS_WITH_NOTES.

## Scope

- Validate the workflow harness using local PC Runner primitives.
- Exercise runtime workspace, execution, evidence, result, diff, build/test,
  verification, completion, finalization, auto approval evaluation, and
  follow-up candidate generation.
- Record evidence and gaps for WF-406.

## Files Changed

- `_Docs/AIWorkflow/ActiveTask.md`
- `_Docs/AIWorkflow/Backlog.md`
- `_Docs/AIWorkflow/README.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_End_To_End_Workflow_Smoke_Validation_Report.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_End_To_End_Workflow_Smoke_Validation_Report_KR.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Implementation_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap.md`
- `_Docs/AIWorkflow/FinalBlueprint/WF_Post_309_Workflow_Stabilization_Roadmap_KR.md`
- `_DevLog/WorkLog/2026-05-12_WF-405_End_To_End_Workflow_Smoke.md`

## Runtime Evidence

- Runtime workspace: `_Temp/AIWorkflowRuntime/tasks/WF-405`
- Session: `session-wf405-local-cli`
- Execution result: `result-wf405-smoke`
- Diff analysis: `analysis-wf405-smoke`
- Build/test result: `bt-wf405-json-smoke`
- Verification report: `verification-wf405-smoke`
- Completion report: `completion-wf405-smoke`
- Completion card: `card-wf405-smoke`
- Finalization log: `finalization-wf405-smoke`
- Auto approval evaluation: `autoeval-wf405-smoke`
- Follow-up plan: `followup-wf405-smoke`

## Validation Summary

- Local CLI `node --version` exited `0`.
- JSON smoke check parsed 11 files and failed 0.
- Result Collector gathered 1 session, 2 evidence records, 2 changed file
  references, and 2 diff snapshot references.
- VerificationReport verdict: `PASS_WITH_NOTES`.
- Auto Approval Policy decision: `human_approval_required`.
- Follow-up Task Generator produced 1 reviewable candidate and did not create a
  Backlog task automatically.

## Notes and Gaps

- `build_test_runner.bat` requires `bt-` IDs. This is correct but should be more
  visible in operator guidance.
- `follow_up_task_generator.bat generate` rejected the positional argument
  sequence at `finalization-wf405-smoke`; direct PowerShell named-parameter
  invocation succeeded.
- Progress/heartbeat data was available through Session Supervisor and Result
  Collector, but there is no standalone progress heartbeat wrapper.

## Remaining Risk

WF-405 confirms the primitives connect, but the workflow is still too manual.
WF-406 should design a single controlled PC Runner entrypoint that hides command
chaining and centralizes ID/prefix handling while preserving approval gates.

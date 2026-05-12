# WF-410 제어형 Runner Smoke 보고서

## 목적

WF-410은 WF-409에서 연결한 PC Runner `implementation` profile이 실제로
Codex CLI adapter를 통해 실행되고, 증거와 완료 카드를 만들고, 사람 검토
게이트에서 멈추는지 확인한 smoke 작업입니다.

검증하려는 전체 흐름은 다음과 같습니다.

```text
pc_runner plan profile:implementation
-> Codex CLI adapter 준비 상태 확인
-> pc_runner start profile:implementation
-> Codex CLI 실행 증거 수집
-> file watcher / result / diff / build-test 증거 수집
-> VerificationReport
-> CompletionReport
-> Completion Card
-> FinalizationLog
-> pc_runner continue
-> Auto Approval Policy 평가
-> Follow-up Task Generator
-> task done / commit 결정 게이트에서 정지
```

## 적용한 변경

tracked 변경:

- `codex_cli_adapter.ps1`이 실제 `codex exec -`에 prompt 내용을 stdin으로
  전달할 수 있도록 보강했습니다.
- `prompt_input_mode: "stdin_text"` 설정을 추가했습니다.
- Windows PowerShell에서 null이 되던 `ProcessStartInfo.ArgumentList` 경로를
  명시적 argument 문자열 생성 방식으로 교체했습니다.
- Codex CLI stdout/stderr를 비동기 캡처해서 evidence log에 남기도록
  고쳤습니다.
- `git diff` stdout/stderr를 분리해서 줄끝 경고가 changed file 목록이나
  실패 판정에 섞이지 않도록 했습니다.
- Discord runner start/continue timeout을 900초로 늘렸습니다.
- smoke 보고서, 한국어 보고서, WorkLog를 추가했습니다.

승인된 local/runtime 경로에는 다음 artifact가 생성되었습니다.

```text
_Local/AIWorkflow/codex_cli_adapter.local.json
_Temp/AIWorkflowRuntime/tasks/WF-410/
```

이 파일들은 ignored local/runtime artifact이며 commit 대상이 아닙니다.

## 실행 증거

adapter 단독 no-edit smoke:

```text
tools\aiworkflow\codex_cli_adapter.bat run WF-410 --execute ...
session_id: session-wf-410-codex-cli-manual-smoke-20260512135325886
evidence_id: evidence-wf-410-codex-cli-manual-smoke-20260512135325886
exit_code: 0
external_execution_performed: true
stdout: adapter-smoke-ok
```

PC Runner end-to-end smoke:

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

완료 수락과 continue:

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

follow-up 후보는 참고용으로만 생성되었고, Backlog task는 자동 생성하지
않았습니다.

## 리뷰 결과

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

note는 workflow state, workflow docs, AIWorkflow tool, Discord tool 변경을
검토하라는 신호입니다. blocker나 failed check는 없었습니다.

## 발견한 마찰

Runner 자체는 정상적으로 외부 실행과 증거 수집을 수행했습니다. 다만
runner가 생성한 Codex executor prompt는 `_Local/`, `_Temp/` 수정을 금지하고
있습니다. 그래서 “runner를 runner로 smoke하는 작업”에서는 안쪽 Codex가
runtime smoke를 직접 수행할 수 없다고 판단할 수 있습니다. 실제 runtime
검증은 바깥 PC Runner가 수행하므로, 앞으로 executor prompt에는
“executor가 하는 tracked edit”와 “runner가 하는 runtime validation”의
책임 경계를 더 명확히 넣는 것이 좋습니다.

또한 Windows 경로에서 Codex CLI stdout과 생성된 한국어 초안 일부가
mojibake로 기록되었습니다. tracked 한국어 문서는 UTF-8로 직접 교정했습니다.
향후 runner 안정화에서는 한국어/UTF-8 출력 guard를 추가하는 것이 좋습니다.

## 검증 결과

WF-410 중 수행한 검증:

- `tools/aiworkflow/codex_cli_adapter.ps1` PowerShell parser check.
- `tools/aiworkflow/evidence_collector.ps1` PowerShell parser check.
- `tools/aiworkflow/codex_cli_adapter.example.json` JSON parse check.
- `codex_cli_adapter.bat`을 통한 직접 `codex exec -` smoke.
- `pc_runner start WF-410 --profile implementation --json`.
- Completion Card review.
- Verification Report review.
- `finalization_log.bat record WF-410 accept_completion ...`.
- `pc_runner continue WF-410 --runner-run-id runner-run-wf-410-20260512-135343-454 --json`.
- Auto Approval Policy evaluation review.
- Follow-up Task Generator output review.

최종 commit 전 검증은 WF-410 WorkLog에 기록합니다.

## 결론

판정:

```text
PASS_WITH_NOTES
```

WF-410은 정규 PC Runner implementation profile이 guarded Codex CLI adapter를
통해 실제 Codex CLI를 실행하고, runtime evidence, VerificationReport,
CompletionReport, Completion Card, FinalizationLog, Auto Approval Policy
evaluation, Follow-up plan까지 생성한 뒤 수동 task done / commit 결정
게이트에서 멈출 수 있음을 확인했습니다.

Runner는 task approval, task done, Backlog write, commit, push, release,
deploy, game source/data 변경을 자동으로 수행하지 않았습니다.

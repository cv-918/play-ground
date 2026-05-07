# WF Verification, State, and Audit Spec

## 목적

작업 결과는 Codex/Copilot/Agent가 완료했다고 말하는 것으로 끝나지 않는다. WF 기준 완료는 결과 수집, 검증, 승인, 상태 반영까지 포함한다.

## 검증 게이트

```text
compile gate
runtime smoke gate
diff gate
architecture invariant gate
no-ad-hoc-logic gate
documentation gate
regression checklist
completion readiness gate
```

## 게이트별 책임

| 게이트 | 책임 |
|---|---|
| compile gate | 빌드 성공 여부 확인 |
| runtime smoke gate | 최소 런타임 확인 또는 수동 확인 필요 여부 판단 |
| diff gate | 변경 범위가 계획과 일치하는지 확인 |
| architecture invariant gate | 책임 분리, 구조 규칙, 금지 패턴 위반 여부 확인 |
| no-ad-hoc-logic gate | 단일 클래스에 임시 if/switch 누적 여부 확인 |
| documentation gate | 필요한 문서 갱신 여부 확인 |
| regression checklist | 기존 기능 영향 확인 |
| completion readiness gate | 최종 완료 카드 전송 가능 여부 판단 |

## 완료 상태 분류

```text
execution_completed
verification_running
result_review_waiting
auto_completed
completed_with_warning
failed
finalized
```

## WF 기준 완료 조건

WF 기준 작업 완료는 다음을 모두 만족해야 한다.

```text
- 실행 결과 수집 완료
- 변경 파일 및 diff 수집 완료
- 검증 게이트 실행 완료
- 승인 정책 적용 완료
- 사용자 승인 또는 자동 승인 완료
- ActiveTask / ProjectStatus / Backlog 반영 완료
- completion report 및 audit log 저장 완료
```

## 상태 및 감사 파일

```text
RawRequest files
goal_request files
ActiveTask.md
Backlog.md
ProjectStatus.md
TaskRunState
SessionState
ProgressEventLog
RuntimeControlHistory
RiskReport
ApprovalPolicy
ApprovalHistory
ExecutionResult
VerificationReport
CompletionReport
FinalizationLog
Git/WorktreeState
```

## ExecutionResult

저장 항목:

```text
- task_id
- executor
- session_id
- start_time
- end_time
- exit_status
- changed_files
- generated_summary
- raw_log_path
- error_summary
```

## VerificationReport

저장 항목:

```text
- task_id
- compile_gate
- runtime_smoke_gate
- diff_gate
- architecture_gate
- no_ad_hoc_logic_gate
- documentation_gate
- regression_checklist
- warnings
- blockers
- recommended_user_action
```

## CompletionReport

저장 항목:

```text
- task_id
- completion_state
- execution_summary
- verification_summary
- risk_level
- approval_required
- user_action_required
- follow_up_candidates
```

## FinalizationLog

저장 항목:

```text
- task_id
- final_decision
- final_decision_by
- decision_time
- state_files_updated
- backlog_changes
- project_status_changes
- git/worktree state
```

## 완료 알림 규칙

1. Codex/Copilot이 끝났다는 것만으로 완료 처리하지 않는다.
2. 모든 완료 알림은 검증 결과를 포함해야 한다.
3. 저위험 작업은 자동 완료 가능하다.
4. 중위험 이상 작업은 Discord Completion Card로 승인 요청한다.
5. 실패한 작업도 완료 알림처럼 보고되어야 한다.
6. 사용자 승인/수정/반려 결정은 모두 감사 로그에 남긴다.
7. 완료 후 상태 파일 갱신은 하네스가 수행한다.

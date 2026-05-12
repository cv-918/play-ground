# WF-407 PC Runner 통합 진입점 구현 결과

## 요약

WF-407에서는 WF-406에서 설계한 PC Runner 통합 진입점을 실제로 구현했습니다.

이제 로컬에서는 다음 하나의 명령 표면으로 실행 흐름을 다룰 수 있습니다.

```text
tools\aiworkflow\pc_runner.bat <command> <task_id> [options]
```

Discord에서는 다음 명령 그룹이 추가되었습니다.

```text
/ai runner status
/ai runner plan
/ai runner start
/ai runner continue
/ai runner stop
/ai runner read
```

## 쉽게 말하면

이전에는 작업 하나를 진행하려면 여러 작은 명령을 사람이 순서대로 실행해야
했습니다.

이제는 PC Runner가 그 작은 명령들을 한 흐름으로 묶어서 실행합니다. 다만,
사용자 권한이 필요한 지점에서는 자동으로 넘어가지 않고 멈춥니다.

즉, Runner가 대신 해주는 일은 다음과 같습니다.

- 작업 workspace 준비
- 실행 세션 기록
- 안전한 allowlist 명령 실행
- 증거 수집
- diff snapshot 수집
- 결과 수집
- 검증 보고서 생성
- 완료 보고서와 완료 카드 생성
- finalization 이후 auto-approval 평가와 follow-up 후보 생성

Runner가 하지 않는 일은 다음과 같습니다.

- 작업 승인
- 작업 완료 처리
- Backlog task 자동 생성
- 커밋
- 푸시
- 임의 shell 명령 실행
- 게임 소스/데이터 변경

## 정상 흐름

1. 사용자가 작업을 접수합니다.
2. 필요한 경우 사용자가 승인합니다.
3. `/ai runner plan`으로 실행 계획을 확인합니다.
4. `/ai runner start`로 안전한 자동 흐름을 시작합니다.
5. Runner가 CompletionReport/Completion Card까지 만들고 멈춥니다.
6. 사용자가 결과를 확인하고 finalization 결정을 기록합니다.
7. `/ai runner continue`로 후속 산출물을 생성합니다.
8. Runner가 auto-approval 평가와 follow-up 후보를 만들고 다시 멈춥니다.
9. 사용자가 task done, commit, push 여부를 결정합니다.

## 검증 결과

WF-407 검증에서는 다음을 확인했습니다.

- JavaScript 명령/서비스/응답 formatter 문법 확인 통과
- PowerShell runner 파서 확인 통과
- `pc_runner status/plan/start/read/continue` 동작 확인
- WF-407 validation profile 실행 확인
- CompletionReview 지점에서 자동으로 멈추는 것 확인
- FinalizationLog 없이 `continue`가 진행되지 않는 것 확인
- FinalizationLog 이후 AutoApprovalPolicy와 FollowUpPlan이 생성되는 것 확인
- 승인되지 않은 P1 작업 WF-408은 `approval_required`로 시작 거부 확인
- 생성된 runner JSON artifact 파싱 확인
- Discord `/ai runner` 명령 그룹 빌드 확인

## 다음 작업

다음은 WF-408입니다.

```text
WF-408 Apply approved workflow cleanup
```

WF-408에서는 이제 PC Runner가 생겼으므로, 기존 bootstrap/manual 명령 중
무엇을 유지하고 무엇을 숨기거나 정리할지 적용합니다.

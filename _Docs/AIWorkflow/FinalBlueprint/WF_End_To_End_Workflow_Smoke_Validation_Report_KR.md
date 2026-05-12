# WF-405 전체 워크플로우 Smoke 검증 보고서

## 목적

WF-405는 WF-309까지 만든 실행 부품들이 실제로 하나의 흐름으로 이어질 수
있는지 확인하는 검증 작업입니다.

이번 작업은 기능을 바꾸거나 명령어를 제거하지 않았습니다. 자동 승인, 자동
완료, 자동 커밋/푸시도 하지 않았습니다. 게임 소스와 게임 데이터도 바꾸지
않았습니다.

## 검증한 흐름

```text
사용자 승인
-> ActiveTask / Backlog 상태 갱신
-> 작업 workspace 생성
-> Local CLI 실행
-> 세션 상태 확인
-> 실행 증거 확인
-> 파일 변경 snapshot
-> 결과 수집
-> diff 분석
-> build/test 실행
-> 검증 보고서 생성
-> 완료 보고서/카드 생성
-> 최종화 로그 생성
-> 자동 승인 정책 평가
-> 후속 작업 후보 생성
```

## 핵심 결과

결론은 다음과 같습니다.

```text
PASS_WITH_NOTES
```

쉽게 말하면 “전체 흐름은 실제로 이어졌고, 막히는 문제는 없지만, 통합 Runner를
만들기 전에 정리해야 할 사용성 문제가 몇 개 있다”는 뜻입니다.

## 통과한 것

- 작업 workspace가 `_Temp/AIWorkflowRuntime/tasks/WF-405` 아래에 생성됐습니다.
- Local CLI가 `node --version`을 실행했고 exit code `0`으로 끝났습니다.
- stdout에는 `v24.15.0`이 기록됐고 stderr는 비어 있었습니다.
- Session Supervisor가 세션 완료 상태를 기록했습니다.
- Evidence Collector가 로그, 변경 파일, diff snapshot 경로를 기록했습니다.
- File Watcher가 `ActiveTask.md`, `Backlog.md` 변경을 감지했습니다.
- Result Collector가 세션 1개, 증거 2개, 변경 파일 2개, diff snapshot 2개를 수집했습니다.
- Diff Analyzer가 workflow 상태 파일 변경을 감지했습니다.
- Build/Test Runner가 JSON smoke check를 실행했고 JSON 11개가 모두 통과했습니다.
- VerificationReport는 `PASS_WITH_NOTES`를 냈습니다.
- CompletionReport와 Completion Card가 생성됐습니다.
- FinalizationLog가 생성됐지만 task를 자동 완료 처리하지는 않았습니다.
- Auto Approval Policy는 P1 작업이므로 자동 승인하지 않고 사용자 승인이 필요하다고 판단했습니다.
- Follow-up Task Generator는 후속 후보를 만들었지만 Backlog task를 자동 생성하지 않았습니다.

## 발견한 정리 필요 사항

1. `build_test_runner.bat`의 build/test ID는 `bt-`로 시작해야 합니다.
   잘못된 ID는 정상적으로 거부됐지만, 이 규칙은 사용자가 더 잘 볼 수 있어야 합니다.

2. `follow_up_task_generator.bat generate`는 positional 인자 조합에서
   `finalization-wf405-smoke`를 제대로 받지 못했습니다.
   같은 작업은 `.ps1` named parameter 방식으로는 성공했습니다.
   통합 PC Runner가 이 wrapper에 의존하기 전에 고치는 편이 좋습니다.

3. 별도 `progress_heartbeat_collector.bat` 명령은 없습니다.
   진행/heartbeat 정보는 Session Supervisor와 Result Collector에서 확인할 수 있었습니다.
   WF-406에서는 통합 Runner가 이 정보를 어떻게 보여줄지 정해야 합니다.

## 사용자 관점 결론

현재 하네스는 “수동으로 각 부품을 하나씩 호출하면” 끝까지 이어집니다.

하지만 사용자가 원하는 최종 형태는 각 부품을 직접 하나씩 호출하는 것이
아닙니다. 따라서 다음 작업은 기존 부품들을 하나의 안전한 흐름으로 묶는
PC Runner 통합 진입점 설계가 맞습니다.

## 다음 작업

```text
WF-406 Design unified PC Runner orchestration entrypoint
```

WF-406에서는 사용자가 Discord에서 작업을 승인한 뒤, PC Runner가 가능한
단계들을 자동으로 이어서 실행하고, 필요한 승인 지점에서만 멈추도록 설계해야
합니다.

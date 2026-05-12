# WF-406 통합 PC Runner 진입점 설계

## 목적

이 문서는 통합 PC Runner 진입점의 설계 기준입니다.

목표는 사용자가 하네스 내부 부품 명령을 하나씩 직접 실행하지 않게 만드는
것입니다. Runner가 기존 WF-201부터 WF-309까지의 부품을 정해진 순서로
호출하고, 증거를 수집하고, 검증/완료 보고서를 만들고, 사용자 결정이 필요한
지점에서 멈추도록 합니다.

이번 문서는 설계만 다룹니다. 구현, 명령어 제거, 동작 변경, 자동 승인, 자동
완료, 자동 커밋/푸시, 게임 소스/데이터 변경은 포함하지 않습니다.

## 최종 사용자 흐름

```text
1. 사용자가 Discord에서 작업을 만들거나 선택한다.
2. 정책이 승인 필요 여부를 판단한다.
3. 승인이 필요한 작업이면 사용자가 범위를 승인한다.
4. 사용자가 Runner를 한 번 시작한다.
5. Runner가 workspace 준비, 실행, 증거 수집, 검증, 완료 카드 생성을 수행한다.
6. 사용자는 필요하면 진행 상황을 본다.
7. 사용자는 Completion Card를 보고 완료 여부를 판단한다.
8. 사용자는 accept/accept-concerns/request changes/reject/defer 중 하나를 선택한다.
9. Runner는 최종 결정 이후 필요한 후속 산출물을 만든다.
10. 사용자가 task done과 commit/push 여부를 결정한다.
```

즉, 정상 흐름에서는 사용자가 Codex 프롬프트를 직접 복사하거나 내부 primitive
명령을 줄줄이 실행하지 않아야 합니다.

## 명령어 표면

WF-407에서 구현할 로컬 명령은 하나로 묶습니다.

```text
tools\aiworkflow\pc_runner.bat <command> <task_id> [options]
```

필수 command:

| command | 의미 |
| --- | --- |
| `status` | 현재 Runner/task/runtime 상태 조회 |
| `plan` | 실제 실행 전 단계 계획과 중단 지점 확인 |
| `start` | 승인된 task를 Runner 흐름으로 시작 |
| `continue` | 중단점 이후 이어서 진행 |
| `stop` | Runtime Control을 통해 중단 요청/적용 |
| `read` | 특정 runner 산출물 조회 |

Discord에는 다음 정도만 노출하는 것을 권장합니다.

```text
/ai runner status id:<task_id>
/ai runner plan id:<task_id>
/ai runner start id:<task_id>
/ai runner continue id:<task_id>
```

사용자가 모든 내부 명령을 직접 알 필요는 없습니다.

## Runner가 해도 되는 일

- Backlog와 ActiveTask 읽기
- task 승인 상태 확인
- runtime workspace 생성/조회
- Runner 실행 계획 생성
- 승인된 execution adapter 호출
- result/diff/build-test/verification/completion/finalization/auto-approval/follow-up 부품 호출
- `_Temp/AIWorkflowRuntime/tasks/<task_id>/` 아래 runtime 산출물 쓰기
- progress event와 checkpoint 기록
- Discord에 보여줄 진행/완료 요약 생성

## Runner가 하면 안 되는 일

- Backlog task 자동 생성
- ActiveTask 자동 선택
- task 자동 승인
- P0/P1/high-risk 승인 gate 우회
- task 자동 완료
- auto approval 자동 적용
- commit/push/release/deploy
- 사용자 자연어를 임의 shell command로 실행
- 승인 범위 밖 게임 소스/데이터 변경
- evidence collection을 pass/fail 판정으로 취급
- completion report 생성을 사용자 완료 승인으로 취급

## Runtime 산출물

Runner 전용 산출물은 기존 task runtime workspace 아래에 둡니다.

```text
_Temp/AIWorkflowRuntime/tasks/<task_id>/runner/
  runner_manifest.json
  plans/
  runs/
  checkpoints/
```

핵심은 `continue`가 가능해야 한다는 점입니다. Runner는 어디까지 진행했고,
어디서 멈췄고, 다음에 무엇을 해야 하는지 checkpoint로 남겨야 합니다.

## 실행 단계

```text
preflight
-> approval 확인
-> workspace 준비
-> runner plan 생성
-> executor status/dry-run
-> 승인된 adapter 실행
-> session/progress/heartbeat 기록
-> file watcher/evidence collector
-> result collector
-> diff analyzer
-> build/test runner
-> verification report
-> completion report/card
-> 사용자 completion decision에서 정지
-> finalization 이후 continue
-> auto approval evaluation
-> follow-up plan
-> task done/commit 결정에서 정지
```

Runner는 이 흐름을 자동으로 이어가되, 사용자 권한이 필요한 지점에서는 반드시
멈춰야 합니다.

## 반드시 멈춰야 하는 지점

| 지점 | 이유 | 사용자 결정 |
| --- | --- | --- |
| 승인 없음 | 작업 착수 권한 없음 | approve/reject/scope 수정 |
| 실행기 준비 안 됨 | Codex CLI 또는 Local CLI 설정 문제 | 설정 수정/실행기 변경/수동 승격 |
| Runtime Control 요청 | 중단/재시도/재계획 등 요청 있음 | 승인/반려/적용 |
| 검증 결과 문제 | CONCERNS/BLOCKED/FAIL | 수정 요청/재시도/리스크 수락 |
| Completion Card 준비 | 완료 판단 필요 | accept/accept-concerns/request changes/reject/defer |
| Finalization 이후 | lifecycle 완료와 git 결정 필요 | task done, commit/push 여부 결정 |
| Auto approval 후보 | 정책 변경은 사용자 권한 | 정책 승인 또는 무시 |

## WF-405에서 반영할 점

WF-405 smoke에서 드러난 사항은 WF-406 설계에 반영합니다.

1. build/test ID는 `bt-`로 시작해야 합니다.
   Runner가 ID를 직접 만들면 사용자가 이 규칙을 몰라도 됩니다.

2. `follow_up_task_generator.bat generate`의 positional 인자 호출에 문제가
   있었습니다. Runner는 named parameter 방식으로 PowerShell script를 직접
   호출하거나, WF-407에서 wrapper를 고쳐야 합니다.

3. 진행/heartbeat는 Session Supervisor와 Result Collector에서 확인할 수
   있었습니다. Runner는 이 정보를 하나의 진행 카드로 요약해야 합니다.

## WF-407 완료 기준

WF-407 구현은 최소한 다음을 만족해야 합니다.

- `pc_runner.bat status/plan/start/continue/read` 존재
- Runner 산출물이 `_Temp/AIWorkflowRuntime/tasks/<task_id>/runner/` 아래 생성됨
- 승인되지 않은 P0/P1/high-risk task 실행 거부
- validation profile로 안전한 smoke 실행 가능
- 모든 하위 산출물 ID를 Runner가 직접 생성
- 성공 smoke에서 VerificationReport와 Completion Card 생성
- Completion Card 이후 사용자 완료 판단 지점에서 정지
- `accept_completion` 또는 `accept_with_concerns` finalization 이후에만 continue로 auto approval evaluation과 follow-up plan 생성 가능
- task done, commit, push, Backlog task 생성은 자동으로 하지 않음
- `_Temp`, `_Local`, `node_modules`, `.env`, local config가 추적되지 않음

## 다음 작업

이 설계를 사용자가 받아들이면 다음은 구현입니다.

```text
WF-407 Implement unified PC Runner orchestration entrypoint
```

# WF-412 검토된 우려 Finalization 경로

## 요약

WF-412는 `CONCERNS`가 있지만 blocker나 failed check가 없는 CompletionReport를
사람이 명시적으로 검토하고 수락하는 감사 경로를 추가합니다.

예를 들어 workflow tool 작업에서 큰 diff가 예상되는 경우, runner는 올바르게
사람 검토를 요구합니다. 사람이 그 우려를 확인하고 받아들일 수 있다고 판단하면
PC Runner가 post-finalization 단계로 이어갈 수 있어야 합니다.

## 결정 모델

지원하는 수락 결정은 다음 두 가지입니다.

```text
accept_completion
accept_with_concerns
```

`accept_completion`은 기존의 깨끗한 완료 수락 경로입니다.

`accept_with_concerns`는 아래 조건을 모두 만족할 때만 허용합니다.

- CompletionReport가 존재합니다.
- `verification_summary.verdict`가 `CONCERNS`입니다.
- `completion_state`가 `needs_human_decision`입니다.
- `human_decision_required`가 true입니다.
- concern이 하나 이상 있습니다.
- blocker가 없습니다.
- failed check가 없습니다.

blocked, failed, missing 상태이거나 이 조건과 맞지 않는 보고서는 계속 거부합니다.

## 실행 동작

FinalizationLog는 다음을 기록합니다.

- 최종 결정
- finalization state
- 참조한 CompletionReport
- 사람이 검토해 수락한 concerns
- blocker 및 failed-check 개수
- task lifecycle state를 바꾸지 않았다는 invariant

새 finalization state는 다음과 같습니다.

```text
completion_accepted_with_concerns_pending_task_done
```

PC Runner `continue`는 이제 아래 수락 상태 이후에만 진행합니다.

```text
completion_accepted_pending_task_done
completion_accepted_with_concerns_pending_task_done
```

reject, request-changes, defer, 누락된 finalization, 잘못된 finalization 기록은
human gate에서 멈추며 Auto Approval Policy나 Follow-up Task 생성으로 넘어가지 않습니다.

## Discord 명령

Discord finalization 명령에 다음 경로가 추가됩니다.

```text
/ai finalization accept-concerns id:<task_id> completion-report-id:<id>
```

이 명령은 내부적으로 다음 결정으로 기록됩니다.

```text
accept_with_concerns
```

## 안전 경계

이 경로는 다음을 하지 않습니다.

- task done 처리
- 구현 범위 승인
- blocker 또는 failed check 완화
- commit 또는 push
- Backlog task 직접 생성
- Human Director 권한 우회

이 경로의 목적은 검토된 우려를 명시적으로 감사 로그에 남기고, 모든 `CONCERNS`
보고서를 무조건 막힌 상태로 남기지 않도록 하는 것입니다.

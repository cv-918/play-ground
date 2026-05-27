# 역할 직원 Intake 계약

## 목적

이 문서는 역할 채팅 또는 미래의 역할 직원 자동화가 Handoff Queue를 어떻게 수거해야 하는지 정의한다.

AIWorkflow Handoff Integration의 Phase 10A 문서다.

## 역할 직원 정의

역할 직원은 다음 중 하나다.

- Planner, Developer, Artist, Reviewer, QA로 행동하는 역할 채팅
- 그 역할 경계 안에서 행동하는 미래의 자동화

채팅에 역할 이름이 붙어 있다고 해서 자동으로 신뢰하지 않는다.

역할 직원은 관측 가능한 파일 기반 intake 규칙을 따라야 한다.

## 필수 Intake 순서

작업하기 전에 역할 직원은 다음을 확인한다.

1. `_Docs/Handoff/Dashboard.md`
2. `_Docs/Handoff/Queues/<Role>.md`
3. 대상 Packet의 `manifest.yaml`
4. 해당 역할 요청 문서
5. `_Docs/Handoff/Role_Routines/` 아래의 해당 역할 루틴

역할 직원은 자기 Queue를 확인하기 전에 사람에게 “어디를 보면 되나요?”라고 다시 묻지 않는다.

## Queue 상태 규칙

### Waiting User Approval

역할 직원은 작업을 실행하면 안 된다.

승인 대기 요청을 요약하고 사람의 결정을 요청할 수만 있다.

### Ready Work

역할 직원은 Packet을 읽고 Intake 결정 또는 계획을 작성할 수 있다.

`Ready`는 소스 수정, JSON 수정, 런타임 변경, 빌드/테스트 실행, approval evidence 설정, `Done` 처리, commit, push를 승인하지 않는다.

### In Progress

역할 직원은 다음 조건에서만 계속 진행할 수 있다.

- 자신이 current owner, claimed role이거나 사용자가 명시적으로 지시했다
- 작업이 여전히 승인된 범위 안에 있다
- 필요한 승인이 이미 기록되었거나 필요 없는 작업이다

### Review Requested

Reviewer 성격의 작업만 이 섹션에서 진행한다.

역할 직원은 `ReviewRequest.md`와 관련 Results 문서를 읽은 뒤 리뷰 결과를 내야 한다.

### QA Requested

QA 성격의 작업만 이 섹션에서 진행한다.

역할 직원은 `QARequest.md`, Results 문서, 검증 기록을 읽은 뒤 QA 결과를 내야 한다.

### Blocked

역할 직원은 block을 우회하면 안 된다.

blocker를 요약하고 다음 사람 또는 역할 결정을 제안할 수 있다.

## Intake Decision 필수

작업 전에 역할 직원은 Intake Decision을 작성해야 한다.

Intake Decision은 채팅에 작성할 수 있고, 오래 남길 필요가 있으면 다음 경로에 작성한다.

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
```

Intake Decision에는 다음이 들어가야 한다.

- 역할
- Handoff ID
- Queue 섹션
- Packet 상태
- 읽은 문서
- 이 역할이 유효한 대상인지
- 승인이 필요한지
- 허용되는 다음 행동
- 금지 행동
- 멈춰야 하는 조건

## Stop 조건

역할 직원은 다음 상황에서 멈춘다.

- Packet이 자기 Queue에 없고, 사용자가 명시적으로 지시하지 않았다
- manifest가 없거나 구조적으로 유효하지 않다
- 해당 역할이 대상, owner, reviewer/QA 요청 역할이 아니다
- `WaitingUserApproval`인데 사용자 승인이 없다
- 명시 승인 없이 코드, JSON, 런타임, 에셋, 빌드, 승인, `Done`, commit, push 작업이 필요하다
- `Violations/Open.md`에 해당 Packet의 Critical 또는 Major 문제가 있다
- 요청 작업이 `AGENTS.md` 또는 `_Docs/AIWorkflow/`와 충돌한다

## 자동화 경계

Phase 10A는 역할 직원 자동화를 만들지 않는다.

관측 가능한 intake 계약만 정의한다.

미래의 역할 직원 자동화는 이 계약을 사용할 수 있지만, claim, 수정, 실행, 완료 처리 전에는 별도 승인을 받아야 한다.

## 완료 기준

Phase 10A는 다음을 만족하면 완료다.

- 역할 직원 정의가 문서화됨
- Queue 상태 규칙이 문서화됨
- Intake Decision 요구사항이 문서화됨
- Stop 조건이 문서화됨
- 역할 직원 자동화는 명시적으로 범위 밖에 남음

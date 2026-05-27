# Handoff 승인 대기 흐름

## 목적

이 문서는 AI Role Handoff System의 Phase 13A, 즉 사용자 관점의 승인 대기 흐름을 정의한다.

목표는 단순하다.

```text
Packet이 승인을 기다릴 때, 사용자가 모든 Handoff 파일을 뒤지지 않아도 무엇을 결정해야 하는지 알 수 있어야 한다.
```

## 승인 대기 확인 경로

승인 대기는 다음 순서로 보여야 한다.

1. `_Docs/Handoff/Dashboard.md`
2. `_Docs/Handoff/00_Index.md`
3. Packet의 `manifest.yaml`
4. 연결된 승인 요청 문서, 보통 `Results/` 아래 문서

Dashboard와 Index는 찾는 곳이다.

승인 요청 문서는 판단하는 곳이다.

## 필수 승인 대기 상태

사용자 승인을 기다리는 Packet은 다음 상태를 가져야 한다.

```yaml
execution_status: WaitingUserApproval
approval_required: true
approval_state: Requested
approval_request_path: Results/<Role>Plan.md
approval_type:
  - FileModification
  - RuntimeBehavior
```

실제 approval type은 작업마다 달라질 수 있다.

## Dashboard / Index 규칙

승인 대기 행에는 다음이 보여야 한다.

- Handoff ID
- 담당 역할
- 제목
- 승인 요청 문서 경로
- 마지막 갱신 날짜

사용자가 어떤 문서를 읽어야 하는지 알 수 없다면 승인 대기 표시는 불완전한 것이다.

## 승인 요청 문서 규칙

승인 요청 문서는 결정 메모처럼 읽혀야 한다.

반드시 포함할 것:

- 실제로 무엇이 바뀌는가
- 왜 필요한가
- 플레이어, 작업 흐름, 데이터, 저장소 관점에서 무엇이 달라지는가
- 예상 수정 파일 또는 경로
- 건드리지 않을 파일 또는 경로
- 데이터/schema 영향
- runtime 영향
- 검증 계획
- 위험
- 정확한 결정 선택지
- 복사해서 쓸 수 있는 승인 문장 예시

다음처럼 요청하면 안 된다.

```text
코드 변경 승인 필요.
런타임 동작 변경 승인 필요.
```

이것은 게이트 이름일 뿐, 사용자가 판단할 변경 내용이 아니다.

## 결정 선택지

사용자의 일반 선택지는 세 가지다.

### 승인

제안된 변경과 범위가 괜찮을 때 사용한다.

권장 문장:

```text
<Handoff ID> <Request Document> 승인. 제안된 범위와 검증 계획대로 진행해.
```

### 거절

제안된 변경을 진행하면 안 될 때 사용한다.

권장 문장:

```text
<Handoff ID> <Request Document> 거절. 이 변경은 진행하지 마.
```

### 범위 수정

방향은 괜찮지만 허용 범위를 바꿔야 할 때 사용한다.

권장 문장:

```text
<Handoff ID> <Request Document> 범위 수정. <허용할 것>만 진행하고 <금지할 것>은 하지 마.
```

## 승인 범위 규칙

승인은 설명된 범위에만 적용된다.

구현 중 승인 범위 밖의 파일, 동작, schema, asset, build step, validation action이 필요해지면 역할은 멈추고 확장 승인을 요청해야 한다.

## 승인 증거 규칙

명시적인 사용자 결정만 approval evidence가 될 수 있다.

기획 승인은 구현 승인이 아니다.

`Ready` Packet은 구현 승인이 아니다.

자동화 run report는 구현 승인이 아니다.

## Supervisor 검사 규칙

Phase 13C는 승인 요청 문서에 대한 좁은 Supervisor 검사를 추가한다.

Packet이 사용자 승인을 기다릴 때, Supervisor는 연결된 요청 문서에 Phase 13A 필수 섹션이나 승인/거절/범위 수정 선택지가 빠져 있으면 consistency issue로 보고할 수 있다.

이 검사는 구조와 명확한 누락만 확인한다. 문장 품질을 평가하거나 Packet을 자동으로 승인, 거절, 완료, 수정하지 않는다.

## 사용자에게 설명할 때의 순서

사용자가 승인 대기 항목에서 무엇을 해야 하는지 물으면 assistant는 다음 순서로 답한다.

1. 이 변경이 실제로 무엇을 하는지 말한다.
2. 어떤 파일 또는 시스템이 범위 안인지 말한다.
3. 무엇을 하지 않을 것인지 말한다.
4. 위험을 말한다.
5. 승인, 거절, 범위 수정 선택지를 제시한다.
6. 복사해서 쓸 수 있는 승인, 거절, 범위 수정 문장을 제공한다.

## 완료 기준

Phase 13A는 다음 조건을 만족하면 완료다.

- 승인 대기 확인 경로가 문서화됨
- 필수 승인 대기 상태가 문서화됨
- 승인 요청 템플릿에 사용자 결정 가이드가 포함됨
- 역할 루틴이 이 흐름을 참조함
- 사용자 가이드에 Phase 13A 완료가 기록됨

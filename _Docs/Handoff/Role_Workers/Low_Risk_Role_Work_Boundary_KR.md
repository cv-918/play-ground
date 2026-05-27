# 낮은 위험 역할 작업 경계

## 목적

이 문서는 미래에 자동화 후보로 볼 수 있는 낮은 위험 역할 직원 작업을 정의한다.

AIWorkflow Handoff Integration의 Phase 11A 문서다.

## 중요한 경계

이 문서는 역할 직원 자동화를 승인하지 않는다.

별도 사용자 승인 후 나중에 자동화할 수 있는 후보 범주만 정의한다.

그 별도 승인이 있기 전까지 역할 직원은 기존 Handoff intake, 승인, stop 규칙을 따라야 한다.

## 낮은 위험 정의

역할 직원 작업은 다음 조건을 모두 만족할 때만 낮은 위험이다.

- `_Docs/Handoff/` 또는 `_DevLog/WorkLog/` 안에 머문다
- 게임 소스를 변경하지 않는다
- 게임플레이 JSON을 변경하지 않는다
- 에셋을 변경하지 않는다
- 빌드 설정을 변경하지 않는다
- 런타임 동작을 변경하지 않는다
- approval evidence를 설정하지 않는다
- Packet을 claim하지 않는다
- 작업을 `Done` 처리하지 않는다
- commit 또는 push하지 않는다
- 다른 역할 채팅을 깨우거나 제어하지 않는다
- 검토 가능한 텍스트 산출물을 만든다
- 문서 수정 또는 삭제로 되돌릴 수 있다

조건 중 하나라도 거짓이면 낮은 위험이 아니다.

## 낮은 위험 후보 범주

### 읽기 전용 보고

허용 후보:

- Dashboard 상태 요약
- 역할 Queue 상태 요약
- Waiting User Approval 항목 요약
- Consistency Issues 요약
- active 또는 blocked Packet 요약

파일 수정이 필요 없다.

### Intake Decision 초안 작성

허용 후보:

- Intake Decision 초안 작성
- 관련 Queue 섹션 식별
- 읽은 문서 목록 작성
- 필요한 승인 목록 작성
- 금지 행동 목록 작성
- stop 또는 planning 진행 권장

허용 경로 후보:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
```

이 작업은 Packet claim 또는 실행 승인을 의미하지 않는다.

### Harness 리포트 작성

허용 후보:

- Contract Check 실행 리포트 작성
- Blind Scenario 실행 리포트 작성
- Intake Decision 리뷰 리포트 작성

허용 경로 후보:

```text
_Docs/Handoff/Role_Workers/Harness/Runs/
```

이 기록은 준비 상태 증거일 뿐이다.

### 계획 초안 작성

허용 후보:

- Developer 계획 초안
- Artist 요청 계획 초안
- Reviewer 체크리스트 초안
- QA 체크리스트 초안
- Planner handoff outline 초안

이 초안은 Packet 상태, approval evidence, source, JSON, asset, runtime behavior를 변경하면 안 된다.

### 확인 요청

허용 후보:

- Packet 맥락이 부족할 때 확인 요청 작성
- blocker 조건 요약
- 사용자에게 물어볼 질문 제안

상태 갱신이 별도 승인되지 않았다면 Packet을 `Blocked`로 이동하면 안 된다.

## 낮은 위험이 아닌 것

다음은 낮은 위험이 아니다.

- 소스 코드 수정
- 게임플레이 JSON 수정
- JSON schema 변경
- save/load 동작 변경
- 런타임 동작 변경
- actor 또는 scene lifecycle 변경
- 에셋 생성 또는 교체
- 빌드/테스트 실행
- approval evidence 변경
- Packet claim 변경
- `delivery_status` 또는 `execution_status` 변경
- `Done` 또는 `Archived` 처리
- Supervisor 밖에서 생성 상태 표면 편집
- `00_Index.md` 운영 상태 재작성
- commit
- push
- 역할 채팅 깨우기 또는 제어

## 역할별 예시

### Planner

낮은 위험 후보:

- PlanningBrief 초안 작성
- Handoff Packet outline 초안 작성
- 역할 요청 문구 초안 작성

낮은 위험이 아님:

- 승인 없이 Packet을 `Ready`로 공개
- manifest 상태 자동 변경
- 구현 범위 승인

### Developer

낮은 위험 후보:

- 구현 계획 초안 작성
- Intake Decision 초안 작성
- 확인할 가능성이 있는 파일 범위 식별

낮은 위험이 아님:

- 소스 코드 수정
- 게임플레이 JSON 수정
- 완료 증거로 빌드/테스트 실행
- 구현 완료 처리

### Artist

낮은 위험 후보:

- art request 응답 초안 작성
- 필요한 리소스 조건 목록화
- 누락된 레퍼런스 식별

낮은 위험이 아님:

- 에셋 파일 생성, 교체, commit
- 리소스 경로 변경
- art delivery 완료 처리

### Reviewer

낮은 위험 후보:

- 리뷰 체크리스트 초안 작성
- 리뷰가 필요한 파일 요약
- 리뷰 질문 분류

낮은 위험이 아님:

- 검증되지 않은 소스 변경에 대해 리뷰 통과 처리
- Packet 라우팅 변경
- 위험 구현 승인

### QA

낮은 위험 후보:

- QA 체크리스트 초안 작성
- 필요한 수동 테스트 증거 요약
- 사용자가 명시적으로 제공한 QA 증거 기록

낮은 위험이 아님:

- 증거 없이 validation passed 주장
- 자동 완료 게이트로 빌드/테스트 실행
- Packet `Done` 처리

## 낮은 위험 자동화 후보의 필수 출력

미래의 낮은 위험 역할 직원 자동화는 다음을 보고해야 한다.

- 역할
- Handoff ID
- Queue 섹션
- 작업 범주
- 읽은 파일
- 작성한 파일, 있다면
- 승인 상태
- stop 조건, 있다면
- 금지 행동을 수행하지 않았다는 확인

## 에스컬레이션 규칙

낮은 위험 후보 작업 중 위험 작업이 필요하다고 발견되면 멈추고 승인 요청 또는 blocker 요약을 작성한다.

스스로 범위를 넓혀 계속 진행하면 안 된다.

## 완료 기준

Phase 11A는 다음을 만족하면 완료다.

- 낮은 위험 후보 범주가 문서화됨
- 낮은 위험이 아닌 행동이 문서화됨
- 역할별 예시가 문서화됨
- 미래 낮은 위험 자동화의 필수 출력이 문서화됨
- 역할 직원 자동화는 생성되지 않음

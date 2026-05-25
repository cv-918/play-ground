# Handoff 상태 갱신 경계

## 목적

이 문서는 Phase 6의 문서-only Handoff 상태 갱신 경계를 정의한다.

Phase 6이 답하는 질문은 다음이다.

```text
향후 assistant가 Handoff 문서를 갱신할 수 있다면,
정확히 무엇을 갱신할 수 있고 무엇은 여전히 금지되는가?
```

이 문서는 경계 정의다. 자동화 스크립트, 스케줄 작업, 백그라운드 감시자, 실행 도구를 구현하지 않는다.

## Phase 6 경계

Phase 6에서는 사용자가 명시적으로 요청했거나, 이후 승인된 루틴이 정확히 그 권한을 부여한 경우에 한해 `_Docs/Handoff/` 내부 문서-only 갱신을 고려할 수 있다.

Phase 6에서도 다음은 허용하지 않는다.

- 소스 코드 변경
- 게임플레이 JSON 변경
- JSON 스키마 변경
- 런타임 동작 변경
- 빌드 설정 변경
- 에셋 생성 또는 교체
- 빌드 또는 테스트 실행
- 외부 서비스 호출
- Git 커밋 또는 푸시
- 자동 승인
- 검증되지 않은 작업의 자동 `Done`
- 백그라운드 스케줄링

## 허용 가능한 갱신 범주

Phase 6에서 고려할 수 있는 것은 아래의 문서-only Handoff 갱신뿐이다.

### Index 동기화

허용:

- `_Docs/Handoff/00_Index.md`에 Packet 행 추가
- manifest와 같은 상태로 Packet 행 갱신
- manifest를 기준으로 `Waiting User Approval` 항목 추가 또는 제거
- `CompletionNotice.md`가 있을 때 최근 완료 노티 추가

금지:

- Packet에 기록되지 않은 상태를 만들어내기
- 승인 대기 작업 숨기기
- 증거 없이 막힌 작업 제거하기

### Claim 메타데이터

허용:

- `current_owner` 설정
- `claimed_by` 설정
- `claimed_at` 설정
- `delivery_status: Claimed` 설정
- `execution_status: Planning` 설정

허용 조건:

- 해당 역할이 `to_roles`에 있거나, 사용자가 명시적으로 배정했다.
- 이미 다른 사람이 claim한 Packet이 아니거나, 사용자가 재배정을 승인했다.

### 계획 및 결과 문서 생성

허용:

- `Results/DeveloperPlan.md` 생성
- `DeveloperResult.md`, `ArtistDelivery.md`, `ReviewResult.md`, `QAResult.md` 같은 역할 결과 문서 생성
- 승인 요청 문서 생성
- 완료 기준을 만족했거나 명시적으로 보류한 뒤 `CompletionNotice.md` 생성

금지:

- 증거 없이 검증 통과라고 주장하기
- 계획만 있는데 구현 완료로 표시하기

### 승인 대기 갱신

허용:

- `risk_level: High` 설정
- `approval_required: true` 설정
- `approval_state: Requested` 설정
- `execution_status: WaitingUserApproval` 설정
- `approval_request_path` 설정
- `00_Index.md`의 `Waiting User Approval`에 Packet 등록

허용 조건:

- 실질 변경 내용 기반 승인 요청 문서가 존재하거나 같은 문서-only 갱신에서 생성된다.

금지:

- `approval_state: Approved` 설정
- `approval_evidence` 채우기
- 기획 승인을 실행 승인으로 취급하기

### 리뷰 및 QA 라우팅

허용:

- 리뷰 요청 문서가 있을 때 `execution_status: ReviewRequested` 설정
- QA 요청 문서가 있을 때 `execution_status: QARequested` 설정
- `delivery_status`를 `ReviewRequested` 또는 `QARequested`로 갱신

금지:

- `ReviewResult.md` 없이 리뷰 통과 처리
- `QAResult.md` 없이 QA 통과 처리

### Done 또는 Archived 갱신

허용:

- 완료 기준을 만족했거나 명시적으로 보류했을 때만 `delivery_status: Done`과 `execution_status: Done` 설정
- `00_Index.md`에 최근 완료 노티 추가
- Packet이 대체되었거나 비활성이고 사유가 기록되었을 때만 `delivery_status: Archived` 설정

금지:

- 승인, 리뷰, QA, 검증, 남은 위험 기록이 빠졌는데 `Done` 처리
- 승인 대기 중인 active 작업 archive 처리

## 필수 갱신 기록

중요한 문서/상태 갱신은 다음을 기록해야 한다.

- 무엇이 바뀌었는가
- 왜 바뀌었는가
- 어떤 Packet이 영향을 받았는가
- 승인이 필요했는가
- 승인이 기록되었는가
- 무엇은 바꾸지 않았는가
- 남은 위험은 무엇인가

기록 형식은 `_Docs/Handoff/Status_Updates/_Status_Update_Record_Template_KR.md`를 사용한다.

작은 같은 문서 내 수정은 Packet 결과 문서나 DevLog에 기록해도 된다.

## 사용자 승인 규칙

Phase 6은 승인 요구를 제거하지 않는다.

다음 작업 전에는 여전히 사용자 승인이 필요하다.

- 소스 코드 구현
- JSON 스키마 변경
- 런타임 동작 변경
- 빌드/테스트 실행
- 커밋 또는 푸시
- 승인된 Phase 6 범위를 벗어나는 워크플로우 규칙 변경

승인은 명시적이고 범위가 제한되어야 한다.

## 스캐너와의 관계

Phase 5 스캐너 보고서는 갱신을 제안할 수 있다.

Phase 6 상태 갱신 동작은 다음 조건에서만 갱신을 적용할 수 있다.

- 사용자가 해당 갱신을 요청했다.
- 또는 이후 승인된 루틴이 정확히 그 문서-only 갱신 권한을 부여했다.

스캐너 보고서 자체는 파일 쓰기 권한이 아니다.

## Phase 6 완료 기준

Phase 6은 다음을 만족하면 완료다.

- 상태 갱신 경계가 문서화되었다.
- 허용/금지 갱신이 명확하다.
- 갱신 기록 템플릿이 존재한다.
- Handoff guide와 index가 경계 문서를 연결한다.

실제 자동화 스크립트를 추가하거나 실행 권한을 확장하면 Phase 6 범위를 벗어난다.

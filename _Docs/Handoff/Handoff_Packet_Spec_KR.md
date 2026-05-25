# Handoff Packet 명세

## 목적

Handoff Packet은 `_Docs/Handoff/Packets/` 아래에 만드는 구조화된 업무 전달 폴더다.

기획 브리프, 구현 요청, 승인 요청, 리소스 안내, 리뷰 요청, QA 요청, 결과, 완료 노티처럼 여러 문서가 함께 필요한 역할 간 전달 작업에 사용한다.

작은 단발성 전달은 기존 카테고리 폴더를 계속 사용할 수 있다. 하지만 여러 역할이 얽히거나 승인 대기가 필요한 작업은 Packet을 기본으로 사용한다.

## Packet 폴더 이름

형식은 다음과 같다.

```text
HANDOFF-YYYYMMDD-###-short-slug
```

예:

```text
HANDOFF-20260525-001-attribute-node-tree
```

규칙:

- `YYYYMMDD`는 생성일이다.
- `###`은 해당 날짜의 세 자리 순번이다.
- `short-slug`는 소문자 ASCII 단어와 하이픈을 사용한다.
- 다른 문서가 링크한 뒤 폴더명을 바꾸면, 같은 변경에서 색인도 함께 갱신해야 한다.

## 표준 폴더 구조

```text
_Docs/Handoff/Packets/
  HANDOFF-YYYYMMDD-###-short-slug/
    manifest.yaml
    PlanningBrief.md
    ImplementationRequest.md
    ArtRequest.md
    ReviewRequest.md
    QARequest.md
    CompletionNotice.md
    ResourceNotes/
      ResourceNotes.md
    Results/
      PlannerResult.md
      DeveloperPlan.md
      DeveloperResult.md
      ArtistDelivery.md
      ReviewResult.md
      QAResult.md
```

필요한 문서만 만든다.

`manifest.yaml`은 필수다.

`ResourceNotes/`에는 리소스 위치, 사용 조건, 전달 안내를 기록한다. 사용자가 명시적으로 승인하지 않는 한 대용량 원본 바이너리 리소스를 여기에 넣지 않는다. 실제 에셋은 프로젝트 리소스 폴더나 외부 저장소에 둔다.

## 필수 Manifest

모든 Packet에는 다음 파일이 있어야 한다.

```text
manifest.yaml
```

manifest는 기계적으로 읽기 쉬운 요약이다. 전체 요청 문서를 대체하지 않는다.

`_Docs/Handoff/Packets/_Manifest_Template.yaml`을 시작점으로 사용한다.

## 상태 모델

Packet 상태는 두 책임으로 분리한다.

```text
delivery_status = 역할 간 전달 흐름에서의 상태
execution_status = 받는 역할의 계획, 승인, 실행, 리뷰, 완료 상태
```

이렇게 분리하면 `Ready`가 실행 승인으로 오해되는 문제를 줄일 수 있다.

### Delivery Status 값

- `Draft`: Packet 작성 중
- `Ready`: 받는 역할이 확인할 준비 완료
- `Claimed`: 특정 역할이 Packet을 수거함
- `ReviewRequested`: 리뷰 대기
- `QARequested`: QA 대기
- `Done`: Handoff 전달 완료
- `Blocked`: 정보나 의존성이 부족해 전달 진행 불가
- `Archived`: 비활성 또는 대체됨

### Execution Status 값

- `NotStarted`: 받는 역할의 작업이 아직 시작되지 않음
- `Planning`: 받는 역할이 계획 중
- `WaitingUserApproval`: 명시적 사용자 승인을 기다리는 중
- `InProgress`: 승인된 작업 또는 낮은 위험 작업 진행 중
- `ReviewRequested`: 리뷰 요청
- `QARequested`: QA 요청
- `Done`: 받는 역할의 범위 작업 완료
- `Blocked`: 실행 막힘

### Index 표시 매핑

`_Docs/Handoff/00_Index.md`를 갱신할 때는 다음 기준을 사용한다.

| Manifest 상태 | Index 표시 상태 |
| --- | --- |
| `execution_status: WaitingUserApproval` | `Waiting User Approval` |
| `delivery_status: Draft` | `Draft` |
| `delivery_status: Ready`이고 실행 시작 전 | `Ready` |
| `delivery_status: Claimed` 또는 `execution_status: Planning` | `In Progress` |
| `execution_status: ReviewRequested` | `Review Requested` |
| `execution_status: QARequested` | `QA Requested` |
| `delivery_status: Done`이고 `execution_status: Done` | `Done` |
| 막힘 상태 | `Blocked` |
| `delivery_status: Archived` | `Archived` |

## 승인 필드

높은 위험 작업은 manifest 승인 필드와 사람이 읽는 승인 요청 문서를 함께 사용해야 한다.

승인 대기 시 필요한 manifest 필드 예:

```yaml
risk_level: High
approval_required: true
approval_state: Requested
approval_request_path: Results/DeveloperPlan.md
approval_type:
  - FileModification
  - RuntimeBehavior
```

승인 요청은 `Handoff_System_Principles_KR.md`의 실질 변경 내용 기반 승인 요청 규칙을 따라야 한다.

승인 게이트 이름만 쓰지 말고, 실제로 무엇을 바꾸려는지 설명해야 한다.

## AIWorkflow 연결

Packet은 AIWorkflow 기록을 링크할 수 있지만, AIWorkflow를 대체하지 않는다.

`aiworkflow_links`에는 다음을 연결할 수 있다.

- task request
- ActiveTask
- proposal
- decision
- work order
- DevLog

Packet이 AIWorkflow와 충돌하면 작업을 멈추고 충돌을 보고한다.

## 허용 경로와 금지 경로

`allowed_paths`와 `forbidden_paths`는 예상 작업 경계를 설명한다.

이 필드 자체는 자동 승인이 아니다.

실행 중 `allowed_paths` 밖의 경로가 필요해지면, 역할은 멈추고 범위 승인을 다시 받아야 한다.

## Packet 완료 기준

Packet은 다음 조건을 만족할 때만 `Done`으로 이동할 수 있다.

- 필요한 승인이 기록되었다.
- `Results/` 또는 `CompletionNotice.md`에 결과가 기록되었다.
- 검증을 수행했거나 명시적으로 보류했다.
- 리뷰와 QA 요구를 처리했거나 명시적으로 보류했다.
- 남은 위험을 기록했다.
- 의미 있는 작업이면 관련 DevLog가 존재한다.

파일이 수정되었다는 이유만으로 `Done`으로 표시하지 않는다.

## Phase 2 범위

이 명세는 AIWorkflow Handoff Integration의 Phase 2다.

Phase 2는 Packet 구조와 manifest 필드를 정의한다.

Phase 2에서는 다음을 구현하지 않는다.

- 역할별 루틴
- 읽기 전용 스캐너 자동화
- claim/status 자동화
- 코드, JSON, 에셋, 런타임 실행 자동화
- 커밋 또는 푸시 자동화

# Handoff Guide

## 목적

이 문서는 `_Docs/Handoff/`를 사용하는 기본 흐름을 설명한다.

`_Docs/Handoff/`는 기획, 개발, 아트, 리뷰, QA 같은 역할 간 전달물을 모아두는 공용 교환소다. 기존 AIWorkflow를 대체하지 않고, 작업을 넘겨받는 역할이 필요한 자료를 빠르게 확인할 수 있도록 돕는다.

이 시스템의 고정 이름은 `AI Role Handoff System`이며, 통합 작업명은 `AIWorkflow Handoff Integration`이다. 운영 원칙은 `Handoff_System_Principles.md`와 `Handoff_System_Principles_KR.md`를 기준으로 한다.

구조화된 다중 문서 전달은 `Packets/` 아래의 Handoff Packet을 사용한다. Packet 구조와 manifest 규칙은 `Handoff_Packet_Spec.md`와 `Handoff_Packet_Spec_KR.md`를 기준으로 한다.

역할별 채팅은 `Role_Routines/` 아래의 자기 역할 루틴을 읽고 작업한다.

Handoff 현황 확인은 `ReadOnly_Scanner_Design.md`와 `ReadOnly_Scanner_Design_KR.md`의 읽기 전용 스캐너 규칙을 따른다.

Handoff 문서나 상태를 갱신할 때는 `Status_Update_Boundaries.md`와 `Status_Update_Boundaries_KR.md`의 경계를 따른다.

사람이 빠르게 읽는 HTML 사용 가이드는 `Guide/Handoff_System_User_Guide_KR.html`에 보관한다.

## 기본 원칙

- AIWorkflow를 대체하지 않는다.
- `_Docs/AIWorkflow/`는 계속 AI 작업 절차와 운영 규칙의 기준이다.
- `_DevLog/`는 완료된 작업, 조사, 수정, 회고 기록을 남기는 위치다.
- `_Docs/Handoff/`는 역할 간 전달물, 준비물, 요청, 완료 노티를 모아두는 위치다.
- 전달 문서는 받는 역할이 바로 다음 행동을 알 수 있게 작성한다.
- `Ready`는 받는 역할이 확인할 준비가 되었다는 뜻이지, 코드/데이터/런타임 변경 승인이 아니다.
- 높은 위험 작업은 `Waiting User Approval` 상태로 눈에 보이게 멈춘다.
- 승인 요청은 게이트 이름만 말하지 않고, 실제로 무엇을 바꾸려는지 설명한다.
- 검증하지 않은 내용을 완료 또는 통과로 기록하지 않는다.
- 대용량 원본 리소스는 적절한 프로젝트 리소스 폴더나 외부 저장소에 두고, Handoff에는 위치와 사용 조건을 기록한다.

## 기본 사용 흐름

1. 전달할 작업을 `_Handoff_Template_KR.md` 기준으로 작성한다.
2. 문서 성격에 맞는 하위 폴더에 저장한다.
3. `00_Index.md`의 `Active Handoffs`에 등록한다.
4. 넘겨받는 역할은 전달 문서의 `Required Inputs`, `Acceptance Criteria`, `Next Action`을 먼저 확인한다.
5. 진행 상태가 바뀌면 전달 문서와 `00_Index.md`의 상태를 갱신한다.
6. 완료되면 필요에 따라 `Done/`으로 이동한다.
7. 더 이상 active하게 참조하지 않는 문서는 `Archive/`로 이동한다.

## Packet 사용 흐름

여러 문서, 여러 역할, 승인 요청, 결과 문서가 필요한 작업은 Packet으로 만든다.

1. `_Docs/Handoff/Packets/` 아래에 `HANDOFF-YYYYMMDD-###-short-slug` 폴더를 만든다.
2. `Packets/_Manifest_Template.yaml`을 복사해 Packet 폴더의 `manifest.yaml`로 사용한다.
3. 필요한 문서만 만든다. 예: `PlanningBrief.md`, `ImplementationRequest.md`, `Results/DeveloperPlan.md`.
4. `00_Index.md`의 `Packet Index`에 등록한다.
5. 높은 위험 작업이면 `execution_status: WaitingUserApproval`과 승인 요청 문서를 작성한다.
6. 승인 요청 중인 항목은 `00_Index.md`의 `Waiting User Approval`에도 등록한다.
7. 결과와 완료 기준은 `Results/` 또는 `CompletionNotice.md`에 기록한다.

## 역할별 루틴

각 역할 채팅은 공통 루틴과 자기 역할 루틴을 따른다.

| 역할 | 루틴 문서 |
| --- | --- |
| 공통 | `Role_Routines/Role_Routine_Overview.md` |
| Planner | `Role_Routines/Planner_Routine.md` |
| Developer | `Role_Routines/Developer_Routine.md` |
| Artist | `Role_Routines/Artist_Routine.md` |
| Reviewer | `Role_Routines/Reviewer_Routine.md` |
| QA | `Role_Routines/QA_Routine.md` |

## 읽기 전용 스캔

Handoff 상태를 확인할 때는 읽기 전용으로만 스캔한다.

스캐너는 다음을 할 수 있다.

- `00_Index.md` 읽기
- `Packets/**/manifest.yaml` 읽기
- 역할별 작업 목록 요약
- 승인 대기 목록 요약
- 막힌 작업 요약
- 정합성 문제 보고

스캐너는 다음을 하면 안 된다.

- 파일 수정
- Packet claim
- 상태 갱신
- 승인 기록
- 완료 처리
- 빌드/테스트/도구 실행
- 커밋/푸시

요청 예시는 `Scanner/_Role_Query_Examples_KR.md`를 참고한다.

## 문서/상태 갱신 경계

문서-only 상태 갱신은 사용자가 명시적으로 요청했거나, 이후 승인된 루틴이 정확히 그 권한을 부여했을 때만 고려한다.

허용될 수 있는 갱신:

- `00_Index.md` 동기화
- Packet claim 메타데이터 갱신
- 계획/결과 문서 생성
- 승인 대기 상태 기록
- 리뷰/QA 라우팅
- 완료 또는 보관 기록

여전히 금지되는 것:

- 소스 코드 변경
- 게임플레이 JSON 또는 JSON 스키마 변경
- 런타임 동작 변경
- 빌드/테스트 실행
- 자동 승인
- 검증되지 않은 자동 `Done`
- 커밋/푸시

중요한 상태 갱신은 `Status_Updates/_Status_Update_Record_Template_KR.md` 형식으로 기록한다.

## 하위 폴더 선택 기준

| 폴더 | 사용할 때 |
| --- | --- |
| `Intake/` | 아직 분류되지 않은 신규 전달물 |
| `Packets/` | 구조화된 Handoff Packet 폴더 |
| `Role_Routines/` | 역할별 Handoff 작업 루틴 |
| `Scanner/` | 읽기 전용 Handoff 스캐너 보고 형식과 요청 예시 |
| `Status_Updates/` | 문서-only Handoff 상태 갱신 기록 템플릿 |
| `Planning/` | 기획/디자인 전달 문서 |
| `Resources/` | 아트, 사운드, UI, 데이터 등 리소스 전달 안내 |
| `Implementation/` | 개발자에게 넘기는 구현 요청 |
| `Review/` | 리뷰 요청, 리뷰 결과, 수정 요청 |
| `QA/` | QA 요청, 테스트 시나리오, QA 결과 |
| `Done/` | 완료 노티, 전달 완료 보고 |
| `Archive/` | 비활성 또는 대체된 전달 문서 |

## 상태 값

`00_Index.md`와 각 전달 문서에서 사용하는 기본 상태 값은 다음과 같다.

- `Draft`: 작성 중
- `Ready`: 넘겨받는 역할이 확인할 준비 완료
- `In Progress`: 넘겨받은 역할이 작업 중
- `Waiting User Approval`: 높은 위험 실행 전에 사용자 승인을 기다리는 상태
- `Review Requested`: 리뷰 요청 상태
- `QA Requested`: QA 요청 상태
- `Done`: 완료
- `Blocked`: 필요한 정보나 의존성이 없어 막힘
- `Archived`: 비활성 또는 대체됨

## 문서 작성 기준

좋은 전달 문서는 다음 질문에 답해야 한다.

- 누가 누구에게 넘기는가?
- 왜 넘기는가?
- 무엇을 해야 하는가?
- 포함 범위와 제외 범위는 무엇인가?
- 필요한 입력 자료는 어디에 있는가?
- 완료 기준은 무엇인가?
- 리뷰 또는 QA가 필요한가?
- 다음 사람의 첫 행동은 무엇인가?

## AIWorkflow와 연결할 때

Handoff 문서가 AIWorkflow 작업과 연결되는 경우, `Related AIWorkflow Task` 섹션에 관련 문서를 링크한다.

예:

- ActiveTask
- task request
- DevLog
- 관련 proposal, work order, decision 문서

단, Handoff 문서 자체를 AIWorkflow의 운영 규칙이나 실행 계약서로 취급하지 않는다. 실행 범위와 승인 조건은 해당 AIWorkflow 문서가 우선한다.

## 완료 처리 기준

완료 노티를 작성할 때는 다음을 명확히 적는다.

- 완료된 내용
- 변경된 파일 또는 리소스 위치
- 실행한 검증
- 실행하지 못한 검증
- 남은 위험
- 다음 역할이 확인해야 할 점

빌드, 런타임, QA를 실제로 수행하지 않았다면 수행하지 않았다고 적는다.

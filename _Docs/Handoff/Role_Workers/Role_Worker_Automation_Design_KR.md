# 역할 직원 자동화 설계

## 목적

이 문서는 AI Role Handoff System의 Phase 12A, 즉 미래 역할 직원 자동화 설계를 정의한다.

이 문서는 recurring automation을 생성하거나 승인하지 않는다.

나중에 사용자가 별도로 승인하면 Phase 12B에서 사용할 수 있는 안전한 v1 경계를 정한다.

## 설계 결정

v1에서는 먼저 하나의 낮은 위험 역할 직원 자동화를 사용한다.

권장 자동화 이름:

```text
playground-handoff-role-worker-low-risk
```

v1에서는 Planner, Developer, Artist, Reviewer, QA를 각각 별도 recurring automation으로 만들지 않는다.

첫 역할 직원 자동화는 모든 역할 Queue를 읽고, 안전한 후보에 대해서만 문서-only 보고서를 작성한다. 이렇게 하면 실행 스레드가 과도하게 늘어나는 문제와 여러 직원 자동화가 같은 Packet을 동시에 건드리는 문제를 줄일 수 있다.

## 기존 시스템과의 관계

```text
Handoff Supervisor
  -> Packet을 읽음
  -> Dashboard, Queues, Violations를 재생성
  -> 역할 작업은 수행하지 않음

Low-Risk Role Worker Automation
  -> Dashboard와 Queues를 읽음
  -> 대상 Packet을 읽음
  -> 낮은 위험 후보에 대해서만 intake/report 초안을 작성
  -> Packet 상태는 변경하지 않음

사용자
  -> 자동화 생성 승인
  -> 위험 작업 승인
  -> v1 완료 판정
```

역할 직원 자동화는 Supervisor를 대체하지 않는다.

Supervisor는 생성 상태 표면의 기준이고, 역할 직원 자동화는 그 표면을 소비한다.

## 초기 자동화 모드

첫 자동화 모드는 다음으로 제한한다.

```text
문서-only 낮은 위험 보고
```

허용 후보 작업:

- 역할 Queue 상태 요약
- Intake Decision 초안 작성
- Low-Risk Work Report 작성
- clarification 또는 blocker 요약 작성
- 상태나 approval evidence를 바꾸지 않는 planning draft 작성
- Role Worker automation run report 작성

금지 작업:

- 게임 소스 수정
- gameplay JSON 수정
- JSON schema 수정
- save/load 변경
- runtime behavior 변경
- actor 또는 scene lifecycle 변경
- asset 생성 또는 교체
- build 또는 test 실행
- approval evidence 변경
- Packet claim 변경
- `delivery_status` 또는 `execution_status` 변경
- `Done` 또는 `Archived` 처리
- 생성 Dashboard, Queue, Violation 수정
- `00_Index.md` 운영 상태 rewrite
- commit
- push
- 다른 역할 채팅 깨우기 또는 제어

## 입력

자동화는 다음을 읽을 수 있다.

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Packets/**/manifest.yaml`
- `ImplementationRequest.md`, `ReviewRequest.md`, `QARequest.md` 같은 Packet 요청 문서
- Handoff 이해에 필요한 Packet 결과 문서
- `_Docs/Handoff/Role_Workers/Role_Worker_Intake_Contract.md`
- `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary.md`
- `_Docs/Handoff/Role_Routines/*.md`

v1 낮은 위험 자동화는 게임 소스, gameplay JSON, asset 파일, local config, secret, build output, `_Temp/`를 읽지 않는다.

## 출력

허용 출력 경로:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
_Docs/Handoff/Packets/<handoff-id>/Results/
```

권장 run report 경로:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_LowRiskRoleWorker.md
```

권장 Packet 결과 경로:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>LowRiskWorkReport.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>ClarificationRequest.md
```

자동화는 이미 존재하는 사람이 작성한 결과 문서를 덮어쓰지 않는다.

대상 출력이 이미 있으면 run report에 `AlreadyPresent`로 기록하고 해당 출력은 건너뛴다.

## 후보 선택

자동화는 다음 조건을 모두 만족할 때만 Packet을 후보로 볼 수 있다.

- Packet이 역할 Queue에 표시된다
- `Violations/Open.md`에 해당 Packet의 Critical 또는 Major 문제가 없다
- 요청된 행동이 `Low_Risk_Role_Work_Boundary.md`의 낮은 위험 후보에 포함된다
- 검토 가능한 텍스트 작성만으로 완료할 수 있다
- 소스, JSON, 런타임, 에셋, 빌드, 승인, claim, Done, commit, push, 역할 채팅 제어가 필요하지 않다

자동화는 다음 항목은 무시하거나 보고만 하고 실행하지 않는다.

- `WaitingUserApproval` Packet
- manifest가 없거나 구조가 깨진 Packet
- 알 수 없는 역할이 포함된 Packet
- `_Docs/Handoff` 밖의 소스 또는 데이터 확인이 필요한 Packet
- fresh build, runtime, QA 실행이 필요한 Packet
- 다음 행동이 사용자 승인뿐인 Packet

## 중지 규칙

자동화는 다음 경우 해당 Packet에서 멈춘다.

- 낮은 위험 문서-only 작업으로 분류할 수 없다
- 승인이 필요하거나 요청된 상태다
- Packet이 상태 변경을 요구한다
- Packet이 approval evidence 변경을 요구한다
- 구현, 검증, commit, push를 요구한다
- 출력 경로가 기존 문서를 덮어쓰게 된다
- 생성된 Supervisor 표면이 오래되었거나 불일치해 보인다

멈춘다는 뜻:

- run report 항목을 남긴다
- 필요하면 blocker 또는 clarification 요약을 작성한다
- 위험 행동을 실행하지 않는다
- Packet을 Done 처리하지 않는다

## 반복 실행 안전 규칙

Recurring automation은 반복 실행되어도 안전해야 한다.

따라서:

- 기존 결과 문서를 덮어쓰지 않는다.
- 사람이 작성한 Packet 결과에 append하지 않는다.
- 재처리 방지를 위해 manifest 상태를 바꾸지 않는다.
- skipped, already-present, blocked 후보는 run report에 기록한다.
- 역할별 Packet 결과는 하나씩, 자동화 run report는 실행마다 timestamp를 붙여 남긴다.

## Phase 12B 생성 권장 범위

나중에 승인되면 Phase 12B는 다음 범위의 recurring automation 하나를 만든다.

- 주기: 사용자가 다르게 정하지 않으면 60분
- 상태: 사용자가 명시 승인하면 ACTIVE
- 모델: 사용자가 다르게 정하지 않으면 기본 Codex automation 모델
- 허용 쓰기: Role Worker automation run report와 낮은 위험 Packet result draft
- 금지 쓰기: 소스, JSON, 에셋, 생성 Supervisor 표면, manifest 상태, approval evidence, Done, Git

자동화 prompt는 자기완결적이어야 하며 금지 행동 목록을 명시해야 한다.

## Phase 12B 전에 사용자 결정이 필요한 것

실제 자동화를 만들기 전에 사용자는 다음을 결정해야 한다.

- 단일 low-risk Role Worker 자동화를 만들지
- 실행 주기
- ACTIVE 또는 PAUSED
- Packet `Results/` 초안까지 허용할지, run report만 허용할지

## 완료 기준

Phase 12A는 다음 조건을 만족하면 완료다.

- 단일 자동화 v1 설계가 문서화됨
- 허용 입력과 출력이 문서화됨
- 중지 규칙이 문서화됨
- 반복 실행 안전 규칙이 문서화됨
- Phase 12B 승인 질문이 문서화됨
- recurring Role Worker automation을 생성하지 않음

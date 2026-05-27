# Handoff Supervisor MVP

## 목적

Handoff Supervisor MVP는 AI Role Handoff System의 첫 번째 관측 가능한 자동화 계층이다.

이 도구는 구조화된 Handoff Packet을 읽고 다음 표면을 만든다.

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/<Role>.md`
- `_Docs/Handoff/Violations/Open.md`

Supervisor가 필요한 이유는 역할 채팅이 숨은 채팅 기억, 커스텀 지시, 매번 반복되는 수동 설명에만 의존하면 안 되기 때문이다. 저장소의 파일 상태만 봐도 어떤 일이 있고, 누구에게 가야 하고, 무엇이 승인 대기인지, 무엇이 구조적으로 잘못됐는지 보여야 한다.

## 도구 실행 지점

저장소 루트에서 실행한다.

```bat
tools\aiworkflow\handoff_supervisor.bat status
tools\aiworkflow\handoff_supervisor.bat scan --role Developer
tools\aiworkflow\handoff_supervisor.bat status --json
tools\aiworkflow\handoff_supervisor.bat write-docs
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

`write-docs`는 `--execute`가 없으면 파일을 쓰지 않고 쓰기 계획만 보여준다.

`write-docs --execute`는 Handoff 문서 표면만 갱신한다.

## 입력

Supervisor가 읽을 수 있는 것:

- `_Docs/Handoff/Packets/**/manifest.yaml`
- 각 manifest가 참조하는 Packet 문서
- `ImplementationRequest.md`, `ReviewRequest.md`, `QARequest.md`, `CompletionNotice.md` 같은 표준 Packet 파일
- 생성 표면을 설명하는 데 필요한 `_Docs/Handoff/` 메타 문서

MVP는 게임 소스, 게임플레이 JSON, 로컬 설정, 비밀값, 외부 서비스를 읽지 않는다.

## 생성 출력

### Dashboard

`_Docs/Handoff/Dashboard.md`는 사람이 보는 상태판이다.

표시 내용:

- 전체 Packet 수
- active Packet 수
- 사용자 승인 대기 수
- ready work 수
- in-progress 수
- blocked 수
- review/QA requested 수
- consistency issue 수
- 사용자 승인 대기 표
- ready work 표
- review requested 표
- QA requested 표
- blocked 표
- 역할별 queue 링크
- 최근 완료 Packet
- 전체 Packet index

### Role Queues

`_Docs/Handoff/Queues/<Role>.md`는 각 역할 채팅이 보는 업무 수거함이다.

초기 역할 queue:

- Planner
- Developer
- Artist
- Reviewer
- QA

역할 채팅은 사람에게 매번 “어디를 보면 되나요?”라고 묻기 전에 자기 queue를 확인해야 한다.

각 역할 queue는 다음 섹션을 직접 보여준다.

- 사용자 승인 대기
- ready work
- in progress
- review requested
- QA requested
- blocked
- 해당 역할의 전체 Packet

### Violations

`_Docs/Handoff/Violations/Open.md`는 Supervisor가 발견한 구조 문제를 모은다.

예:

- 필수 manifest 필드 누락
- 잘못된 status 값
- 알 수 없는 role
- Developer 대상인데 `ImplementationRequest.md` 없음
- Artist 대상인데 `ArtRequest.md` 없음
- Reviewer 대상인데 `ReviewRequest.md` 없음
- QA 대상인데 `QARequest.md` 없음
- `approval_required: true`인데 `approval_request_path` 없음
- `WaitingUserApproval`인데 승인 요청 문서 연결 없음
- Packet manifest가 `00_Index.md` Packet Index에 없음
- 오래된 `00_Index.md` Packet Index 또는 Waiting User Approval 행
- `Done`인데 `CompletionNotice.md` 없음

## 안전 경계

Supervisor MVP가 할 수 있는 것:

- Handoff Packet 메타데이터 읽기
- 단순 정합성 규칙 검사
- 채팅 또는 터미널에 상태 출력
- JSON 출력
- `write-docs --execute`가 사용된 경우 Dashboard, Queue, Violation Markdown 파일 생성

Supervisor MVP가 하면 안 되는 것:

- 게임 소스 코드 수정
- 게임플레이 JSON 수정
- JSON schema 변경
- 런타임 동작 변경
- 에셋 생성 또는 교체
- 빌드 또는 테스트 실행
- 사용자 승인 기록
- approval evidence 설정
- validation pass/fail 판단
- 검증 안 된 작업 Done 처리
- commit
- push
- 다른 역할 채팅 깨우기 또는 제어

## 이전 Phase와의 관계

Phase 5는 읽기 전용 scanner 동작을 정의했다.

Phase 6은 문서-only 상태 갱신 경계를 정의했다.

이 MVP는 그 둘을 제한적으로 결합한다.

```text
Packet 읽기
-> 보이는 상태 분류
-> 구조 문제 감지
-> Handoff-only 표면 생성
```

아직 구현 자동화는 수행하지 않는다.

## 현재 제한

- manifest reader는 의도적으로 단순하며 직선적인 YAML-like manifest 필드를 기대한다.
- 완전한 YAML 엔진이 아니다.
- Packet manifest를 생성 Dashboard와 Queue 상태의 기준으로 사용한다. `00_Index.md`는 사람이 관리하는 index와 감사 요약으로 남긴다.
- `00_Index.md`와 발견된 Packet manifest의 정합성을 점검하지만, index 행을 자동으로 고치지는 않는다.
- 스스로 주기 실행되지 않는다.
- Codex, ChatGPT, Copilot, 다른 역할 채팅을 트리거하지 않는다.
- 새 Packet을 만들지 않는다.

## 완료 기준

이 Supervisor MVP가 작동한다고 보려면 다음이 되어야 한다.

- `status`가 현재 Packet을 읽는다.
- `scan --role <Role>`이 역할별 업무를 필터링한다.
- `status --json`이 파싱 가능한 JSON을 반환한다.
- `write-docs`는 `--execute` 없이는 파일을 쓰지 않는다.
- `write-docs --execute`가 Dashboard, role queue, open violation을 갱신한다.
- 생성 파일이 승인 대기와 구조 문제를 표시해서 사람이 모든 Packet을 직접 뒤지지 않아도 된다.

## 다음 확장

첫 Planner to Developer Handoff Packet 후보는 사용자 판단으로 거절되어 커밋 전에 삭제했다.

```text
HANDOFF-20260526-001-m001-projectile-attack-pilot
```

대체 파일럿은 다음 Packet이다.

```text
HANDOFF-20260526-002-skill-shortcut-key-labels
```

이 Packet으로 다음 흐름을 검증했다.

```text
Planner가 승인된 기획 방향을 Packet으로 작성
-> Supervisor가 Ready work로 검출
-> DeveloperPlan 작성
-> Supervisor가 WaitingUserApproval로 검출
```

대체 파일럿의 Phase 7C는 완료되었다. 사용자가 DeveloperPlan을 승인한 뒤, 구현은 승인 요청서에 적힌 소스 파일 범위 안에서만 진행했고 Debug x64 빌드 검증과 사용자 런타임 QA를 통과했다. 현재 Packet은 `Done` 상태다.

Phase 7D는 완료되었다. Phase 7A부터 Phase 7C까지의 완료 커밋을 `origin/main`에 push했다.

Phase 8A는 운영 상태 표면을 개선한다. Dashboard와 역할별 Queue는 review/QA 라우팅을 별도 섹션으로 보여주고, `Handoff_Operational_Status_Policy_KR.md`는 manifest, `00_Index.md`, 생성 Dashboard, 생성 Queue, Violations의 책임 분리를 정의한다.

Phase 8B는 읽기 전용 Index 정합성 검사를 추가한다. Supervisor는 manifest/index 불일치, 오래된 Packet Index 행, 오래된 Waiting User Approval 행, 승인 대기 항목의 index 누락을 `Violations/Open.md`에 보고한다.

Phase 9A는 `Handoff_Supervisor_Automation_Runbook_KR.md`에 안전한 Supervisor 자동화 모드를 정의한다. 반복 자동화 생성 전에 승인 경계를 준비했다.

Phase 9B는 승인된 `playground-handoff-supervisor` Codex 반복 자동화를 생성했다. 이 자동화는 ACTIVE 상태인 동안 60분마다 실행되고, 생성 Handoff 상태 표면을 갱신할 수 있으며, 소스 수정, approval evidence 설정, Packet claim, Done 처리, commit, push, 역할 채팅 깨우기는 여전히 금지된다.

Phase 9C는 처음 관측된 Supervisor 자동화 실행을 검증했다. 해당 실행은 생성 Handoff 상태 표면만 갱신했고, Handoff 상태는 정합성 문제 0건으로 유지되었다.

Phase 10A는 `_Docs/Handoff/Role_Workers/`에 역할 직원 intake 계약을 정의한다. 역할 채팅과 미래의 역할 직원 자동화가 Queue를 확인하고, Intake Decision을 작성하고, 위험한 실행 전에 멈추는 방법을 정한다.

Phase 10B는 `_Docs/Handoff/Role_Workers/Harness/`에 역할 직원 계약 확인 하네스를 추가한다. 실제 작업 배정 전에 계약 확인, 블라인드 시나리오, 실행 리포트, 통과/실패 기준, 복구 규칙을 정의한다.

Phase 10C는 Developer 하네스 준비 상태 파일럿을 실행하고 Contract Check와 Blind Scenario 리포트를 기록한다. 이 파일럿은 하네스가 채점 가능한 증거를 만들 수 있음을 검증하지만, 독립된 외부 역할 채팅이 계약을 내재화했음을 증명하지는 않는다.

Phase 11A는 `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary_KR.md`에 낮은 위험 역할 작업 경계를 정의한다. 미래 자동화 후보 범주를 나열하고, 소스, JSON, 런타임, 에셋, 승인, claim, `Done`, commit, push, 역할 채팅 제어 행동은 명시적으로 제외한다.

Phase 11B는 `HANDOFF-20260527-003-low-risk-role-worker-pilot`으로 낮은 위험 Developer 역할 작업 파일럿을 검증했다. Pilot Packet은 생성된 Developer Queue에 Ready Work로 표시되었고, Developer 역할은 Intake Decision과 Low-Risk Work Report를 작성했다. 소스, JSON, 런타임, 에셋, 빌드, 승인, claim, `Done`, commit, push, 역할 채팅 제어 행동은 수행하지 않았다.

Phase 11C는 같은 Pilot Packet에서 QA 역할 반복성을 검증했다. QA는 동일한 문서-only 경계를 적용해 Low-Risk Work Report를 작성했고 범위를 확장하지 않았다.

Phase 12A는 첫 미래 역할 직원 자동화를 하나의 낮은 위험, 문서-only recurring automation 후보로 설계했다. 설계 문서는 `_Docs/Handoff/Role_Workers/Role_Worker_Automation_Design_KR.md`에 있으며, 허용 입력, 허용 출력, 중지 규칙, 반복 실행 안전 규칙, Phase 12B 승인 질문을 정의한다. 실제 자동화는 생성하지 않았다.

Phase 12B는 승인된 `playground-handoff-role-worker-low-risk` Codex recurring automation을 PAUSED 상태로 생성했다. 주기는 Handoff Supervisor와 같은 60분 간격이며, 나중에 활성화되더라도 `_Docs/Handoff/Role_Workers/Automation/Runs/` 아래 timestamp run report만 작성할 수 있다. Packet Results 초안, 운영 상태 수정, manifest 수정, approval evidence 설정, Packet claim, `Done` 처리, commit, push, 역할 채팅 제어는 금지된다.

Phase 12C는 낮은 위험 Role Worker 자동화의 첫 실행을 검증했다. 자동화를 일시적으로 활성화했고, `_Docs/Handoff/Role_Workers/Automation/Runs/2026-05-27_173316_LowRiskRoleWorker.md` run report 하나만 작성되었으며, 후보는 없었다. Packet Results 초안과 모든 금지 행동은 수행되지 않았고, 검증 후 자동화는 다시 `PAUSED`로 돌렸다.

주기 실행, 역할 채팅 자동 호출, 승인 범위 밖 소스 수정, JSON schema 수정, Git 작업은 나중에 명시 승인 전까지 범위 밖이다.

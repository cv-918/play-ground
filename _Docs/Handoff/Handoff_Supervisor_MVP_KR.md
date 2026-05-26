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
- 아직 생성된 Dashboard와 `00_Index.md`의 행을 비교하지 않는다.
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

다음 안전한 확장은 완료된 diff를 검토하고 Phase 7A부터 Phase 7C까지의 커밋 경계를 결정하는 것이다.

주기 실행, 역할 채팅 자동 호출, 승인 범위 밖 소스 수정, JSON schema 수정, Git 작업은 나중에 명시 승인 전까지 범위 밖이다.

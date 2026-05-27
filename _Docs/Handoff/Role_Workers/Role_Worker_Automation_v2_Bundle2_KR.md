# Role Worker 자동화 v2 Bundle 2

## 목적

이 문서는 Handoff v2의 두 번째 구현 묶음인 Phase 23부터 Phase 28을 정의한다.

이번 묶음은 기존 low-risk Role Worker 자동화를 run report만 쓰는 상태에서 제한적인 Packet Results 초안 작성까지 확장한다.

구현 자동화를 승인하는 문서가 아니다.

## 묶음 목표

Role Worker가 사용자의 수동 오케스트레이션 부담을 줄이되, 자율 Developer가 되지 않도록 한다.

목표 흐름은 다음이다.

```text
Handoff Queue를 읽는다
-> document-only low-risk 후보를 찾는다
-> run report를 쓴다
-> 안전한 Packet Results 초안을 쓸 수 있다
-> 운영 상태는 바꾸지 않는다
```

## Phase 목록

### Phase 23: Role Worker 자동화 범위 고정

결정:

- 단일 Role Worker 자동화를 유지한다.
- 아직 Planner, Developer, Artist, Reviewer, QA 자동화로 나누지 않는다.
- Supervisor와 Role Worker 책임을 분리한다.

Supervisor:

- Packet manifest를 읽는다.
- Dashboard, Queues, Violations를 갱신한다.
- scope와 consistency 문제를 보고한다.

Role Worker:

- Dashboard, Queues, Violations, Packets, role-worker 규칙을 읽는다.
- 자기 run report를 쓴다.
- 안전한 Packet Results 초안을 쓸 수 있다.
- Packet 상태는 바꾸지 않는다.

### Phase 24: Role Worker 실행 계약

각 실행은 다음 경로에 timestamped report 하나를 써야 한다.

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
```

run report에는 다음이 있어야 한다.

- automation name
- run timestamp
- mode
- scanned roles
- read files
- considered candidates
- written files
- forbidden action check
- stop conditions
- result

### Phase 25: Packet Results 초안 작성 허용

Role Worker는 후보가 document-only low-risk일 때만 새 Packet Results 초안을 쓸 수 있다.

허용 경로:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>IntakeDecision.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>LowRiskWorkReport.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>ClarificationRequest.md
_Docs/Handoff/Packets/<handoff-id>/Results/<Role>BlockerSummary.md
```

기존 결과 문서를 덮어쓰면 안 된다.

대상 파일이 이미 있으면 run report에 `AlreadyPresent`를 기록하고 건너뛴다.

### Phase 26: Low-risk 문서 작업 파일럿

파일럿 소재:

```text
해상도 변경 시 캐릭터가 필드/world 기준 같은 위치에 남아 있어야 하는데, 필드 기준 위치가 달라지는 것처럼 보이는 문제.
```

이 파일럿은 문서-only다.

Role Worker는 다음을 해야 한다.

- Packet과 Queue 맥락을 읽는다.
- 실제 구현에는 source/runtime 조사가 필요하다고 판단한다.
- source, JSON, runtime, asset, build, test, commit, push를 하지 않는다.
- intake decision 또는 result 초안을 작성한다.
- 향후 구현은 별도 approved execution scope가 필요하다고 기록한다.

### Phase 27: Role Worker 활성화와 모니터링

자동화 상태:

- Role Worker 자동화는 `PAUSED`로 유지한다.
- 주기는 Supervisor와 같은 60분으로 유지한다.
- 자동화 prompt는 안전한 Packet Results 초안을 허용하도록 갱신한다.
- 사용자가 명시적으로 요청하기 전에는 recurring run을 활성화하지 않는다.

모니터링 기준:

- 이 묶음 이후 첫 ACTIVE 실행은 출력 수, risky candidate skip 여부, forbidden action 준수, thread noise를 확인한다.

### Phase 28: Bundle 2 마감

다음이 완료되면 Bundle 2를 닫는다.

- scope lock 문서화
- run contract 문서화
- Packet Results draft 권한 문서화
- document-only 파일럿 기록
- automation prompt 정렬
- 향후 작업을 이번 묶음 밖으로 분리

## 허용 읽기

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Packets/**`
- `_Docs/Handoff/Role_Workers/**`
- `_Docs/Handoff/Role_Routines/*.md`

## 허용 쓰기

- `_Docs/Handoff/Role_Workers/Automation/Runs/*.md`
- `_Docs/Handoff/Packets/<handoff-id>/Results/` 아래 새 안전 초안

## 금지 행동

Role Worker는 다음을 하면 안 된다.

- game source 수정
- gameplay JSON 수정
- asset 수정 또는 생성
- build/test 실행
- runtime behavior 변경
- build setting 수정
- generated Supervisor surface 수정
- `00_Index.md` 수정
- Packet manifest 수정
- Packet status 변경
- approval evidence 작성
- Packet claim
- `Done` 또는 `Archived` 처리
- commit
- push
- 역할 채팅 깨우기 또는 제어

## 이번 묶음 밖의 향후 작업

다음은 Bundle 2에 포함되지 않는다.

- source code를 수정하는 Developer 자동화
- approved-scope implementation 자동화
- 자동 Packet 생성 helper
- 자동 status 변경
- 자동 approval evidence
- 자동 completion gate
- 자동 commit 또는 push

이 항목들은 별도 승인 후 이후 묶음에서 검토한다.

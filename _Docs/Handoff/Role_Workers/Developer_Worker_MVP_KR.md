# Developer Worker MVP

## 목적

이 문서는 Handoff v2 자동화 작업의 Phase 29A를 정의한다.

첫 번째 Developer Worker MVP를 설계하지만, recurring automation을 생성하거나 활성화하지는 않는다.

## 현재 상태

아직 Developer Worker 자동화는 없다.

현재 역할은 다음과 같다.

- Handoff Supervisor: Packet을 스캔하고 Dashboard, Queue, Violations를 갱신한다.
- Low-risk Role Worker: 사무보조처럼 Queue를 읽고 안전한 문서-only Packet Result 초안을 작성한다.
- 현재 Codex 채팅: 사용자가 승인된 구현 작업을 명시하면 Developer 역할로 직접 작업할 수 있다.

Developer Worker MVP는 이 다음 단계다. 기존 low-risk Role Worker와 같은 역할이 아니다.

## 설계 목표

Developer Worker는 승인된 구현 작업에서 사용자의 수동 오케스트레이션 부담을 줄인다.

목표 흐름은 다음과 같다.

```text
승인된 실행 범위가 있음
-> Developer Worker가 범위를 확인함
-> 승인된 범위 안의 구현만 수행함
-> 결과와 검증 증거를 기록함
-> human QA와 commit 판단은 사람이 유지함
```

핵심 규칙은 이것이다.

```text
source 수정은 승인된 실행 범위 안이면 가능하다.
source 수정이라는 이유만으로 다시 멈추지 않는다.
```

## 다른 자동화와의 관계

### Handoff Supervisor

Supervisor는 상태와 정합성을 관찰하는 역할이다.

할 수 있는 일:

- manifest 스캔
- Dashboard, Queues, Violations 생성
- 승인된 범위 누락 보고
- scope drift 가능성 보고

하지 않는 일:

- 구현

### Low-risk Role Worker

기존 low-risk Role Worker는 사무보조 역할이다.

할 수 있는 일:

- Queue 읽기
- run report 작성
- 안전한 문서-only Packet Result 초안 작성

하지 않는 일:

- source, JSON, runtime behavior, asset, build setting, Packet state 수정

### Developer Worker

Developer Worker는 이후의 구현 담당 직원 자동화다.

나중에 허용될 수 있는 일:

- 승인된 Developer Packet 읽기
- 승인된 범위 안의 source 파일 조사
- 승인된 범위 안의 파일 수정
- 승인된 검증 명령 실행
- Developer Result와 DevLog 작성

승인된 범위를 벗어나야 하면 반드시 멈춘다.

## MVP 후보 조건

Developer Worker는 다음 조건을 모두 만족하는 Packet만 후보로 본다.

- `to_roles`에 `Developer`가 있다.
- `approved_execution_scope.approved`가 `true`다.
- `approved_scope_allowed_paths`가 비어 있지 않다.
- `delivery_status`, `execution_status`가 `Done` 또는 `Archived`가 아니다.
- `approval_evidence.approved`가 `true`이거나, 동등한 사용자 승인 기록이 approved execution scope에 있다.
- `Violations/Open.md`에 해당 Packet의 Critical 또는 Major 문제가 없다.
- scope drift가 없거나 실행 전에 설명되어 있다.
- 구현이 `approved_scope_allowed_paths` 안에 머문다.
- 승인 범위 밖의 보호 변경이 필요하지 않다.

## MVP 허용 행동

별도 자동화 생성 승인을 받은 뒤, Developer Worker MVP는 다음을 할 수 있도록 설계한다.

- `AGENTS.md` 읽기
- Handoff Dashboard, Queues, Violations, 대상 Packet 문서 읽기
- 승인된 범위 안의 source 파일 읽기
- 승인된 파일을 이해하는 데 필요한 가까운 주변 source 파일 읽기
- 승인된 범위 안의 source 파일 수정
- 승인 범위에 명시된 non-schema data 파일 수정
- `Results/DeveloperResult.md` 작성
- 멈춰야 할 때 `Results/DeveloperScopeChangeRequest.md` 작성
- `_DevLog/FixLog/` 또는 `_DevLog/WorkLog/` 아래 DevLog 작성
- 승인된 validation plan에 있는 표준 프로젝트 검증 명령 실행

## MVP 금지 행동

Developer Worker MVP는 다음을 하면 안 된다.

- 승인 범위에 schema 작업이 명시되지 않았는데 JSON schema 생성 또는 변경
- 별도 승인 없는 save/load 변경
- build setting 변경
- 별도 승인 없는 asset 생성, 교체, 수정
- 승인 범위 밖의 광범위한 refactor
- 승인 범위 밖의 scene, actor, runtime lifecycle 변경
- Supervisor가 생성하는 Dashboard, Queue, Violations 직접 수정
- approval evidence 수정
- 혼자 Packet을 `Done` 또는 `Archived` 처리
- commit
- push
- 다른 역할 채팅을 깨우거나 제어
- 승인 범위를 벗어나는 작업이 필요하다고 판단한 뒤에도 계속 진행

## 멈춤 조건

Developer Worker는 다음 상황에서 멈추고 `Results/DeveloperScopeChangeRequest.md`를 작성한다.

- 필요한 파일이 `approved_scope_allowed_paths` 밖이다.
- 승인되지 않은 보호 변경이 필요하다.
- 검증에 필요한 명령이 approved validation plan에 없다.
- 구현 리스크가 승인된 범위와 의미 있게 달라졌다.
- 기존 로컬 변경 때문에 대상 파일을 안전하게 수정할 수 없다.
- Packet에 Critical 또는 Major Handoff violation이 있다.

멈춘다는 뜻:

- 추가 파일을 수정하지 않는다.
- 완료 처리하지 않는다.
- commit/push하지 않는다.
- 정확한 이유와 필요한 사용자 결정을 기록한다.

## 초기 자동화 모드

처음 실제 Developer Worker 자동화는 `PAUSED`로 시작하는 것을 권장한다.

첫 모드는 다음으로 둔다.

```text
approved-scope dry run
```

dry-run 모드에서는 승인된 범위를 검사하고 구현 계획을 작성할 수 있지만 source를 수정하지 않는다.

dry-run이 검증된 뒤, 이후 phase에서 다음 모드를 승인할 수 있다.

```text
approved-scope implementation mode
```

implementation mode가 source를 승인된 범위 안에서 수정할 수 있는 첫 모드다.

## 완료와 QA

Developer Worker는 구현 결과를 작성할 수 있지만, human QA는 분리한다.

MVP 완료 흐름:

```text
Developer Worker가 승인 범위 안에서 구현
-> 승인된 검증 실행
-> DeveloperResult와 DevLog 작성
-> human QA가 런타임 확인
-> 사람 또는 수동 지시받은 Codex가 Packet 종료
-> 사람이 commit/push 판단
```

빌드 성공만으로 자동 완료 처리하지 않는다.

## 권장 다음 단계

### Phase 29B: Developer Worker Prompt Contract

정확한 recurring automation prompt와 run report 형식을 작성한다. 아직 자동화를 만들지는 않는다.

### Phase 30A: Developer Worker Dry-Run Automation Creation

approved-scope dry run만 수행하는 PAUSED recurring automation 하나를 만든다.

### Phase 30B: Dry-Run Pilot

작은 승인 Packet 하나를 dry-run 모드로 돌려 source를 수정하지 않는지 확인한다.

### Phase 31A: Approved-Scope Implementation Pilot

dry-run 성공 후에만 좁은 implementation-mode pilot을 승인한다.

## 이번 Phase 29A에서 하지 않는 것

- recurring automation 생성
- automation prompt 수정
- game source 수정
- JSON 수정
- build/test 실행
- Packet status 동작 변경
- commit/push 권한 부여
- 역할별 worker 분리

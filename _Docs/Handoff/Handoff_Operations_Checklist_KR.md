# Handoff 운영 체크리스트

## 목적

이 문서는 AI Role Handoff System의 Phase 14 운영 체크리스트다.

핵심 질문은 하나다.

```text
Handoff System을 실제로 쓸 때, 사람이나 assistant는 무엇부터 확인해야 하는가?
```

이 문서는 새 자동화 권한을 추가하지 않는다.

## 기본 확인 경로

다음 순서로 본다.

1. `_Docs/Handoff/Dashboard.md`
2. `_Docs/Handoff/Violations/Open.md`
3. `_Docs/Handoff/Queues/<Role>.md`
4. `_Docs/Handoff/00_Index.md`
5. 연결된 Packet 문서

`Dashboard.md`는 첫 확인 위치다.

`Violations/Open.md`는 안전 확인 위치다.

역할별 Queue는 일감 수거 위치다.

`00_Index.md`는 오래 남는 목차다.

Packet 문서는 판단과 증거가 남는 위치다.

## 정상 상태 확인

실행:

```bat
tools\aiworkflow\handoff_supervisor.bat status
```

보통 정상 상태는 다음과 같다.

- Supervisor가 오류 없이 실행된다.
- `Consistency Issues`가 `0`이다.
- `Waiting Approval`이 `0`이거나, 표시된 항목이 의도된 승인 대기다.
- `Ready Work`에는 대응되는 요청 문서가 있다.
- `Done` Packet에는 완료 노티가 있다.

`Waiting Approval`이 `0`보다 크다고 해서 곧바로 문제가 있는 것은 아니다.

그 뜻은 사용자가 결정해야 할 항목이 있다는 것이다.

## 사용자 행동 표

| 위치 | 보이는 것 | 사용자가 할 일 |
| --- | --- | --- |
| Dashboard | `Waiting User Approval` 항목 | 요청 문서를 열고 승인, 거절, 범위 수정 중 하나를 결정한다. |
| Dashboard | `Consistency Issues`가 0보다 큼 | 작업이나 승인 전에 `Violations/Open.md`를 먼저 본다. |
| Dashboard / Queue | `Scope Status: Approved` | 대상 역할은 승인된 범위 안에서 구현할 수 있다. |
| Dashboard / Queue | `Scope Status: MissingScope` | 실행 전에 승인된 범위를 기록하거나 범위 승인을 요청한다. |
| Dashboard / Queue | `Scope Drift Issues` | 변경 파일이 승인 범위 밖인지 확인하고 필요하면 범위 확장을 승인한다. |
| Role Queue | `Ready Work` 항목 | 대상 역할은 읽고 계획할 수 있다. 실행은 승인된 범위가 기록된 뒤 진행한다. |
| Role Queue | `Waiting User Approval` 항목 | 사용자 결정이 기록되기 전까지 대상 역할은 구현하지 않는다. |
| Violations | manifest/index/request 문서 누락 | 실행 작업 전에 Handoff 문서 상태를 먼저 고친다. |
| Packet Results | DeveloperPlan 또는 승인 요청 | 일반 게이트명이 아니라 구체적인 요청 범위를 보고 결정한다. |
| CompletionNotice | 완료된 작업 | 검증 기록과 남은 위험을 보고 commit/push 여부를 결정한다. |

## Supervisor 자동화 상태

Phase 14 기준:

```text
playground-handoff-supervisor = ACTIVE
```

기대 동작:

- 설정된 주기로 실행된다.
- Dashboard, Queues, Violations를 갱신한다.
- 게임 소스, gameplay JSON, 에셋, approval evidence, commit, push는 바꾸지 않는다.

Supervisor는 운영 보조자이지 실행자가 아니다.

## 낮은 위험 Role Worker 자동화 상태

Phase 14 기준:

```text
playground-handoff-role-worker-low-risk = PAUSED
```

나중에 활성화할 때의 기대 동작:

- Dashboard, Queues, Violations, Packets, Role Worker 문서를 읽는다.
- automation run report만 작성한다.
- 별도 승인 전에는 Packet Results 초안을 쓰지 않는다.
- manifest, approval evidence, source, JSON, asset, build, commit, push를 바꾸지 않는다.

## 승인 결정 체크리스트

승인 대기 항목을 승인하기 전에, 연결된 요청 문서가 다음을 설명하는지 확인한다.

- 무엇이 바뀌는가
- 왜 중요한가
- 예상 파일 또는 시스템
- 범위 밖 항목
- 위험
- 검증 계획
- 승인, 거절, 범위 수정 선택지
- 사용자가 복사해 쓸 응답 문장

빠진 것이 있으면 승인 요청서를 다시 쓰라고 해야 한다.

Phase 13C Supervisor 검사가 명확한 누락은 잡지만, 요청서가 충분히 좋은지는 여전히 사용자가 판단한다.

## 작업 종료 체크리스트

Handoff 작업을 완료로 보기 전에 확인한다.

- 요청 범위를 지켰는가
- 검증을 실행했거나 명시적으로 보류했는가
- 결과 문서가 있는가
- Packet이 `Done`이면 완료 노티가 있는가
- 남은 위험이 기록되었는가
- 의미 있는 작업이면 DevLog가 있는가
- commit에 unrelated 변경이 섞이지 않았는가

## 명령어

```bat
tools\aiworkflow\handoff_supervisor.bat status
tools\aiworkflow\handoff_supervisor.bat scan --role Developer
tools\aiworkflow\handoff_supervisor.bat write-docs
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

`write-docs`만 실행하면 갱신 예정 표면을 미리 본다.

`write-docs --execute`는 다음 파일을 갱신할 때만 사용한다.

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`

## Phase 14 완료 기준

Phase 14는 다음을 만족하면 완료다.

- 매일 볼 운영 표면이 문서화됨
- 사용자 행동 표가 문서화됨
- 자동화 상태가 문서화됨
- 승인 결정 체크리스트가 문서화됨
- Handoff guide와 index가 이 체크리스트를 연결함

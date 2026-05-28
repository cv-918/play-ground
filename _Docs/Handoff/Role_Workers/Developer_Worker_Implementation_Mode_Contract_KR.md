# Developer Worker Implementation Mode Contract

## 최신 보강: 빌드/테스트 자체 수정 루프

Packet의 승인된 검증 범위에 빌드, 테스트, 파싱, 스모크 명령이 포함되어 있으면 Developer Worker는 구현 후 해당 명령을 실행해야 한다.

승인된 빌드/테스트가 실패했을 때, 실패 원인이 `approved_scope_allowed_paths` 안의 파일에서 명확하게 고칠 수 있는 문제라면 그 자리에서 멈추지 않는다. Developer Worker는 원인을 분석하고, 승인 범위 안에서 수정하고, 같은 검증 명령을 다시 실행한 뒤 결과를 기록한다.

Developer Worker가 멈추고 `DeveloperScopeChangeRequest.md`를 써야 하는 경우는 다음과 같다.

- 수정에 승인 범위 밖 파일이 필요하다.
- JSON schema, save/load, lifecycle, build setting, asset 등 승인되지 않은 보호 영역 변경이 필요하다.
- 승인되지 않은 검증 명령이 필요하다.
- 원인 분석이나 수정이 추측에 가까워진다.

즉, 빌드 실패 자체는 자동 정지 사유가 아니다. 승인된 범위 안에서 고칠 수 있는 빌드 실패라면 Developer 작업의 일부로 고친다.

## 목적

이 문서는 Handoff v2 Developer Worker 작업의 Phase 31A를 정의한다.

목표는 Developer Worker를 dry-run 계획 작성 단계에서 좁은 approved-scope implementation pilot 단계로 넘기기 위한 계약을 고정하는 것이다.

이 문서는 recurring automation을 생성, 수정, 활성화, 실행하지 않는다.

또한 이 문서 자체가 특정 소스 변경을 승인하는 것은 아니다. 실제 소스 수정 파일럿에는 별도의 Handoff Packet과 승인된 실행 범위가 필요하다.

## 핵심 규칙

implementation mode는 사용자가 정한 범위 기반 승인 기준을 따른다.

```text
승인된 실행 범위 안의 소스 수정은 개발자의 정상 작업이다.
소스 수정이라는 이유만으로 다시 승인 대기하지 않는다.
```

Developer Worker는 작업이 승인 범위를 벗어나거나, 승인되지 않은 보호 영역을 바꾸어야 하거나, 승인된 검증 계획 안에서 확인할 수 없을 때만 멈춘다.

## 작동 흐름

```text
승인된 Developer Packet이 있음
-> Developer Worker가 approved_execution_scope를 확인함
-> Developer Worker가 approved_scope_allowed_paths 안의 파일만 수정함
-> Developer Worker가 승인된 검증 명령만 실행함
-> Developer Worker가 DeveloperResult와 DevLog를 작성함
-> 사람이 런타임 QA를 확인함
-> 사람 또는 수동 지시를 받은 Codex가 Packet 종료와 commit/push를 판단함
```

## 후보 Packet 조건

Developer Worker는 다음 조건을 모두 만족하는 Packet 하나만 선택할 수 있다.

- `to_roles`에 `Developer`가 포함되어 있다.
- `approved_execution_scope.approved`가 `true`다.
- `approved_scope_allowed_paths`가 비어 있지 않다.
- `delivery_status`가 `Done` 또는 `Archived`가 아니다.
- `execution_status`가 `Done`, `Blocked`, `WaitingUserApproval`이 아니다.
- `ImplementationRequest.md` 또는 동등한 구현 요청 문서가 있다.
- `_Docs/Handoff/Violations/Open.md`에 해당 Packet의 Critical 또는 Major 이슈가 없다.
- 요청된 변경이 `approved_scope_allowed_paths` 안에 머물 수 있다.
- 승인된 검증 계획이 실행 또는 명시적 보류를 판단할 수 있을 만큼 분명하다.
- 대상 파일에 관련 없는 로컬 수정이 없다.

여러 후보가 있으면 하나만 선택한다.

선택 순서:

1. 명시적으로 active인 Developer Packet.
2. 가장 최근에 갱신된 approved-scope Developer Packet.
3. 없으면 후보 없음.

## 읽기 허용 범위

implementation mode는 다음을 읽을 수 있다.

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- 대상 Packet의 `manifest.yaml`
- 대상 Packet의 `PlanningBrief.md`
- 대상 Packet의 `ImplementationRequest.md`
- 대상 Packet의 `Results/*.md`
- `approved_scope_allowed_paths`에 listed 된 파일
- 승인된 파일의 근처 맥락을 이해하는 데 필요한 인접 소스 파일
- 범위 확인을 위한 `git status`, `git diff --name-only`, `git diff -- <approved files>`

## 쓰기 허용 범위

implementation mode는 다음을 쓸 수 있다.

- `approved_scope_allowed_paths`에 listed 된 소스 파일
- Packet이 데이터 수정을 명시적으로 포함한 경우, `approved_scope_allowed_paths`에 listed 된 non-schema 데이터 파일
- `_Docs/Handoff/Role_Workers/Automation/Runs/` 아래 timestamped run report 하나
- `Results/DeveloperResult.md`
- 멈춰야 하는 경우 `Results/DeveloperScopeChangeRequest.md`
- `_DevLog/FixLog/` 또는 `_DevLog/WorkLog/` 아래 DevLog 하나

기존 `DeveloperResult.md`가 있을 경우, Packet이 이전 결과를 supersede한다고 명시하지 않으면 덮어쓰지 않는다.

## 검증 허용 범위

implementation mode는 Packet 승인 범위에 명시된 검증 명령만 실행할 수 있다.

예:

- 제한된 build command
- 제한된 test command
- read-only parse/check command
- project-local smoke command

Packet이 검증 명령 실행을 승인하지 않았다면, worker는 필요한 수동 검증만 기록하고 검증 통과를 주장하지 않는다.

## 금지 행동

implementation mode는 다음을 하면 안 된다.

- `approved_scope_allowed_paths` 밖의 파일 수정
- 명시 승인 없는 JSON schema 변경
- 명시 승인 없는 save/load 동작 변경
- 명시 승인 없는 scene, actor, component lifecycle 변경
- 명시 승인 없는 build setting 변경
- 명시 승인 없는 asset 생성, 교체, 수정
- 승인 작업에 필요하지 않은 넓은 refactor
- Handoff Supervisor generated surface 수정
- `_Docs/Handoff/00_Index.md` 수정
- Packet manifest 수정
- approval evidence 수정
- Packet claim
- `delivery_status` 또는 `execution_status` 변경
- Packet을 `Done` 또는 `Archived`로 표시
- automation 생성, 수정, 활성화, 일시정지, 삭제
- commit
- push
- 다른 역할 채팅 wake/control

## 멈춤 조건

Developer Worker는 다음 상황에서 멈추고 `Results/DeveloperScopeChangeRequest.md`를 작성해야 한다.

- 필요한 파일이 `approved_scope_allowed_paths` 밖에 있다.
- 승인 범위에 없는 보호 영역 변경이 필요하다.
- 구현 리스크가 승인된 Packet과 의미 있게 달라진다.
- 필요한 검증이 승인된 검증 계획 밖에 있다.
- 대상 파일에 관련 없는 로컬 수정이 있다.
- Packet에 Critical 또는 Major Handoff violation이 있다.
- 추측 없이 review 가능한 diff를 만들 수 없다.

멈춘다는 것은 다음을 뜻한다.

- 더 이상 수정하지 않는다.
- 완료 처리하지 않는다.
- commit/push 하지 않는다.
- 무엇을 바꿨고, 무엇을 바꾸지 않았고, 어떤 사용자 결정이 필요한지 기록한다.

## Developer Result 형식

`Results/DeveloperResult.md`는 다음 구조를 사용한다.

```md
# Developer Result

## Handoff

Handoff ID:
Title:

## Scope Used

- Approved scope summary:
- Files allowed:
- Files changed:
- Files intentionally not changed:

## Implementation Summary

-

## Validation

- Commands run:
- Results:
- Manual validation still needed:

## Review Notes

-

## Remaining Risks

-

## Next Human Action

-
```

## Scope Change Request 형식

`Results/DeveloperScopeChangeRequest.md`는 다음 구조를 사용한다.

```md
# Developer Scope Change Request

## Handoff

Handoff ID:
Title:

## Why The Worker Stopped

-

## Needed Scope Change

- Additional files:
- Additional protected behavior:
- Additional validation:

## Current Work State

- Files changed before stopping:
- Files not changed:

## Decision Needed

Approve expanded scope / revise request / cancel implementation.
```

## 파일럿 규칙

첫 implementation-mode 파일럿은 작고, 되돌릴 수 있고, Handoff Packet을 통해 이미 승인된 작업이어야 한다.

파일럿은 항상 켜져 있는 implementation worker가 아니라, `PAUSED` 자동화 또는 수동으로 제어된 실행에서 시작하는 것을 권장한다.

파일럿 성공 기준:

- Packet 하나만 선택한다.
- 수정된 모든 파일이 `approved_scope_allowed_paths` 안에 있다.
- 승인 범위 밖의 보호 동작을 바꾸지 않는다.
- DeveloperResult와 DevLog를 작성한다.
- 검증은 승인된 경우에만 실행하고, 아니면 명확히 보류로 기록한다.
- Packet을 자동으로 Done 처리하지 않는다.
- worker가 commit/push 하지 않는다.

## 이번 Phase 31A의 Non-Goals

Phase 31A는 다음을 하지 않는다.

- implementation-mode recurring automation 생성
- implementation-mode recurring automation 활성화
- 특정 gameplay bug fix 선택
- source file 수정
- build/test 실행
- Packet 종료
- commit/push

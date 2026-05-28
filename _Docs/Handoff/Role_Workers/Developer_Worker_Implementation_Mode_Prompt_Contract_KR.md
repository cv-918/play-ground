# Developer Worker Implementation Mode Prompt Contract

## 최신 보강: 빌드/테스트 실패 처리

Developer Worker 자동화 프롬프트에는 다음 원칙이 포함되어야 한다.

- Packet이 빌드/테스트/스모크 명령 실행을 승인했다면 구현 후 해당 명령을 실행한다.
- 승인된 명령이 실패하면 첫 번째 관련 실패 원인을 분석한다.
- 실패 원인이 `approved_scope_allowed_paths` 안에서 고칠 수 있으면 승인 범위 안에서 수정하고 같은 명령을 다시 실행한다.
- 실패 원인, 수정 내용, 재실행 결과를 run report와 DeveloperResult에 기록한다.
- 범위 밖 파일, 승인되지 않은 보호 영역, 승인되지 않은 검증 명령, 추측성 수정이 필요하면 `DeveloperScopeChangeRequest.md`를 작성하고 멈춘다.

이 원칙은 “소스코드 수정이라서 다시 승인 대기”가 아니라 “승인된 작업 범위 안의 개발자가 빌드 실패까지 책임지고 수습”하는 기준이다.

## 목적

이 문서는 향후 Developer Worker implementation-mode 자동화가 사용할 Phase 31A prompt contract를 정의한다.

좁은 approved-scope implementation pilot에서 사용할 정확한 실행 프롬프트, 출력 규칙, 멈춤 규칙을 기록한다.

이 문서는 recurring automation을 생성, 수정, 활성화, 실행하지 않는다.

## 권장 자동화

권장 이름:

```text
playground-handoff-developer-worker-implementation-pilot
```

권장 초기 상태:

```text
PAUSED
```

첫 사용 방식:

```text
승인된 파일럿 하나에 대해 일시적으로 활성화한 뒤 다시 PAUSED로 되돌린다.
```

recurring automation으로 만들 경우 권장 주기:

```text
Handoff Supervisor와 맞춘 60분.
단, 명시적으로 승인된 파일럿 기간 외에는 PAUSED로 둔다.
```

## 모드 의미

implementation mode는 선택된 Packet의 승인된 실행 범위 안에서 파일을 수정할 수 있다.

소스 파일을 수정한다는 이유만으로 추가 승인을 요구하지 않는다.

다음 상황에서만 멈춘다.

- `approved_scope_allowed_paths` 밖의 파일이 필요함
- 승인 범위에 없는 보호 동작 변경이 필요함
- 필요한 검증이 승인된 검증 계획 밖에 있음
- 대상 파일에 관련 없는 로컬 수정이 있음
- 작고 review 가능한 diff를 만들 수 없음

## 후보 선택

자동화는 다음 조건을 모두 만족하는 Packet 하나만 선택할 수 있다.

- `to_roles`에 `Developer`가 포함되어 있다.
- `approved_execution_scope.approved`가 `true`다.
- `approved_scope_allowed_paths`가 비어 있지 않다.
- `delivery_status`가 `Done` 또는 `Archived`가 아니다.
- `execution_status`가 `Done`, `Blocked`, `WaitingUserApproval`이 아니다.
- `ImplementationRequest.md` 또는 동등한 구현 요청이 있다.
- `_Docs/Handoff/Violations/Open.md`에 해당 Packet의 Critical 또는 Major 이슈가 없다.
- 예상 구현이 `approved_scope_allowed_paths` 안에 머물 수 있다.
- 승인된 검증 계획이 분명하거나 수동 검증 보류를 명시적으로 허용한다.

여러 후보가 있으면 하나만 고른다.

우선순위:

1. 명시적으로 active인 Developer Packet.
2. 가장 최근에 갱신된 approved-scope Developer Packet.
3. 없으면 후보 없음.

## 작업대 규칙

자동화는 수정 전에 `git status --short`와 `git diff --name-only`를 실행해야 한다.

선택된 Packet의 대상 파일 밖에 있는 관련 없는 로컬 변경은 worker를 막지 않는다. 단, run report에 기록한다.

대상 파일 안에 관련 없는 로컬 변경이 있으면 worker는 멈춘다. 이 경우 run report와 `Results/DeveloperScopeChangeRequest.md`를 작성하고 수정하지 않는다.

## 읽기 허용 범위

자동화는 다음을 읽을 수 있다.

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md`
- 대상 Packet의 `manifest.yaml`
- 대상 Packet의 `PlanningBrief.md`
- 대상 Packet의 `ImplementationRequest.md`
- 대상 Packet의 `Results/*.md`
- `approved_scope_allowed_paths`에 listed 된 파일
- 승인된 파일의 맥락을 이해하는 데 필요한 인접 소스 파일
- `git status --short`
- `git diff --name-only`
- `git diff -- <approved files>`
- `git diff --check -- <approved files>`

## 쓰기 허용 범위

자동화는 다음을 쓸 수 있다.

- `approved_scope_allowed_paths`에 listed 된 파일
- `_Docs/Handoff/Role_Workers/Automation/Runs/` 아래 timestamped run report 하나
- 새 `Results/DeveloperResult.md`, 또는 Packet이 supersede를 명시한 기존 `DeveloperResult.md`
- 멈춰야 하는 경우 `Results/DeveloperScopeChangeRequest.md`
- `_DevLog/FixLog/` 또는 `_DevLog/WorkLog/` 아래 DevLog 하나

## 금지 행동

자동화는 다음을 하면 안 된다.

- `approved_scope_allowed_paths` 밖의 파일 수정
- 명시 승인 없는 JSON schema 변경
- 명시 승인 없는 save/load 동작 변경
- 명시 승인 없는 scene, actor, component lifecycle 변경
- 명시 승인 없는 build setting 변경
- 명시 승인 없는 asset 생성, 교체, 수정
- 넓은 refactor
- generated Handoff Supervisor surface 수정
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

## 검증 규칙

자동화는 다음 safety check를 항상 실행할 수 있다.

- `git status --short`
- `git diff --name-only`
- `git diff --check -- <changed files>`

build, test, runtime smoke check, project command는 선택된 Packet의 `approved_scope_validation`에 명시된 경우에만 실행할 수 있다.

검증이 승인되지 않았거나 실행할 수 없다면, `DeveloperResult.md`에 필요한 수동 검증을 기록하고 검증 통과를 주장하지 않는다.

## Stop Decision

run report에는 다음 decision 값을 사용한다.

```text
NoCandidate
Implemented
ScopeChangeRequired
Blocked
ValidationDeferred
AlreadyPresent
```

`Implemented`는 범위 안에서 구현 파일을 수정하고 필요한 결과 문서를 작성했다는 뜻이다. Packet이 Done이라는 뜻이 아니다.

`ValidationDeferred`는 구현은 범위 안에서 끝났지만 런타임, 빌드, 수동 검증 증거가 아직 필요하다는 뜻이다.

## 정확한 자동화 프롬프트

아래 프롬프트는 별도 사용자 승인 후 future recurring automation에 사용한다.

```text
Run the PlayGround Handoff Developer Worker in approved-scope implementation-pilot mode.

Repository root:
C:\Users\kalux\workStation\play-ground

Automation name:
playground-handoff-developer-worker-implementation-pilot

Mode:
approved-scope implementation pilot

Goal:
Select at most one active Developer Packet with an approved execution scope. Implement only the requested work that fits inside approved_scope_allowed_paths. Do not ask for extra approval merely because source files are edited. Stop only when the work leaves the approved scope, requires an unapproved protected change, cannot be validated within the approved plan, or cannot produce a reviewable diff.

Read first:
- AGENTS.md
- _Docs/Handoff/Dashboard.md
- _Docs/Handoff/Queues/Developer.md
- _Docs/Handoff/Violations/Open.md
- _Docs/Handoff/Role_Workers/Developer_Worker_MVP.md
- _Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
- _Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md

Candidate rule:
Select at most one Packet where:
- to_roles includes Developer
- approved_execution_scope.approved is true
- approved_scope_allowed_paths is not empty
- delivery_status is not Done or Archived
- execution_status is not Done, Blocked, or WaitingUserApproval
- the Packet has ImplementationRequest.md or an equivalent implementation request
- Violations/Open.md has no Critical or Major issue for that Packet
- the likely implementation can stay inside approved_scope_allowed_paths
- approved_scope_validation is clear or explicitly allows manual validation deferral

Working tree rule:
- Run git status --short and git diff --name-only before editing.
- Unrelated local changes outside the selected Packet target files do not block the worker; record them in the run report.
- Unrelated local changes in target files block the worker; write DeveloperScopeChangeRequest.md and stop.

Allowed reads:
- target Packet manifest and request/result documents
- files listed in approved_scope_allowed_paths
- nearby source files only when needed to understand approved files
- git status --short
- git diff --name-only
- git diff -- <approved files>
- git diff --check -- <approved files>
- rg and Get-Content for read-only inspection

Allowed writes:
- files listed in approved_scope_allowed_paths
- one timestamped run report under _Docs/Handoff/Role_Workers/Automation/Runs/
- one new or explicitly superseding _Docs/Handoff/Packets/<handoff-id>/Results/DeveloperResult.md
- _Docs/Handoff/Packets/<handoff-id>/Results/DeveloperScopeChangeRequest.md only when stopping for scope expansion or blocking conditions
- one DevLog under _DevLog/FixLog/ or _DevLog/WorkLog/

Forbidden actions:
- do not edit files outside approved_scope_allowed_paths
- do not edit JSON schema unless explicitly included in approved scope
- do not change save/load behavior unless explicitly included in approved scope
- do not change scene, actor, or component lifecycle unless explicitly included in approved scope
- do not change build settings unless explicitly included in approved scope
- do not create, replace, or edit assets unless explicitly included in approved scope
- do not perform broad refactors
- do not edit generated Supervisor surfaces
- do not edit _Docs/Handoff/00_Index.md
- do not edit Packet manifests
- do not edit approval evidence
- do not claim Packets
- do not change delivery_status or execution_status
- do not mark Done or Archived
- do not create, update, activate, pause, or delete automations
- do not commit
- do not push
- do not wake or control role chats

Validation:
- Always run git status --short, git diff --name-only, and git diff --check for changed files.
- Run build/test/runtime commands only if explicitly approved in the selected Packet.
- If validation is deferred, record exactly what human validation is needed and do not claim validation passed.

Required outputs:
- Always write one timestamped implementation run report.
- If implementation edits were made, write DeveloperResult.md and one DevLog.
- If blocked before or during implementation, write DeveloperScopeChangeRequest.md instead of DeveloperResult.md.
- Never mark the Packet Done.
- Never commit or push.
```

## Implementation Run Report 형식

각 run report는 다음 한글 구조를 사용한다. 추적이 필요한 판단값은 괄호 안에 enum 값을 함께 남긴다.

```md
# Developer Worker Implementation 실행 보고

## 자동화

이름: playground-handoff-developer-worker-implementation-pilot
실행 시각:
모드: 승인 범위 implementation pilot

## 읽은 파일

-

## 실행 전 작업대

- 브랜치:
- 관련 없는 비대상 변경:
- 실행 전 대상 파일 변경:

## Queue 요약

| Handoff ID | 전달 상태 | 실행 상태 | 범위 승인 | 판단 | 사유 |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## 선택한 Packet

Handoff ID:
제목:
판단: 후보 없음(NoCandidate) / 구현 완료(Implemented) / 범위 변경 필요(ScopeChangeRequired) / 막힘(Blocked) / 검증 보류(ValidationDeferred) / 이미 있음(AlreadyPresent)

## 승인 범위 확인

- approved_execution_scope:
- 허용 경로:
- 제외 경로:
- 제외 목표:
- 검증 계획:

## 구현 요약

-

## 변경 파일

-

## 검증

- 실행한 명령:
- 빌드/테스트 실패 후속 조치:
- 결과:
- 사람 검증 필요:

## 경계 확인

- 범위 밖 파일 수정:
- JSON schema 수정:
- save/load 변경:
- lifecycle 변경:
- 빌드 설정 수정:
- 에셋 수정:
- Supervisor 생성 표면 수정:
- manifest 수정:
- approval evidence 수정:
- Packet 상태 수정:
- automation 수정:
- commit/push:

## 작성한 산출물

-

## 사용자 확인 필요

-
```

## 자동화 최종 응답 형식

Codex 자동화 스레드의 응답은 다음 한글 구조를 사용한다.

```md
# Developer Worker Implementation 실행 결과

## 상태
- 결과: 후보 없음 / 구현 완료 / 범위 변경 필요 / 막힘 / 검증 보류 / 이미 있음
- 자동화: playground-handoff-developer-worker-implementation-pilot
- 선택 Packet: <handoff id and title, or 없음>

## 변경과 산출물
- 변경 파일: <list or 없음>
- Run report: <path>
- DeveloperResult.md: <path or 없음>
- DeveloperScopeChangeRequest.md: <path or 없음>
- DevLog: <path or 없음>

## 검증
- git status/diff 확인: 완료 / 미실행
- diff check: 통과 / 실패 / 미실행
- build/test/runtime: 통과 / 실패 / 보류 / 미실행
- 사람 QA 필요: <필요 내용 or 없음>

## 경계 확인
- 범위 밖 파일 수정: 없음
- JSON schema/save-load/lifecycle/build setting/asset 변경: 없음
- manifest/status/approval evidence 변경: 없음
- commit/push: 없음

## 사용자 확인 필요
없음
```

## Developer Result 형식

`DeveloperResult.md` 형식은 아래 문서의 정의를 사용한다.

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
```

## Scope Change Request 형식

`DeveloperScopeChangeRequest.md` 형식은 아래 문서의 정의를 사용한다.

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
```

## 현재 운영 방식

implementation-pilot automation은 2026-05-28에 생성되었고, 기본 상태는 `PAUSED`로 유지한다.

관찰된 approved-scope implementation 실행은 다음과 같다.

- `HANDOFF-20260528-009-attribute-node-hover-indicator`
- `HANDOFF-20260528-010-attribute-tooltip-bounds`

이후 사용할 때는 구체적인 Developer Packet을 만들고, 승인된 실행 범위를 기록한 뒤, 사용자 승인으로 자동화를 일시적으로 활성화한다. 한 번의 실행을 확인하면 다시 `PAUSED`로 돌리고, build 결과와 human QA evidence를 기록한 뒤 Packet을 닫는다.

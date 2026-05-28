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

각 run report는 다음 구조를 사용한다.

```md
# Developer Worker Implementation Run Report

## Automation

Name: playground-handoff-developer-worker-implementation-pilot
Run At:
Mode: approved-scope implementation pilot

## Files Read

-

## Working Tree Before

- Branch:
- Unrelated non-target changes:
- Target file changes before run:

## Queue Summary

| Handoff ID | Delivery | Execution | Scope Approved | Decision | Reason |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Selected Packet

Handoff ID:
Title:
Decision: NoCandidate / Implemented / ScopeChangeRequired / Blocked / ValidationDeferred / AlreadyPresent

## Approved Scope Check

- approved_execution_scope:
- allowed paths:
- forbidden paths:
- non-goals:
- validation plan:

## Implementation Summary

-

## Changed Files

-

## Validation

- Commands run:
- Results:
- Deferred human validation:

## Forbidden Action Check

- Out-of-scope file edits:
- JSON schema edits:
- Save/load changes:
- Lifecycle changes:
- Build setting edits:
- Asset edits:
- Supervisor surface edits:
- Manifest edits:
- Approval evidence edits:
- Packet status edits:
- Automation edits:
- Commit/push:

## Outputs Written

-

## Human Action Needed

-
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

## 다음 단계

implementation-pilot automation은 2026-05-28에 `PAUSED` 상태로 생성되었다.

다음 Phase 31A 단계는 작은 approved-scope implementation Packet 하나를 준비하고, 사용자 승인 후 자동화를 일시적으로 활성화해 한 번의 파일럿 실행을 관찰하는 것이다.

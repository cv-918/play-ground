# Developer Worker Prompt Contract

## 목적

이 문서는 Handoff v2 자동화 작업의 Phase 29B를 정의한다.

미래의 Developer Worker dry-run 자동화가 사용할 정확한 prompt 계약과 run report 형식을 기록한다.

이 문서는 recurring automation을 생성, 수정, 활성화, 실행하지 않는다.

## 권장 자동화

권장 이름:

```text
playground-handoff-developer-worker-dry-run
```

권장 초기 상태:

```text
PAUSED
```

권장 주기:

```text
60분, Handoff Supervisor 주기와 맞춤
```

초기 모드:

```text
approved-scope dry run
```

## Dry-run의 의미

dry-run 모드는 승인된 구현 작업을 읽고 계획할 수 있다.

dry-run 모드는 구현 파일을 수정하면 안 된다.

허용되는 dry-run 출력은 다음으로 제한한다.

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_DeveloperWorkerDryRun.md
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md
```

자동화는 `DeveloperDryRunPlan.md`를 덮어쓰면 안 된다.

이미 파일이 있으면 run report에 `AlreadyPresent`를 기록하고 건너뛴다.

## 후보 선택 조건

자동화는 다음 조건을 모두 만족하는 Packet만 선택할 수 있다.

- `to_roles`에 `Developer`가 있다.
- `approved_execution_scope.approved`가 `true`다.
- `approved_scope_allowed_paths`가 비어 있지 않다.
- `delivery_status`가 `Done` 또는 `Archived`가 아니다.
- `execution_status`가 `Done` 또는 `Blocked`가 아니다.
- `ImplementationRequest.md` 또는 동등한 구현 요청서가 있다.
- `Violations/Open.md`에 해당 Packet의 Critical 또는 Major 항목이 없다.
- changed-file scope drift가 없거나 Packet 안에서 이미 설명되어 있다.
- 예상 구현이 승인된 allowed paths 안에 머물 수 있다.

후보가 여러 개면 하나만 선택한다.

우선순위:

1. 명시적으로 active인 Developer Packet.
2. 가장 최근에 갱신된 approved-scope Developer Packet.
3. 그 외에는 후보 없음.

## 허용 읽기

dry-run 자동화는 다음을 읽을 수 있다.

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md`
- 대상 Packet의 `manifest.yaml`
- 대상 Packet의 `PlanningBrief.md`
- 대상 Packet의 `ImplementationRequest.md`
- 대상 Packet의 `Results/*.md`
- `approved_scope_allowed_paths`에 있는 source 파일
- 승인된 파일을 이해하는 데 필요한 가까운 주변 source 파일

읽기 전용 source 조사는 `rg`, `Get-Content`, `git diff --name-only`, `git status`를 사용한다.

## 허용 쓰기

dry-run 자동화는 다음만 쓸 수 있다.

- `_Docs/Handoff/Role_Workers/Automation/Runs/` 아래 timestamp run report 1개
- 선택된 Packet의 새 `Results/DeveloperDryRunPlan.md` 1개

dry-run 자동화는 그 외의 파일을 쓰면 안 된다.

## 금지 행동

dry-run 자동화는 다음을 하면 안 된다.

- game source 수정
- gameplay JSON 수정
- non-schema data 수정
- asset 생성 또는 수정
- build 명령 실행
- test 실행
- runtime behavior 변경
- build setting 수정
- Supervisor가 생성하는 Dashboard, Queue, Violations 수정
- `_Docs/Handoff/00_Index.md` 수정
- Packet manifest 수정
- approval evidence 수정
- Packet claim
- `delivery_status` 또는 `execution_status` 변경
- Packet `Done` 또는 `Archived` 처리
- DevLog 생성
- commit
- push
- 역할 채팅 깨우기 또는 제어
- recurring automation 생성 또는 수정

## 멈춤 조건

dry-run 자동화는 다음 상황에서 Packet plan 없이 멈춘다.

- approved-scope Developer Packet이 없다.
- 선택된 Packet에 Critical 또는 Major violation이 있다.
- 선택된 Packet에 승인된 실행 범위가 없다.
- 예상 구현에 승인 경로 밖의 파일이 필요하다.
- 승인되지 않은 schema, save/load, lifecycle, build setting, asset, commit, push 변경이 필요해 보인다.
- 작업대에 dry-run 대상 파일과 충돌할 수 있는 무관한 변경이 있다.
- 안전하고 리뷰 가능한 계획을 판단할 수 없다.

멈출 때는 run report만 작성하고 멈춘 이유를 기록한다.

## 정확한 자동화 Prompt

별도 사용자 승인 후 미래 recurring automation에 이 prompt를 사용한다.

```text
Run the PlayGround Handoff Developer Worker in approved-scope dry-run mode.

Repository root:
C:\Users\kalux\workStation\play-ground

Automation name:
playground-handoff-developer-worker-dry-run

Mode:
approved-scope dry run

Goal:
Inspect the Handoff Developer queue and prepare at most one implementation dry-run plan for a Developer Packet that already has an approved execution scope.

Read first:
- AGENTS.md
- _Docs/Handoff/Dashboard.md
- _Docs/Handoff/Queues/Developer.md
- _Docs/Handoff/Violations/Open.md
- _Docs/Handoff/Role_Workers/Developer_Worker_MVP.md
- _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md

Candidate rule:
Select at most one Packet where:
- to_roles includes Developer
- approved_execution_scope.approved is true
- approved_scope_allowed_paths is not empty
- delivery_status is not Done or Archived
- execution_status is not Done or Blocked
- the Packet has an ImplementationRequest.md or equivalent implementation request
- Violations/Open.md has no Critical or Major issue for that Packet
- the likely implementation can stay inside approved_scope_allowed_paths

Allowed reads:
- target Packet manifest and request/result documents
- source files listed in approved_scope_allowed_paths
- nearby source files only when needed to understand the approved files
- git status and git diff --name-only for working-tree awareness
- rg and Get-Content for read-only inspection

Allowed writes:
- one timestamped run report under _Docs/Handoff/Role_Workers/Automation/Runs/
- one new _Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md

Do not overwrite DeveloperDryRunPlan.md.
If it already exists, write only the run report and record AlreadyPresent.

Forbidden actions:
- do not edit game source
- do not edit gameplay JSON
- do not edit non-schema data
- do not create or edit assets
- do not run build commands
- do not run tests
- do not change runtime behavior
- do not edit build settings
- do not edit generated Supervisor surfaces
- do not edit _Docs/Handoff/00_Index.md
- do not edit Packet manifests
- do not edit approval evidence
- do not claim Packets
- do not change delivery_status or execution_status
- do not mark Done or Archived
- do not create DevLogs
- do not commit
- do not push
- do not wake or control role chats
- do not create or modify recurring automations

Required run report:
Always write one timestamped run report using the format in _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md.

Required result:
If one safe candidate is selected and DeveloperDryRunPlan.md does not already exist, write DeveloperDryRunPlan.md using the format in _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md.
Otherwise, write no Packet Result and explain why in the run report.
```

## Run Report 형식

각 run report는 다음 구조를 사용한다.

```md
# Developer Worker Dry-Run Report

## Automation

Name: playground-handoff-developer-worker-dry-run
Run At:
Mode: approved-scope dry run

## Files Read

-

## Queue Summary

| Handoff ID | Delivery | Execution | Scope Approved | Decision | Reason |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Selected Packet

Handoff ID:
Title:
Decision: NoCandidate / PlanWritten / AlreadyPresent / Blocked

## Approved Scope Check

- approved_execution_scope:
- allowed paths:
- forbidden paths:
- non-goals:
- validation plan:

## Working Tree Check

- git status checked:
- changed target files:
- unrelated changes observed:
- decision:

## Proposed Implementation Plan

-

## Files Expected To Change In Future Implementation

-

## Out-Of-Scope Or Protected Changes Needed

-

## Files Written

-

## Forbidden Action Check

- [ ] No game source edits.
- [ ] No gameplay JSON edits.
- [ ] No non-schema data edits.
- [ ] No asset edits.
- [ ] No build commands.
- [ ] No tests.
- [ ] No runtime behavior changes.
- [ ] No build setting edits.
- [ ] No generated Supervisor surface edits.
- [ ] No 00_Index.md edits.
- [ ] No Packet manifest edits.
- [ ] No approval evidence edits.
- [ ] No Packet claim.
- [ ] No status changes.
- [ ] No Done or Archived marking.
- [ ] No DevLog creation.
- [ ] No commit.
- [ ] No push.
- [ ] No role-chat wakeup or control.
- [ ] No recurring automation creation or modification.

## Stop Reason

-

## Result

-
```

## DeveloperDryRunPlan 형식

작성한다면 `DeveloperDryRunPlan.md`는 다음 구조를 사용한다.

```md
# Developer Dry-Run Plan

## Handoff

Handoff ID:
Title:

## Scope Status

Approved execution scope:
Allowed paths:
Forbidden paths:
Non-goals:

## Understanding

-

## Proposed Implementation

-

## Expected Files To Change

-

## Expected Validation

-

## Stop Conditions For Implementation Mode

-

## Not Performed In Dry Run

- No source edits.
- No JSON edits.
- No asset edits.
- No build/test execution.
- No status changes.
- No commit or push.
```

## Phase 29B 완료 기준

Phase 29B는 다음을 만족하면 완료다.

- 이 prompt contract가 존재한다.
- 한글 지원 문서가 존재한다.
- `_Docs/Handoff/00_Index.md`가 두 문서를 링크한다.
- WorkLog가 자동화를 생성하지 않았음을 기록한다.
- Handoff Supervisor scan에서 consistency issue가 없다.
- Phase 29B 파일 대상 `git diff --check`가 통과한다.

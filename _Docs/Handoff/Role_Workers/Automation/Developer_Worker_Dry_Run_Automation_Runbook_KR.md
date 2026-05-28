# Developer Worker Dry-Run Automation Runbook

## 목적

이 문서는 Phase 30A, 첫 Developer Worker dry-run recurring automation 생성을 기록한다.

이 문서는 운영 runbook이며, 자동화를 source 수정 구현 모드로 확장하는 권한이 아니다.

## 자동화

- automation id: `playground-handoff-developer-worker-dry-run`
- 상태: PAUSED
- 주기: 60분 간격, Handoff Supervisor 주기와 맞춤
- 실행 환경: local workspace
- workspace: `C:\Users\kalux\workStation\play-ground`

## 모드

```text
approved-scope dry run
```

이 자동화는 Developer 계획 직원이다. source를 수정하는 구현 직원이 아니다.

승인된 범위가 있는 Developer Packet을 조사하고 dry-run 구현 계획을 준비할 수 있다.

source, JSON, runtime behavior, asset, build setting, Packet state, approval evidence, Git state는 수정하면 안 된다.

## Prompt 출처

자동화 prompt는 다음 문서를 기준으로 한다.

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md
```

이 prompt contract는 다음 항목의 검토 가능한 기준이다.

- 후보 선택
- 허용 읽기
- 허용 쓰기
- 금지 행동
- run report 형식
- `DeveloperDryRunPlan.md` 형식

## 허용 읽기

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md`
- 대상 Packet manifest, request 문서, result 문서
- `approved_scope_allowed_paths`에 있는 source 파일
- 승인된 파일을 이해하는 데 필요한 가까운 주변 source 파일

## 허용 쓰기

다음 위치에 timestamp run report 1개:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
```

run report는 아래 문서에 정의된 한글 섹션 제목과 한글 필드명을 사용한다.

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md
```

선택된 Packet 아래 새 dry-run plan 1개:

```text
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md
```

자동화는 기존 `DeveloperDryRunPlan.md`를 덮어쓰면 안 된다.

## 금지 행동

자동화는 다음을 하면 안 된다.

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

## 실행 행동

나중에 활성화되면 각 실행은 다음을 해야 한다.

1. 필요한 Handoff 문서와 Developer Worker contract를 읽는다.
2. Developer queue와 open violations를 읽는다.
3. 승인된 범위가 있는 Developer Packet을 최대 1개 선택한다.
4. 승인된 source 파일과 필요한 가까운 주변 문맥만 읽는다.
5. timestamp run report 1개를 작성한다.
6. 안전한 후보가 있고 대상 파일이 아직 없을 때만 `DeveloperDryRunPlan.md`를 작성한다.
7. source, status, manifest, approval evidence, DevLog, Git state는 수정하지 않고 멈춘다.

## 활성화 규칙

자동화는 `PAUSED` 상태로 생성되었다.

사용자가 첫 dry-run 검증을 명시적으로 요청하기 전까지 활성화하지 않는다.

## 첫 실행 검증

Phase 30B 첫 실행 검증은 2026-05-28에 수행했다.

확인된 run report:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/2026-05-28_025229_DeveloperWorkerDryRun.md
```

확인 결과:

- 실행 시각: 2026-05-28 02:52:39 +09:00
- 선택된 Packet: 없음
- 이유: active 상태의 approved-scope Developer Packet이 없었음
- 작성된 파일: timestamp run report 1개만 작성
- `DeveloperDryRunPlan.md`: 작성되지 않음
- source, JSON, non-schema data, asset, build/test, generated Supervisor surfaces, `00_Index.md`, manifest, approval evidence, Packet status, DevLog, commit, push, role-chat control: 자동화가 건드리지 않음
- 검증 후 자동화를 `PAUSED`로 되돌림

판정:

```text
no-candidate dry-run 검증 통과
```

## Phase 30A 완료 기준

Phase 30A는 다음을 만족하면 완료다.

- recurring automation이 존재한다.
- 상태가 PAUSED다.
- Phase 29B prompt contract를 사용한다.
- 이 runbook이 생성 경계를 기록한다.
- WorkLog가 아직 dry-run 실행 검증은 하지 않았음을 기록한다.

## Phase 30C Plan 생성 파일럿

Phase 30C는 2026-05-28에 다음 Packet으로 검증했다.

```text
_Docs/Handoff/Packets/HANDOFF-20260528-008-developer-worker-dry-run-plan-pilot/
```

처음 plan을 작성한 run report:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/2026-05-28_041145_DeveloperWorkerDryRun.md
```

생성된 dry-run plan:

```text
_Docs/Handoff/Packets/HANDOFF-20260528-008-developer-worker-dry-run-plan-pilot/Results/DeveloperDryRunPlan.md
```

자동화가 ACTIVE로 남아 있는 동안 추가 반복 실행도 발생했다.

```text
2026-05-28_051214_DeveloperWorkerDryRun.md
2026-05-28_061241_DeveloperWorkerDryRun.md
2026-05-28_071422_DeveloperWorkerDryRun.md
2026-05-28_081516_DeveloperWorkerDryRun.md
```

반복 실행들은 `AlreadyPresent`를 보고했고 `DeveloperDryRunPlan.md`를 덮어쓰지 않았다.

검증 후 자동화를 `PAUSED`로 되돌렸다.

판정:

```text
통과. Plan 생성 경로와 반복 실행 시 덮어쓰기 금지 경로를 모두 확인했다.
```

# Developer Worker Prompt Contract

## Purpose

This document defines Phase 29B of the Handoff v2 automation work.

It records the exact prompt contract and run report format for the future Developer Worker dry-run automation.

It does not create, update, activate, or run a recurring automation.

## Recommended Automation

Recommended name:

```text
playground-handoff-developer-worker-dry-run
```

Recommended initial state:

```text
PAUSED
```

Recommended cadence:

```text
60 minutes, aligned with the Handoff Supervisor cadence
```

Initial mode:

```text
approved-scope dry run
```

## Dry-Run Meaning

Dry-run mode may inspect and plan approved implementation work.

Dry-run mode must not edit implementation files.

Allowed dry-run output is limited to:

```text
_Docs/Handoff/Role_Workers/Automation/Runs/YYYY-MM-DD_HHMMSS_DeveloperWorkerDryRun.md
_Docs/Handoff/Packets/<handoff-id>/Results/DeveloperDryRunPlan.md
```

The automation must not overwrite `DeveloperDryRunPlan.md`.

If the file already exists, the run report must record `AlreadyPresent` and skip writing it.

## Candidate Selection

The automation may select a Packet only when all conditions are true:

- `to_roles` includes `Developer`.
- `approved_execution_scope.approved` is `true`.
- `approved_scope_allowed_paths` is not empty.
- `delivery_status` is not `Done` or `Archived`.
- `execution_status` is not `Done` or `Blocked`.
- the Packet has an `ImplementationRequest.md` or equivalent implementation request.
- the Packet has no Critical or Major entry in `Violations/Open.md`.
- changed-file scope drift is absent or already explained in the Packet.
- the likely implementation can stay inside the approved allowed paths.

If multiple candidates exist, choose one candidate only.

Preferred order:

1. Explicitly active Developer Packet.
2. Most recently updated approved-scope Developer Packet.
3. Otherwise, no candidate.

## Allowed Reads

The dry-run automation may read:

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md`
- target Packet `manifest.yaml`
- target Packet `PlanningBrief.md`
- target Packet `ImplementationRequest.md`
- target Packet `Results/*.md`
- source files listed in `approved_scope_allowed_paths`
- nearby source files needed to understand the listed files

Read-only source inspection should use `rg`, `Get-Content`, `git diff --name-only`, and `git status`.

## Allowed Writes

The dry-run automation may write:

- one timestamped run report under `_Docs/Handoff/Role_Workers/Automation/Runs/`
- one new `Results/DeveloperDryRunPlan.md` in the selected Packet

The dry-run automation must not write anything else.

## Forbidden Actions

The dry-run automation must not:

- edit game source
- edit gameplay JSON
- edit non-schema data
- create or edit assets
- run build commands
- run tests
- change runtime behavior
- edit build settings
- edit generated Supervisor surfaces
- edit `_Docs/Handoff/00_Index.md`
- edit Packet manifests
- edit approval evidence
- claim Packets
- change `delivery_status` or `execution_status`
- mark Packet `Done` or `Archived`
- create DevLogs
- commit
- push
- wake or control role chats
- create or modify recurring automations

## Stop Conditions

The dry-run automation must stop without a Packet plan when:

- no approved-scope Developer Packet exists
- the selected Packet has Critical or Major violations
- the selected Packet has no approved execution scope
- the likely implementation needs files outside approved paths
- the work appears to need schema, save/load, lifecycle, build setting, asset, commit, or push changes not already approved
- the working tree has unrelated changes in files that the dry-run would need to inspect as target files
- the automation cannot determine a safe, reviewable plan

When stopping, write only the run report and record the stop reason.

## Exact Automation Prompt

Use this prompt for the future recurring automation after separate user approval:

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
Always write one timestamped run report using the Korean format in _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md.

Required result:
If one safe candidate is selected and DeveloperDryRunPlan.md does not already exist, write DeveloperDryRunPlan.md using the format in _Docs/Handoff/Role_Workers/Developer_Worker_Prompt_Contract.md.
Otherwise, write no Packet Result and explain why in the run report.
```

## Run Report Format

Each run report must use this Korean structure. Keep decision enum values in parentheses when useful for traceability.

```md
# Developer Worker Dry-Run 실행 보고

## 자동화

이름: playground-handoff-developer-worker-dry-run
실행 시각:
모드: 승인 범위 dry-run

## 읽은 파일

-

## Queue 요약

| Handoff ID | 전달 상태 | 실행 상태 | 범위 승인 | 판단 | 사유 |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## 선택한 Packet

Handoff ID:
제목:
판단: 후보 없음(NoCandidate) / 계획 작성(PlanWritten) / 이미 있음(AlreadyPresent) / 막힘(Blocked)

## 승인 범위 확인

- approved_execution_scope:
- 허용 경로:
- 제외 경로:
- 제외 목표:
- 검증 계획:

## 작업대 확인

- git status 확인:
- 변경된 대상 파일:
- 관련 없는 변경:
- 판단:

## 제안 구현 계획

-

## 향후 구현 예상 변경 파일

-

## 범위 밖 또는 보호 변경 필요 여부

-

## 작성한 파일

-

## 경계 확인

- [ ] 게임 소스 수정 없음.
- [ ] 게임플레이 JSON 수정 없음.
- [ ] 비스키마 데이터 수정 없음.
- [ ] 에셋 수정 없음.
- [ ] 빌드 명령 실행 없음.
- [ ] 테스트 실행 없음.
- [ ] 런타임 동작 변경 없음.
- [ ] 빌드 설정 수정 없음.
- [ ] Supervisor 생성 표면 수정 없음.
- [ ] 00_Index.md 수정 없음.
- [ ] Packet manifest 수정 없음.
- [ ] approval evidence 수정 없음.
- [ ] Packet claim 없음.
- [ ] 상태 변경 없음.
- [ ] Done 또는 Archived 처리 없음.
- [ ] DevLog 생성 없음.
- [ ] commit 없음.
- [ ] push 없음.
- [ ] 역할 채팅 깨우기/제어 없음.
- [ ] recurring automation 생성/수정 없음.

## 중지 사유

-

## 결과

-
```

## Automation Final Response Format

The Codex automation thread response must use this Korean structure:

```md
# Developer Worker Dry-Run 실행 결과

## 상태
- 결과: 후보 없음 / 계획 작성 / 이미 있음 / 막힘
- 자동화: playground-handoff-developer-worker-dry-run
- 선택 Packet: <handoff id and title, or 없음>

## 작성한 파일
- Run report: <path>
- DeveloperDryRunPlan.md: <path or 없음>

## 경계 확인
- 소스 수정: 없음
- JSON 수정: 없음
- 빌드/테스트 실행: 없음
- manifest/status/approval evidence 변경: 없음
- commit/push: 없음

## 사용자 확인 필요
없음
```

## DeveloperDryRunPlan Format

If written, `DeveloperDryRunPlan.md` must use this structure:

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

## Phase 29B Completion Criteria

Phase 29B is complete when:

- this prompt contract exists
- Korean support summary exists
- `_Docs/Handoff/00_Index.md` links both documents
- WorkLog records that no automation was created
- Handoff Supervisor scan reports no consistency issues
- `git diff --check` passes for Phase 29B files

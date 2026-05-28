# Developer Worker Implementation Mode Prompt Contract

## Purpose

This document defines the Phase 31A prompt contract for a future Developer Worker implementation-mode automation.

It records the exact operating prompt, output rules, and stop behavior for a narrow approved-scope implementation pilot.

This document does not create, update, activate, or run a recurring automation.

## Recommended Automation

Recommended name:

```text
playground-handoff-developer-worker-implementation-pilot
```

Recommended initial state:

```text
PAUSED
```

Recommended first use:

```text
Temporarily activate for one approved-scope pilot, then return to PAUSED.
```

Recommended cadence if created as recurring automation:

```text
60 minutes, aligned with the Handoff Supervisor cadence.
Keep PAUSED except during an explicitly approved pilot window.
```

## Mode Meaning

Implementation mode may edit files inside the selected Packet's approved execution scope.

The worker must not ask for extra approval merely because source files are edited.

It must stop only when:

- the work needs a file outside `approved_scope_allowed_paths`
- the work needs a protected behavior not included in the approved scope
- the needed validation is outside the approved validation plan
- target files contain unrelated local changes
- the worker cannot produce a small reviewable diff

## Candidate Selection

The automation may select one Packet only when all conditions are true:

- `to_roles` includes `Developer`.
- `approved_execution_scope.approved` is `true`.
- `approved_scope_allowed_paths` is not empty.
- `delivery_status` is not `Done` or `Archived`.
- `execution_status` is not `Done`, `Blocked`, or `WaitingUserApproval`.
- the Packet has `ImplementationRequest.md` or an equivalent implementation request.
- `_Docs/Handoff/Violations/Open.md` has no Critical or Major issue for the Packet.
- the likely implementation can stay inside `approved_scope_allowed_paths`.
- the approved validation plan is clear or explicitly allows manual validation deferral.

If multiple candidates exist, choose at most one.

Preferred order:

1. Explicitly active Developer Packet.
2. Most recently updated approved-scope Developer Packet.
3. Otherwise, no candidate.

## Working Tree Rule

The automation must run `git status --short` and `git diff --name-only` before editing.

Unrelated local changes outside the selected Packet's target files do not block the worker. They must be recorded in the run report.

Unrelated local changes inside any target file block the worker. In that case, write a run report and `Results/DeveloperScopeChangeRequest.md`, then stop without editing.

## Allowed Reads

The automation may read:

- `AGENTS.md`
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/Developer.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_MVP.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md`
- `_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Prompt_Contract.md`
- target Packet `manifest.yaml`
- target Packet `PlanningBrief.md`
- target Packet `ImplementationRequest.md`
- target Packet `Results/*.md`
- files listed in `approved_scope_allowed_paths`
- nearby source files only when needed to understand an approved file's local context
- `git status --short`
- `git diff --name-only`
- `git diff -- <approved files>`
- `git diff --check -- <approved files>`

## Allowed Writes

The automation may write:

- files listed in `approved_scope_allowed_paths`
- one timestamped run report under `_Docs/Handoff/Role_Workers/Automation/Runs/`
- one new or explicitly superseding `Results/DeveloperResult.md`
- `Results/DeveloperScopeChangeRequest.md` when the worker must stop
- one DevLog under `_DevLog/FixLog/` or `_DevLog/WorkLog/`

## Forbidden Actions

The automation must not:

- edit files outside `approved_scope_allowed_paths`
- edit JSON schema unless explicitly included in the approved scope
- change save/load behavior unless explicitly included in the approved scope
- change scene, actor, or component lifecycle unless explicitly included in the approved scope
- change build settings unless explicitly included in the approved scope
- create, replace, or edit assets unless explicitly included in the approved scope
- perform broad refactors
- edit generated Handoff Supervisor surfaces
- edit `_Docs/Handoff/00_Index.md`
- edit Packet manifests
- edit approval evidence
- claim Packets
- change `delivery_status` or `execution_status`
- mark a Packet `Done` or `Archived`
- create, update, activate, pause, or delete automations
- commit
- push
- wake or control role chats

## Validation Rule

The automation may always run these safety checks:

- `git status --short`
- `git diff --name-only`
- `git diff --check -- <changed files>`

Builds, tests, runtime smoke checks, or project commands may run only if the selected Packet explicitly approves them in `approved_scope_validation`.

When an approved build/test/smoke command fails, the automation must inspect the first relevant failure. If the cause is inside `approved_scope_allowed_paths`, it must apply an in-scope fix, rerun the same validation command, and record the failure, fix, and rerun result. It should write `DeveloperScopeChangeRequest.md` only when the fix requires out-of-scope files, unapproved protected behavior, unapproved validation, or guessing.

If validation is not approved or cannot be run, the worker records the needed manual validation in `DeveloperResult.md` and does not claim that validation passed.

## Stop Decisions

Use these decisions in the run report:

```text
NoCandidate
Implemented
ScopeChangeRequired
Blocked
ValidationDeferred
AlreadyPresent
```

`Implemented` means implementation files were edited inside scope and required result documents were written. It does not mean the Packet is Done.

`ValidationDeferred` means implementation was completed inside scope, but runtime/build/manual validation still needs human evidence.

## Exact Automation Prompt

Use this prompt for the future recurring automation only after separate user approval:

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
- If an approved build/test/runtime command fails, inspect the first relevant failure.
- If the cause is inside approved_scope_allowed_paths, apply the in-scope fix, rerun the same validation command, and record the failure, fix, and rerun result.
- If the fix requires out-of-scope files, unapproved protected behavior, unapproved validation commands, or guessing, write DeveloperScopeChangeRequest.md and stop.
- If validation is deferred, record exactly what human validation is needed and do not claim validation passed.

Required outputs:
- Always write one timestamped implementation run report.
- If implementation edits were made, write DeveloperResult.md and one DevLog.
- If blocked before or during implementation, write DeveloperScopeChangeRequest.md instead of DeveloperResult.md.
- Never mark the Packet Done.
- Never commit or push.
```

## Implementation Run Report Format

Each run report must use this Korean structure. Keep decision enum values in parentheses when useful for traceability.

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

## Automation Final Response Format

The Codex automation thread response must use this Korean structure:

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

## Developer Result Format

Use the `DeveloperResult.md` format defined in:

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
```

## Scope Change Request Format

Use the `DeveloperScopeChangeRequest.md` format defined in:

```text
_Docs/Handoff/Role_Workers/Developer_Worker_Implementation_Mode_Contract.md
```

## Current Operating Posture

The implementation-pilot automation was created on 2026-05-28 and is kept `PAUSED` by default.

It has completed observed approved-scope implementation runs for:

- `HANDOFF-20260528-009-attribute-node-hover-indicator`
- `HANDOFF-20260528-010-attribute-tooltip-bounds`

For future use, prepare one concrete approved-scope Developer Packet, temporarily activate the automation for one observed run, return it to `PAUSED`, then record build and human QA evidence before closing the Packet.

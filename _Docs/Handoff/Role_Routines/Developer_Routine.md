# Developer Routine

## Role Purpose

Developer turns approved implementation requests into bounded implementation plans and repository changes inside the approved execution scope.

Developer must protect architecture, runtime behavior, data schema, validation integrity, and Git boundaries.

## Input Conditions

Developer may inspect work when:

- The Packet `to_roles` includes `Developer`.
- The Packet has `ImplementationRequest.md` or equivalent implementation instructions.
- The Packet is `Ready`, `Claimed`, `WaitingUserApproval`, or explicitly assigned by the human developer.

## Routine

1. Read `_Docs/Handoff/00_Index.md`.
2. Find Packets targeted to `Developer`.
3. Read `manifest.yaml`.
4. Read `PlanningBrief.md`, `ImplementationRequest.md`, relevant `ResourceNotes/`, and prior `Results/`.
5. If taking the work, update claim fields and set `execution_status: Planning`.
6. Write `Results/DeveloperPlan.md`.
7. Classify risk using AIWorkflow and `AGENTS.md`.
8. If no execution scope is approved yet, write a substantive approval request and stop.
9. If approval exists, verify the approved scope before editing.
10. Execute only within approved scope.
11. Run approved validation or clearly document why validation was not run.
12. Write `Results/DeveloperResult.md`.
13. Request review or QA when required.
14. Update manifest and index.
15. Create or update DevLog when the work is meaningful.

## High-Risk Developer Work

Developer must wait for approval when there is no approved execution scope, or when the work would leave the approved scope.

Approval is not required again only because source code or non-schema data will be edited inside an already approved scope.

Developer must request renewed approval before:

- Source code implementation outside the approved scope
- Non-schema data edits outside the approved scope
- Refactoring outside the approved scope
- JSON schema changes not included in the approved scope
- Save/load changes not included in the approved scope
- Runtime behavior changes beyond the approved design
- Scene or actor lifecycle changes beyond the approved scope
- Build setting changes
- Project source directory file creation outside the approved scope
- File-modifying tools outside the approved scope
- Commit or push

## Developer Approval Request

Use `Results/DeveloperPlan.md`, `_Docs/Handoff/Packets/_Approval_Request_Template.md`, and `_Docs/Handoff/Approval_Waiting_Flow.md`.

The request must explain:

- What will change in the game or workflow
- Which behavior will appear
- Which files are expected to change
- Which files will not be touched
- Data/schema impact
- Runtime impact
- Risks
- Validation plan
- Exact decision needed
- Suggested user response for approve, reject, and scope modification

## Developer Result

`DeveloperResult.md` should include:

- Summary
- Files changed
- Scope actually executed
- Validation commands run
- Validation results
- Validation not run
- Remaining risks
- Review request or QA request
- DevLog link

## Korean Summary

Developer는 먼저 Packet을 읽고 `DeveloperPlan.md`를 작성한다. 승인된 실행 범위가 있으면 그 안의 일반적인 코드 수정과 스키마 변경이 아닌 데이터 수정은 다시 승인받지 않고 진행한다.

승인된 범위 밖 파일, 동작, schema, 저장/로드, lifecycle, 빌드, Git 변경이 필요해지면 다시 멈추고 실질 변경 내용 기반 승인 요청을 남긴다. 결과는 `DeveloperResult.md`와 필요한 DevLog에 남긴다.

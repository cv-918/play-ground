# Handoff Index

## Purpose

This index tracks active handoff documents between roles.

Use this file as a lightweight table of contents. When a handoff is created, add it to the relevant section. When the handoff is completed or superseded, update its status and move the document to `Done/` or `Archive/` when appropriate.

## System Documents

| Title | Path | Note |
| --- | --- | --- |
| AI Role Handoff System Principles | `Handoff_System_Principles.md` | Operational source for AI-facing Handoff principles |
| AI Role Handoff System 운영 원칙 | `Handoff_System_Principles_KR.md` | Korean support document for the human developer |
| Handoff Packet Specification | `Handoff_Packet_Spec.md` | Packet structure and manifest rules |
| Handoff Packet 명세 | `Handoff_Packet_Spec_KR.md` | Korean Packet structure guide |
| Read-Only Handoff Scanner Design | `ReadOnly_Scanner_Design.md` | Read-only scanner behavior and report rules |
| 읽기 전용 Handoff 스캐너 설계 | `ReadOnly_Scanner_Design_KR.md` | Korean scanner behavior guide |
| Handoff Status Update Boundaries | `Status_Update_Boundaries.md` | Document-only Handoff status update rules |
| Handoff 상태 갱신 경계 | `Status_Update_Boundaries_KR.md` | Korean status update boundary guide |
| Handoff Guide | `Handoff_Guide_KR.md` | Basic Korean usage guide for the shared exchange space |
| Handoff System User Guide | `Guide/Handoff_System_User_Guide_KR.html` | User-facing Korean HTML guide |
| Manifest Template | `Packets/_Manifest_Template.yaml` | Starting point for Packet manifests |
| Packet Document Template | `Packets/_Packet_Document_Template.md` | Generic Packet document template |
| Approval Request Template | `Packets/_Approval_Request_Template.md` | Substantive approval request template |
| Scan Report Template | `Scanner/_Scan_Report_Template.md` | Read-only scanner report template |
| Status Update Record Template | `Status_Updates/_Status_Update_Record_Template.md` | Document-only status update record template |
| Role Routine Overview | `Role_Routines/Role_Routine_Overview.md` | Shared routine for all role chats |
| Planner Routine | `Role_Routines/Planner_Routine.md` | Planner handoff creation routine |
| Developer Routine | `Role_Routines/Developer_Routine.md` | Developer planning and approval routine |
| Artist Routine | `Role_Routines/Artist_Routine.md` | Resource handoff routine |
| Reviewer Routine | `Role_Routines/Reviewer_Routine.md` | Review routine |
| QA Routine | `Role_Routines/QA_Routine.md` | QA routine |

## Status Values

- `Draft`: being prepared
- `Ready`: ready for the receiving role
- `In Progress`: accepted and being worked on
- `Waiting User Approval`: waiting for explicit human approval before high-risk execution
- `Review Requested`: waiting for review
- `QA Requested`: waiting for QA
- `Done`: completed
- `Blocked`: waiting on missing information or dependency
- `Archived`: inactive or superseded

`Ready` does not mean execution is approved. Source code, data schema, runtime behavior, build setting, tool execution, commit, and push work still follow AIWorkflow approval gates.

## Waiting User Approval

High-risk Handoff work waiting for the human developer must be listed here.

| Handoff ID | Role | Title | Approval Request Path | Updated |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Packet Index

Structured Packets live under `Packets/`. Add new Packet folders here when they become `Ready` or when they need visibility before approval.

| Handoff ID | Delivery Status | Execution Status | From | To | Title | Manifest | Updated |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HANDOFF-20260525-001-handoff-system-phase1-3-review | Done | Done | Planner | Reviewer, QA | AI Role Handoff System Phase 1-3 Documentation Review | `Packets/HANDOFF-20260525-001-handoff-system-phase1-3-review/manifest.yaml` | 2026-05-25 |

## Active Handoffs

| Status | From | To | Title | Path | Updated |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

## Recent Done Notices

| Date | From | To | Title | Path |
| --- | --- | --- | --- | --- |
| 2026-05-25 | Reviewer, QA | Planner | AI Role Handoff System Phase 1-3 Documentation Review | `Packets/HANDOFF-20260525-001-handoff-system-phase1-3-review/CompletionNotice.md` |

## Korean Note

이 파일은 역할 간 전달 문서의 간단한 색인입니다. 새 전달 문서를 만들면 `Active Handoffs`에 추가하고, 완료되면 `Done/` 또는 `Archive/`로 이동한 뒤 상태를 갱신합니다.

`Ready`는 실행 승인 상태가 아닙니다. 코드, 데이터, 런타임 동작, 빌드 설정, 도구 실행, 커밋, 푸시는 여전히 AIWorkflow 승인 게이트를 따릅니다. 높은 위험 작업이 사용자 승인을 기다릴 때는 `Waiting User Approval`에 표시합니다.

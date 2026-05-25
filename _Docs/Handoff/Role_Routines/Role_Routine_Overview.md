# Role Routine Overview

## Purpose

This document defines the shared routine that every role chat must follow when using the AI Role Handoff System.

Role-specific documents extend this overview. They do not override `AGENTS.md`, `_Docs/AIWorkflow/`, or the Handoff principles.

## Required Reading Order

Every role chat should read in this order:

1. `AGENTS.md`
2. `_Docs/Handoff/Handoff_System_Principles.md`
3. `_Docs/Handoff/Handoff_Packet_Spec.md`
4. `_Docs/Handoff/00_Index.md`
5. This overview
6. The current role routine
7. The target Packet manifest and documents

## Universal Routine

1. Inspect `_Docs/Handoff/00_Index.md`.
2. Find Packet rows or active handoffs aimed at the current role.
3. Read the Packet `manifest.yaml`.
4. Read only the documents needed for the current role.
5. Confirm the work is in scope for the current role.
6. If taking the work, update the Packet manually:
   - `current_owner`
   - `claimed_by`
   - `claimed_at`
   - `delivery_status: Claimed`
   - `execution_status: Planning`
7. Write a plan before execution.
8. Classify risk.
9. If approval is required, write a substantive approval request, set `execution_status: WaitingUserApproval`, update `00_Index.md`, and stop.
10. If the work is low-risk document-only work, proceed only within the Handoff scope.
11. If the work was explicitly approved, execute only the approved scope.
12. Record results in the Packet.
13. Record validation performed or explicitly deferred.
14. Update review, QA, done, or blocked status.
15. Create or update DevLog when the work is meaningful.

## Risk Boundary

Low-risk role work is limited to document-only Handoff maintenance unless the human developer explicitly approves more.

High-risk work includes:

- Source code changes
- JSON schema changes
- Runtime behavior changes
- Save/load behavior changes
- Actor or scene lifecycle changes
- Project source directory file creation
- Build setting changes
- File-modifying tool execution outside Handoff documents
- Commit or push
- Workflow rule changes

High-risk work must stop at `WaitingUserApproval`.

## Approval Request Standard

Approval requests must describe the actual proposed change.

They must include:

- User-facing or gameplay/workflow change
- Intent
- Proposed behavior
- Data changes
- Code changes
- Expected files
- Non-goals
- Risks
- Validation plan
- Decision needed

Do not request approval with only a gate label.

## Status Update Rules

Use `delivery_status` for transfer state.

Use `execution_status` for execution state.

Do not mark a Packet `Done` unless:

- Required approvals are recorded.
- Results are written.
- Review and QA needs are handled or explicitly deferred.
- Validation is performed or explicitly deferred.
- Remaining risks are documented.
- DevLog exists when meaningful.

## Stop Conditions

Stop and report when:

- Required approval is missing.
- The Packet conflicts with AIWorkflow or `AGENTS.md`.
- The Packet lacks required inputs.
- Scope expands beyond `allowed_paths`.
- The role is not the intended owner.
- Validation cannot be identified.
- The role would need to edit source, data, runtime behavior, build settings, or Git state without approval.

## Korean Summary

모든 역할 채팅은 먼저 `00_Index.md`와 Packet manifest를 확인하고, 자기 역할의 작업인지 판단한 뒤 계획을 세운다.

낮은 위험 문서-only 작업은 승인된 Handoff 범위 안에서 진행할 수 있지만, 코드, 데이터, 런타임, 빌드, Git 변경은 반드시 `WaitingUserApproval`로 멈추고 실질 변경 내용 기반 승인 요청을 남긴다.

# Planner Routine

## Role Purpose

Planner turns approved planning conversations into Handoff Packets.

Planner prepares enough context for Developer, Artist, Reviewer, or QA to understand what to do next without replaying the whole conversation.

## Input Conditions

Planner may create a Packet when:

- The human developer approved the planning direction.
- The intended receiving role is known.
- The needed request can be described with scope, non-goals, inputs, and acceptance criteria.

Planning approval is not execution approval.

## Routine

1. Confirm the human developer approved the planning direction.
2. Choose a Packet ID using `HANDOFF-YYYYMMDD-###-short-slug`.
3. Create the Packet folder under `_Docs/Handoff/Packets/`.
4. Copy `_Docs/Handoff/Packets/_Manifest_Template.yaml` to `manifest.yaml`.
5. Fill required manifest fields:
   - `handoff_id`
   - `title`
   - `created_at`
   - `updated_at`
   - `from_role: Planner`
   - `to_roles`
   - `delivery_status`
   - `execution_status`
   - `risk_level`
   - `packet_documents`
   - `completion_criteria`
   - `next_actions`
6. Write `PlanningBrief.md`.
7. Write role-specific request documents as needed:
   - `ImplementationRequest.md`
   - `ArtRequest.md`
   - `ReviewRequest.md`
   - `QARequest.md`
8. Add `ResourceNotes/ResourceNotes.md` when resources or external references matter.
9. Add the Packet to `_Docs/Handoff/00_Index.md`.
10. Set `delivery_status: Ready` only when the receiving role has enough information to start planning.

## Required Planner Outputs

Every Planner-created Packet should answer:

- What is being requested?
- Why is it being requested?
- Which role should act next?
- What is in scope?
- What is out of scope?
- What inputs are required?
- What acceptance criteria define a good result?
- What approval or risk concerns are already known?

## Planner Stop Conditions

Stop and ask the human developer when:

- Planning direction is not explicitly approved.
- The receiving role is unclear.
- The request would silently approve implementation.
- The scope includes source, data, runtime, build, or Git changes but no execution approval exists.
- The design conflicts with AIWorkflow, `AGENTS.md`, or project architecture principles.

## What Planner Must Not Do

Planner must not:

- Record execution approval unless the human developer explicitly gave it.
- Mark source or data work as approved just because planning was approved.
- Modify game source, JSON schema, runtime behavior, build settings, or Git state.
- Mark a Packet `Done` when only planning handoff is complete.

## Korean Summary

Planner는 사용자가 기획 방향을 승인한 뒤 Packet을 만든다. Planner의 `Ready`는 받는 역할이 계획을 시작할 준비가 되었다는 뜻이지, 구현 승인이 아니다.

Planner는 `PlanningBrief.md`와 필요한 요청 문서를 만들고, `00_Index.md`에 Packet을 등록한다. 코드, 데이터, 런타임, Git 변경 승인은 별도로 받아야 한다.

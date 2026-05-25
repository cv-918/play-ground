# Reviewer Routine

## Role Purpose

Reviewer evaluates completed or proposed work for correctness, scope control, architecture safety, validation quality, and handoff completeness.

Reviewer should report findings clearly and should not silently perform implementation fixes unless separately assigned and approved.

## Input Conditions

Reviewer may inspect work when:

- The Packet `to_roles` includes `Reviewer`.
- `execution_status` is `ReviewRequested`.
- The Packet includes `ReviewRequest.md`.
- The human developer explicitly asks for review.

## Routine

1. Read `_Docs/Handoff/00_Index.md`.
2. Find Packets targeted to `Reviewer` or marked `ReviewRequested`.
3. Read `manifest.yaml`.
4. Read `ReviewRequest.md`, result documents, DevLog, and relevant diffs or file references.
5. Review against scope, non-goals, approval evidence, validation evidence, and AIWorkflow rules.
6. Write `Results/ReviewResult.md`.
7. Classify findings:
   - Critical
   - Major
   - Minor
   - Optional
8. If Critical or Major findings exist, set status to `Blocked` or return to the appropriate role.
9. If review passes, set status toward `QARequested` or `Done` only when completion criteria allow it.
10. Update manifest and index.

## Review Focus

Reviewer should check:

- Was approval required and recorded?
- Did execution stay within approved scope?
- Were non-goals respected?
- Did changed behavior match the request?
- Were data/schema/lifecycle/build risks handled?
- Were validation results real and traceable?
- Are remaining risks documented?
- Is the next role clear?

## Reviewer Stop Conditions

Stop when:

- Required diff or result evidence is missing.
- Approval evidence is missing for high-risk work.
- The review requires source changes but no implementation approval exists.
- Validation claims cannot be traced.
- The Packet asks Reviewer to mark Done without enough evidence.

## What Reviewer Must Not Do

Reviewer must not:

- Modify source code unless separately assigned and approved.
- Treat unrun validation as passed.
- Mark Critical or Major issues as acceptable without human decision.
- Mark a Packet `Done` only because review was performed.

## Korean Summary

Reviewer는 완료된 작업이나 제안된 작업을 범위, 승인, 검증, 아키텍처 관점에서 검토한다. 직접 수정하지 않고 `ReviewResult.md`에 Critical/Major/Minor/Optional로 결과를 남긴다.

승인 증거가 없거나 검증 주장이 추적되지 않으면 통과 처리하지 않는다.

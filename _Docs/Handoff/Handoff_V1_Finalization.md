# Handoff System v1 Finalization

## Purpose

This document closes Phase 16 of the AI Role Handoff System v1.

It defines the final v1 contract:

```text
what v1 includes,
what v1 does not include,
how to use it in daily work,
how to maintain it,
and what should wait for v2.
```

Phase 16 does not add new automation authority.

## Final v1 Verdict

Handoff System v1 is complete as a document-driven operating layer on top of the existing AIWorkflow.

Use it for:

- role-to-role task transfer
- shared Packet storage
- visible work queues
- approval waiting visibility
- Supervisor-generated status surfaces
- document-only operating checks

Do not treat v1 as:

- a fully autonomous role chat controller
- an implementation executor
- an automatic approval system
- an automatic commit/push system

## Final v1 Scope

v1 includes:

- `_Docs/Handoff/Packets/`
- `manifest.yaml` based Packet state
- Planning, implementation, review, QA, result, and completion documents
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `tools/aiworkflow/handoff_supervisor.bat`
- Supervisor recurring automation
- role routine documents
- role worker intake and harness documents
- low-risk role worker automation design
- paused low-risk role worker automation
- approval waiting flow
- approval request lint
- operations checklist
- v1 readiness audit

## Final v1 Non-Scope

v1 does not include:

- automatic role chat wakeups
- automatic role chat control
- autonomous source code implementation
- autonomous gameplay JSON or schema edits
- autonomous runtime behavior changes
- autonomous asset creation or replacement
- automatic approval evidence writing
- automatic Packet claim
- automatic `Done` or `Archived` decisions
- automatic build/test completion gates
- automatic commit or push

These remain explicit future work and require separate approval.

## Normal User Request Phrases

Use these plain requests in daily operation.

```text
현재 Handoff 상태 확인해줘.
```

Expected action:

- run Supervisor status
- summarize Dashboard, waiting approvals, and consistency issues

```text
Developer Queue 확인해줘.
```

Expected action:

- inspect `_Docs/Handoff/Queues/Developer.md`
- summarize Ready Work, Waiting User Approval, and blocked items

```text
현재 승인 대기 목록 설명해줘.
```

Expected action:

- list waiting approval items
- explain what each approval request actually changes
- show approve/reject/modify-scope choices

```text
이 기획을 Handoff Packet으로 만들어줘.
```

Expected action:

- create a scoped Packet
- write manifest and role request documents
- do not treat planning approval as implementation approval

```text
Handoff 정합성 문제 확인해줘.
```

Expected action:

- inspect `Violations/Open.md`
- explain each issue and the safe document-only fix path

## Maintenance Policy

When adding or changing Handoff workflow documents:

- update `_Docs/Handoff/00_Index.md`
- update the Korean HTML guide if user-facing operation changes
- write a WorkLog for meaningful process changes
- run `tools\aiworkflow\handoff_supervisor.bat status`
- run `git diff --check` on touched files

When changing automation behavior:

- update the relevant automation runbook
- update `Handoff_Operations_Checklist.md`
- update `Handoff_V1_Finalization.md` if the v1 contract changes
- record the automation state change in a WorkLog

When changing AIWorkflow behavior rather than Handoff behavior:

- follow `AGENTS.md`
- check whether `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` needs an update
- do not hide AIWorkflow rule changes inside Handoff-only documents

## Generated Surface Policy

Supervisor-generated surfaces may change only because their timestamp was refreshed:

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`

Timestamp-only diffs do not need their own commit.

Commit generated surfaces when:

- counts changed
- waiting approval items changed
- ready work changed
- violations changed
- Packet index state changed
- the generated surface update is part of a meaningful Handoff state change

## v2 Candidate List

These are candidates for a future Handoff v2, not v1 commitments.

- Turn low-risk Role Worker automation from `PAUSED` to `ACTIVE`.
- Allow Role Worker automation to draft Packet Results under a stricter approval boundary.
- Split Role Worker automation by role only if the single automation becomes insufficient.
- Add stronger review or QA linting for result documents.
- Add Handoff packet creation helpers.
- Add richer stale Packet detection.
- Add a generated v1/v2 operations dashboard.
- Integrate more tightly with AIWorkflow task state only after boundary review.

Every v2 item requires separate approval before implementation.

## v1 Completion Criteria

v1 is complete when:

- v1 final scope is documented
- v1 non-scope is documented
- daily request phrases are documented
- maintenance policy is documented
- generated surface policy is documented
- v2 candidates are recorded
- Handoff guide and index link this finalization document

## Final Note

Handoff v1 is now a working operating layer, not a replacement for human judgment or AIWorkflow safety rules.

The stable daily loop is:

```text
Planner discussion
-> Packet
-> Dashboard / Queue visibility
-> approval if needed
-> role result
-> review / QA evidence
-> completion notice
-> human commit/push decision
```

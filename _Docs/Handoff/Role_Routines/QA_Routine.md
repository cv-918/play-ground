# QA Routine

## Role Purpose

QA verifies behavior against acceptance criteria and records test evidence.

QA should distinguish clearly between tests that passed, failed, were blocked, or were not run.

## Input Conditions

QA may inspect work when:

- The Packet `to_roles` includes `QA`.
- `execution_status` is `QARequested`.
- The Packet includes `QARequest.md`.
- The human developer explicitly asks for QA.

## Routine

1. Read `_Docs/Handoff/00_Index.md`.
2. Find Packets targeted to `QA` or marked `QARequested`.
3. Read `manifest.yaml`.
4. Read `QARequest.md`, acceptance criteria, result documents, review result, and DevLog.
5. Identify test environment and validation limits.
6. Run only approved tests.
7. Record results in `Results/QAResult.md`.
8. Separate passed, failed, blocked, and not-run checks.
9. If failures are found, set status to `Blocked` or return to the responsible role.
10. If QA passes and no further role is needed, recommend `Done`.
11. Update manifest and index.

## QA Result Standard

`QAResult.md` should include:

- Test summary
- Environment
- Build or version tested
- Checks performed
- Pass results
- Fail results
- Blocked checks
- Not-run checks
- Evidence links or notes
- Remaining risks
- Done recommendation or next role

## QA Stop Conditions

Stop when:

- Required build or artifact is unavailable.
- Test environment is unclear.
- Acceptance criteria are missing.
- Running the test would modify files, data, runtime state, or external services without approval.
- QA is asked to claim validation passed without evidence.

## What QA Must Not Do

QA must not:

- Claim runtime validation passed without running it or receiving evidence.
- Change implementation while testing.
- Treat blocked tests as passed.
- Mark `Done` when review or approval requirements remain unresolved.

## Korean Summary

QA는 완료 기준에 맞춰 실제 확인한 것, 실패한 것, 막힌 것, 실행하지 못한 것을 분리해서 `QAResult.md`에 기록한다.

검증을 수행하지 않았으면 통과로 적지 않는다. 테스트 중 구현 변경이 필요해지면 QA가 직접 수정하지 않고 담당 역할로 되돌린다.

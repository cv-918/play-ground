# Handoff Supervisor 자동화 운영 문서

## 목적

이 문서는 Handoff Supervisor를 안전하게 자동화로 운영하는 방법을 정의한다.

AIWorkflow Handoff Integration의 Phase 9A 문서다.

## 자동화 목표

자동화의 목표는 Handoff 가시성을 최신 상태로 유지하는 것이다.

Supervisor가 할 수 있는 일:

- Packet manifest 스캔
- `Dashboard.md` 재생성
- 역할별 Queue 재생성
- `Violations/Open.md` 재생성
- 승인 대기, ready work, blocked, review 요청, QA 요청, 정합성 문제 요약

Supervisor는 구현 담당자가 되면 안 된다.

## 자동화 모드

### Mode 1: 수동 실행

사람 또는 Codex가 직접 실행한다.

```bat
tools\aiworkflow\handoff_supervisor.bat status
tools\aiworkflow\handoff_supervisor.bat write-docs --execute
```

Supervisor 로직이나 Packet 형식을 바꾸는 동안에는 이 모드를 사용한다.

### Mode 2: Thread Follow-Up

Codex 현재 대화가 나중에 깨어나 Handoff 상태를 확인한다.

짧은 후속 확인에는 유용하지만, 프로젝트의 지속 자동화로 취급하지 않는다.

허용 출력:

- 채팅 요약
- 해당 실행에 대해 명시 승인된 경우에만 생성 Handoff 상태 표면 갱신

### Mode 3: Workspace Cron

Codex automation이 저장소 workspace를 대상으로 반복 실행된다.

추천 첫 주기:

```text
자동화가 ACTIVE 상태인 동안 60분마다
```

허용 출력:

- `Dashboard.md`
- `Queues/<Role>.md`
- `Violations/Open.md`
- 승인 대기 또는 정합성 문제가 있을 때 짧은 실행 요약

## 첫 안전 자동화 범위

첫 반복 자동화는 다음만 수행한다.

1. `tools\aiworkflow\handoff_supervisor.bat status` 실행
2. `tools\aiworkflow\handoff_supervisor.bat write-docs --execute` 실행
3. 승인 대기 또는 정합성 문제가 있으면 요약
4. 생성 Handoff 상태 표면 밖의 파일은 수정하지 않음

## 명시적으로 금지되는 일

자동화는 다음을 하면 안 된다.

- 게임 소스 수정
- 게임플레이 JSON 수정
- JSON schema 변경
- 런타임 동작 변경
- 에셋 생성 또는 교체
- 빌드 또는 테스트 실행
- 작업 승인
- approval evidence 설정
- 역할 대신 Packet claim
- 작업을 `Done` 처리
- commit
- push
- 다른 역할 채팅 깨우기 또는 제어

## 사용자 승인 경계

반복 Codex automation 생성은 별도 승인 단계다.

승인에는 다음이 명시되어야 한다.

- 실행 주기
- workspace 경로
- 생성 Handoff 상태 표면을 쓸 수 있는지
- 보고만 할지, 문서 재생성까지 할지
- 요약을 어디에 남길지

## 승인된 첫 자동화

첫 Supervisor 반복 자동화는 2026-05-27에 사용자 승인을 받아 생성되었다.

승인된 설정:

- automation id: `playground-handoff-supervisor`
- 주기: 60분마다
- 상태: `ACTIVE`
- workspace: `C:\Users\kalux\workStation\play-ground`
- 생성 Handoff 상태 표면 갱신: 허용

`ACTIVE`는 Codex 자동화 객체가 켜져 있으며 정해진 주기로 실행된다는 뜻이다.

자동화가 실행 사이 시간에 계속 일하는 직원이 된다는 뜻은 아니다.

각 실행은 시작, Handoff 상태 확인, 허용된 생성 표면 갱신, 필요한 상태 보고, 종료 순서로 끝나야 한다.

## 첫 실행 검증

첫 예약 실행은 2026-05-27에 검증되었다.

관측된 생성 표면 갱신 시각:

```text
2026-05-27 14:27:03 +09:00
```

해당 실행은 생성 Handoff 상태 표면만 갱신했다.

- `Dashboard.md`
- `Queues/<Role>.md`
- `Violations/Open.md`

검증 후 Handoff 상태는 승인 대기 0건, ready work 0건, 정합성 문제 0건이었다.

cron 실행은 예약 실행마다 보이는 run/thread를 하나씩 만들 수 있다. 사용자는 일단 60분 ACTIVE 주기를 유지하기로 결정했다.

## 추천 자동화 프롬프트

반복 Supervisor 자동화에는 아래 프롬프트와 고정 출력 양식을 사용한다.

```text
Run the Handoff Supervisor for the PlayGround repository.

Command order:
1. Run tools\aiworkflow\handoff_supervisor.bat status.
2. Run tools\aiworkflow\handoff_supervisor.bat write-docs --execute.
3. Report the result using the fixed Markdown format in the next section.

Allowed actions:
- Run tools\aiworkflow\handoff_supervisor.bat status.
- Run tools\aiworkflow\handoff_supervisor.bat write-docs --execute.
- Summarize Handoff counts, Waiting User Approval items, Scope Status, Scope Drift Issues, and Consistency Issues.

Forbidden actions:
- Do not edit game source, gameplay JSON, assets, build settings, approval evidence, commits, or pushes.
- Do not run builds or tests.
- Do not mark work Done.
- Do not claim Packets.
- Do not wake or control other role chats.
- Do not add, remove, rename, or reorder sections in the report format.
```

## Supervisor 고정 출력 양식

반복 Supervisor 실행은 아래 Markdown 섹션 순서를 그대로 사용한다.

항목이 없으면 `None`이라고 쓴다.

```md
# PlayGround Handoff Supervisor Run

## Status
- Result: OK / WARNING / ERROR
- Generated At: <timestamp from supervisor output if available>
- Automation: playground-handoff-supervisor
- Workspace: C:\Users\kalux\workStation\play-ground

## Counts
- All Packets: <number>
- Active Packets: <number>
- Waiting Approval: <number>
- Ready Work: <number>
- In Progress: <number>
- Review Requested: <number>
- QA Requested: <number>
- Blocked: <number>
- Approved Scopes: <number>
- Missing Scopes: <number>
- Scope Drift Issues: <number>
- Consistency Issues: <number>

## Waiting User Approval
None

If items exist, replace `None` with a Markdown table:
| Handoff ID | Role | Title | Approval Request | Updated |
| --- | --- | --- | --- | --- |

## Consistency Issues
None

If items exist, replace `None` with a Markdown table:
| Severity | Handoff ID | Issue | Suggested Action |
| --- | --- | --- | --- |

## Scope Drift Issues
None

If items exist, replace `None` with a Markdown table:
| Severity | Handoff ID | Changed Files | Suggested Action |
| --- | --- | --- | --- |

## Generated Files
- Dashboard.md: refreshed / not refreshed
- Queues/*.md: refreshed / not refreshed
- Violations/Open.md: refreshed / not refreshed

## Forbidden Action Check
- Source edits: No
- Gameplay JSON edits: No
- Asset edits: No
- Build/test execution: No
- Approval evidence changes: No
- Packet claim changes: No
- Done/Archived changes: No
- Commit/push: No
- Role-chat wake/control: No

## Human Action Needed
None
```

자동화는 이 리포트 앞뒤에 별도 서술을 추가하지 않는다.

## 완료 기준

Phase 9A는 다음을 만족하면 완료다.

- 자동화 모드가 문서화됨
- 첫 안전 반복 범위가 문서화됨
- 금지 자동화 행동이 명시됨
- 첫 자동화 프롬프트를 검토할 수 있음

실제 역할 직원 자동화는 여전히 범위 밖이다.

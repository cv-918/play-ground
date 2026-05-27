# 역할 직원 자동화 실행 문서

## 목적

이 문서는 Phase 12B에서 생성한 낮은 위험 역할 직원 지원용 recurring automation을 기록한다.

이 문서는 자동화 범위 확장 권한이 아니다.

## 자동화

- automation id: `playground-handoff-role-worker-low-risk`
- 상태: PAUSED
- 주기: Handoff Supervisor와 맞춘 60분 간격
- 실행 환경: local workspace
- workspace: `C:\Users\kalux\workStation\play-ground`

## 모드

```text
문서-only 낮은 위험 run report 작성
```

이 자동화는 공용 사무 보조 성격의 worker다. Developer, QA, Planner, Artist, Reviewer를 대체하지 않는다.

Supervisor가 생성한 업무 표면을 읽고 자기 run report만 작성한다.

## 허용 읽기

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `_Docs/Handoff/Role_Workers/Role_Worker_Automation_Design.md`
- `_Docs/Handoff/Role_Workers/Low_Risk_Role_Work_Boundary.md`
- `_Docs/Handoff/Role_Workers/Role_Worker_Intake_Contract.md`
- `_Docs/Handoff/Role_Routines/*.md`
- `_Docs/Handoff/Packets/` 아래 관련 Packet manifest, 요청 문서, 결과 문서

## 허용 쓰기

아래 위치의 timestamp run report만 허용한다.

```text
_Docs/Handoff/Role_Workers/Automation/Runs/
```

사용 템플릿:

```text
_Docs/Handoff/Role_Workers/Automation/_Run_Report_Template.md
```

## 명시 보류

Packet Results 초안 작성은 보류한다.

이 자동화는 아래 경로에 쓰면 안 된다.

```text
_Docs/Handoff/Packets/<handoff-id>/Results/
```

나중에 사용자가 별도로 승인하기 전까지 이 범위는 열지 않는다.

## 금지 행동

자동화는 다음을 하면 안 된다.

- 게임 소스 수정
- gameplay JSON 수정
- asset 수정 또는 생성
- build 또는 test 실행
- runtime behavior 변경
- build setting 수정
- 생성 Supervisor 표면 수정
- `00_Index.md` 수정
- Packet manifest 수정
- Packet 상태 변경
- approval evidence 설정
- Packet claim
- `Done` 또는 `Archived` 처리
- commit
- push
- 역할 채팅 깨우기 또는 제어
- `_Temp/`, `_Local/`, `.env`, `node_modules/`, local config, secret, game source, gameplay JSON, asset, build output 읽기

## 실행 동작

나중에 활성화되면 각 실행은 다음만 수행한다.

1. 허용된 Handoff 표면을 읽는다.
2. 모든 역할 Queue를 훑는다.
3. 낮은 위험 문서-only 후보를 식별한다.
4. `WaitingUserApproval`, blocked, risky, 불명확 후보는 건너뛴다.
5. timestamp run report 하나를 작성한다.
6. Packet Results나 운영 상태를 수정하지 않고 멈춘다.

## 활성화 규칙

이 자동화는 PAUSED 상태로 생성되었다.

Phase 12C 또는 별도 사용자 승인이 있기 전까지 활성화하지 않는다.

## Phase 12B 완료 기준

Phase 12B는 다음 조건을 만족하면 완료다.

- 자동화가 존재한다.
- 상태가 PAUSED다.
- 주기가 Handoff Supervisor와 맞는다.
- prompt가 Packet Results 초안과 위험 행동을 금지한다.
- 이 runbook이 생성 경계를 기록한다.
- 첫 실행 검증을 완료했다고 주장하지 않는다.

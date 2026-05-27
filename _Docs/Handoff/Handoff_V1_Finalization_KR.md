# Handoff System v1 최종 정리

## 목적

이 문서는 AI Role Handoff System v1의 Phase 16을 닫는다.

여기서 고정하는 것은 다음이다.

```text
v1에 포함되는 것,
v1에 포함되지 않는 것,
평소 어떻게 쓰는지,
어떻게 유지보수하는지,
무엇을 v2로 미루는지.
```

Phase 16은 새 자동화 권한을 추가하지 않는다.

## 최종 판정

Handoff System v1은 기존 AIWorkflow 위에 얹는 문서 기반 운영 계층으로 완료되었다.

다음 용도로 사용한다.

- 역할 간 업무 전달
- 공용 Packet 저장
- 보이는 작업 Queue
- 승인 대기 표시
- Supervisor 생성 상태 표면
- 문서-only 운영 점검

다음으로 취급하지 않는다.

- 완전 자율 역할 채팅 제어 시스템
- 구현 실행자
- 자동 승인 시스템
- 자동 commit/push 시스템

## v1 최종 범위

v1에 포함되는 것:

- `_Docs/Handoff/Packets/`
- `manifest.yaml` 기반 Packet 상태
- 기획, 구현, 리뷰, QA, 결과, 완료 문서
- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`
- `tools/aiworkflow/handoff_supervisor.bat`
- Supervisor 반복 자동화
- 역할별 루틴 문서
- Role Worker intake 및 harness 문서
- 낮은 위험 Role Worker 자동화 설계
- PAUSED 상태의 낮은 위험 Role Worker 자동화
- 승인 대기 흐름
- 승인 요청서 검사
- 운영 체크리스트
- v1 운영 준비 감사

## v1 범위 밖

v1은 다음을 포함하지 않는다.

- 역할 채팅 자동 깨우기
- 역할 채팅 자동 제어
- 자율 소스 코드 구현
- 자율 gameplay JSON 또는 schema 수정
- 자율 runtime behavior 변경
- 자율 asset 생성 또는 교체
- approval evidence 자동 작성
- Packet 자동 claim
- 자동 `Done` 또는 `Archived` 판단
- 자동 build/test 완료 게이트
- 자동 commit 또는 push

이 항목들은 모두 향후 작업이며, 별도 승인이 필요하다.

## 평소 사용할 요청 문장

일상 운영에서는 이런 식으로 요청한다.

```text
현재 Handoff 상태 확인해줘.
```

기대 동작:

- Supervisor status 실행
- Dashboard, 승인 대기, consistency issue 요약

```text
Developer Queue 확인해줘.
```

기대 동작:

- `_Docs/Handoff/Queues/Developer.md` 확인
- Ready Work, Waiting User Approval, blocked 항목 요약

```text
현재 승인 대기 목록 설명해줘.
```

기대 동작:

- 승인 대기 항목 나열
- 각 승인 요청이 실제로 무엇을 바꾸는지 설명
- 승인, 거절, 범위 수정 선택지 제시

```text
이 기획을 Handoff Packet으로 만들어줘.
```

기대 동작:

- 범위가 정해진 Packet 생성
- manifest와 역할 요청 문서 작성
- 기획 승인을 구현 승인으로 취급하지 않음

```text
Handoff 정합성 문제 확인해줘.
```

기대 동작:

- `Violations/Open.md` 확인
- 각 문제와 안전한 문서-only 수정 경로 설명

## 유지보수 정책

Handoff workflow 문서를 추가하거나 바꿀 때:

- `_Docs/Handoff/00_Index.md`를 갱신한다.
- 사용자 운영 방식이 바뀌면 한국어 HTML 가이드를 갱신한다.
- 의미 있는 프로세스 변경이면 WorkLog를 작성한다.
- `tools\aiworkflow\handoff_supervisor.bat status`를 실행한다.
- 수정한 파일에 대해 `git diff --check`를 실행한다.

자동화 동작을 바꿀 때:

- 관련 automation runbook을 갱신한다.
- `Handoff_Operations_Checklist.md`를 갱신한다.
- v1 계약이 바뀌면 `Handoff_V1_Finalization.md`도 갱신한다.
- 자동화 상태 변경을 WorkLog에 기록한다.

Handoff가 아니라 AIWorkflow 동작을 바꿀 때:

- `AGENTS.md`를 따른다.
- `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` 갱신 필요 여부를 확인한다.
- AIWorkflow 규칙 변경을 Handoff 문서 안에 숨기지 않는다.

## 생성 표면 정책

Supervisor 생성 표면은 timestamp만 바뀔 수 있다.

- `_Docs/Handoff/Dashboard.md`
- `_Docs/Handoff/Queues/*.md`
- `_Docs/Handoff/Violations/Open.md`

timestamp-only diff는 별도 커밋하지 않아도 된다.

다음이 바뀌면 생성 표면을 커밋한다.

- count
- 승인 대기 항목
- Ready Work
- violation
- Packet index 상태
- 의미 있는 Handoff 상태 변경에 포함된 생성 표면

## v2 후보

아래는 v1 약속이 아니라 향후 v2 후보이다.

- v2의 첫 운영 원칙으로 범위 기반 실행 승인을 채택한다. 승인된 Packet, DeveloperPlan, work order 또는 이에 준하는 실행 범위 안의 일반적인 소스 코드 수정과 스키마 변경이 아닌 데이터 수정은 파일별로 다시 승인받지 않는다.
- 낮은 위험 Role Worker 자동화를 `PAUSED`에서 `ACTIVE`로 전환
- 더 엄격한 승인 경계 안에서 Role Worker가 Packet Results 초안 작성
- 단일 자동화가 부족해질 때만 역할별 자동화 분리
- 결과 문서에 대한 review/QA lint 강화
- Handoff Packet 생성 helper 추가
- 오래 방치된 Packet 감지 강화
- v1/v2 운영 Dashboard 생성
- 경계 검토 후 AIWorkflow task state와 더 강하게 연결

v2 항목은 구현 전에 모두 별도 승인이 필요하다.

범위 기반 실행 승인 원칙은 `Handoff_V2_Scope_Based_Execution_Principle_KR.md`에 기록한다.

## v1 완료 기준

v1은 다음을 만족하면 완료다.

- v1 최종 범위가 문서화됨
- v1 범위 밖이 문서화됨
- 일상 요청 문장이 문서화됨
- 유지보수 정책이 문서화됨
- 생성 표면 정책이 문서화됨
- v2 후보가 기록됨
- Handoff guide와 index가 최종 정리 문서를 연결함

## 최종 메모

Handoff v1은 이제 동작하는 운영 계층이다. 하지만 사람의 판단이나 AIWorkflow 안전 규칙을 대체하지 않는다.

안정적인 일상 흐름은 다음이다.

```text
Planner 논의
-> Packet
-> Dashboard / Queue 표시
-> 필요 시 승인
-> 역할 결과
-> 리뷰 / QA 증거
-> 완료 노티
-> 사람의 commit/push 판단
```

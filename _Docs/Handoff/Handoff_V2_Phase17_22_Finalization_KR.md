# Handoff v2 Phase 17-22 마감

## 목적

이 문서는 Handoff v2의 첫 번째 구현 묶음인 Phase 17부터 Phase 22를 닫는다.

Handoff v2 전체를 끝냈다는 뜻은 아니다. 이번 묶음에서 닫는 것은 다음 범위다.

```text
범위 기반 실행 승인
-> Supervisor의 승인 범위 표시
-> Developer 루틴 전환
-> 실제 구현 파일럿
-> 운영 기준 고정
```

## 최종 판정

Handoff v2 Phase 17-22는 완료됐다.

이 묶음에서 확정된 운영 기준은 다음이다.

```text
구현은 소스코드 수정 여부가 아니라 승인된 범위 이탈 여부를 기준으로 멈춘다.
```

Handoff Packet, DeveloperPlan, work order 또는 그에 준하는 작업 계약에 승인된 실행 범위가 있으면 Developer 역할은 그 범위 안에서 일반적인 소스 코드 수정과 스키마 변경이 아닌 데이터 수정을 진행할 수 있다.

소스코드를 수정해야 한다는 이유만으로 다시 승인 대기하지 않는다.

다시 멈추는 경우는 작업이 승인된 범위를 벗어나거나 별도 보호 대상 변경이 필요할 때다.

## 완료된 범위

Phase 17-22에 포함된 내용:

- Packet manifest의 `approved_execution_scope`
- `approved_scope_allowed_paths`
- `approved_scope_forbidden_paths`
- `approved_scope_non_goals`
- `approved_scope_validation`
- Dashboard와 역할 Queue의 Scope Status 표시
- Supervisor의 승인 범위 누락 감지
- Supervisor의 Git 변경 파일 기반 scope drift 검사
- Developer 루틴을 파일별 코드 수정 승인 방식에서 범위 기반 실행 방식으로 전환
- Role Worker 문서에서 승인 범위 작업과 low-risk 자동화를 분리
- 실제 게임 소스 수정이 포함된 Phase 21 파일럿
- Phase 22에서 첫 v2 운영 묶음 마감

## Phase 21 파일럿 결과

Phase 21 파일럿은 `어트리뷰트 트리 렌더 영역 제한`이었다.

이 파일럿은 v2에서 의도한 흐름을 검증했다.

```text
사용자가 실행 범위 승인
-> Packet에 approved_execution_scope 기록
-> Developer가 승인된 경로 안에서 소스 수정
-> Supervisor가 scope drift와 consistency 검사
-> 빌드 검증
-> 사용자가 결과 확인
-> Packet 종료
-> 사람이 승인한 커밋
```

이 파일럿에서는 C++ 파일을 수정한다는 이유만으로 두 번째 승인을 요구하지 않았다.

중요한 승인 경계는 다음이었다.

```text
승인된 어트리뷰트 트리 렌더 범위 안에 머무르는가
```

아래 기준이 아니다.

```text
C++ 파일을 수정하니 다시 승인받아야 하는가
```

## 최종 운영 규칙

1. 기획 승인과 실행 범위 승인은 다르다.
2. 승인된 실행 범위 안의 소스코드 수정은 Developer의 정상 업무다.
3. 구현이 승인 범위를 벗어나거나 별도 보호 대상 변경이 필요할 때만 멈춘다.
4. Supervisor의 scope drift는 검토 신호이지 자동 롤백, 검증 실패, 완료 판정, 승인 판정이 아니다.
5. 관측된 운영 문제를 해결하지 않는 표면은 추가하지 않는다.

다음 변경은 여전히 별도 승인이 필요하다.

- 승인 범위 밖 파일, 시스템, 동작 변경
- JSON schema 변경
- save/load 동작 변경
- migration 또는 영구 데이터 의미 변경
- 범위 밖 actor, scene, UI lifecycle 변경
- 범위 밖 구조적 리팩터링
- build setting 변경
- workflow rule 변경
- 승인되지 않은 commit, push, release, deployment

## 이번 묶음에 포함되지 않는 것

Phase 17-22에는 다음이 포함되지 않는다.

- 자율 Developer 구현 자동화
- 역할 채팅 자동 깨우기
- 역할 채팅 자동 제어
- 역할별 worker 분리
- 자동 Packet 생성 도우미
- 자동 approval evidence 작성
- 실행 Packet 밖의 자동 Done 처리
- 자동 commit 또는 push
- 자동 build/test 완료 게이트
- 에셋 생성 자동화
- JSON schema 자동화
- save/load 자동화
- 승인된 Handoff v2 문서 밖의 workflow rule 자동화

이 항목들은 향후 작업이며 별도 승인이 필요하다.

## 기존 자동화와의 관계

현재 존재하는 자동화:

- Handoff Supervisor 자동화는 승인된 범위 안에서 Dashboard, Queues, Violations를 갱신할 수 있다.
- Low-risk Role Worker 자동화는 제한적인 보고 중심 형태로 존재한다.

현재 존재하지 않는 자동화:

- Developer worker가 Queue에서 일감을 수거해 자율적으로 소스코드를 수정하는 자동화
- 역할 채팅 자동 오케스트레이션
- 자동 commit 또는 push

## 향후 v2 후보

다음은 이후 묶음에서 검토할 수 있다.

- 좁은 승인 후 low-risk Role Worker 자동화 활성화 또는 확장
- 강한 경계 안에서 Role Worker가 Packet Result 초안 작성
- Packet 생성 도우미
- 오래 방치된 Packet 감지
- 리뷰 또는 QA 결과 문서 lint
- 단일 Worker로 부족하다는 증거가 있을 때만 역할별 Worker 분리
- 승인 범위 안의 제한적 구현 자동화 별도 검토

향후 작업은 다음 기준으로 판단한다.

```text
사용자의 오케스트레이션 부담을 줄이면서 유지보수 비용을 과하게 늘리지 않는가?
```

## 유지보수 정책

범위 기반 실행 계약을 바꿀 때:

- 이 문서를 갱신한다.
- `Handoff_V2_Scope_Based_Execution_Principle.md`를 갱신한다.
- manifest 필드가 바뀌면 `Handoff_Packet_Spec.md`와 한국어 지원 문서를 갱신한다.
- Supervisor 상태나 drift 검사가 바뀌면 Supervisor 문서를 갱신한다.
- WorkLog를 작성한다.
- `tools\aiworkflow\handoff_supervisor.bat status`를 실행한다.
- `git diff --check`를 실행한다.

향후 Role Worker 자동화를 추가할 때:

- 먼저 자동화 권한을 정확히 정의한다.
- 명시 승인 전에는 source edit, JSON schema edit, save/load edit, build setting edit, commit, push를 자동화 범위에 넣지 않는다.
- 역할별 자동화 분리는 필요하다는 증거가 생기기 전까지 피하고, 작은 단일 자동화를 우선한다.

## 최종 메모

Handoff v2 Phase 17-22는 Handoff를 문서 전달 시스템에서 범위 기반 실행 시스템으로 한 단계 확장했다.

일상 흐름은 다음과 같다.

```text
의미 있는 작업 범위를 승인한다
-> 역할은 그 범위 안에서 실행한다
-> Supervisor는 범위 이탈 신호를 잡는다
-> 리뷰, 검증, QA를 거친다
-> 사람이 의도적으로 커밋한다
```

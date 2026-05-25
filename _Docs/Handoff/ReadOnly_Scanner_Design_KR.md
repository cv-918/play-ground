# 읽기 전용 Handoff 스캐너 설계

## 목적

읽기 전용 Handoff 스캐너는 AI Role Handoff System을 변경 없이 확인하기 위한 향후 보조 동작이다.

답해야 하는 질문은 다음과 같다.

- 현재 어떤 Handoff 작업이 있는가?
- 내 역할에게 온 작업은 무엇인가?
- 사용자 승인을 기다리는 작업은 무엇인가?
- 막힌 작업은 무엇인가?
- 최근 완료된 작업은 무엇인가?
- manifest나 색인에 누락 또는 불일치가 있는가?

Phase 5의 스캐너는 의도적으로 읽기 전용이다.

## Phase 5 경계

Phase 5는 스캐너 동작과 보고 형식만 정의한다.

Phase 5에서는 다음을 구현하지 않는다.

- 스케줄 자동화
- 백그라운드 감시자
- 파일 수정
- Packet claim
- 상태 갱신
- 승인 기록
- 소스 코드, JSON, 에셋, 런타임, 빌드, 커밋, 푸시 실행

파일을 쓰거나 상태를 바꾸는 동작은 이후 Phase에 속한다.

## 입력

스캐너가 읽을 수 있는 대상은 다음이다.

- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Handoff_System_Principles.md`
- `_Docs/Handoff/Handoff_Packet_Spec.md`
- `_Docs/Handoff/Role_Routines/`
- `_Docs/Handoff/Packets/**/manifest.yaml`
- `manifest.yaml`이 참조하는 Packet 문서
- Packet의 `Results/` 문서
- manifest가 연결한 `_DevLog/WorkLog/` 문서

스캐너는 관련 없는 소스 코드, 게임플레이 데이터, 로컬 설정, 임시 런타임 산출물, 비밀 정보, 외부 서비스를 읽지 않는다.

## 출력

스캐너는 채팅 또는 명시적으로 승인된 표시 위치에 보고서를 출력한다.

Phase 5에서는 저장소 파일을 만들거나 수정하지 않는다.

보고 형식은 `_Docs/Handoff/Scanner/_Scan_Report_Template_KR.md`를 기준으로 한다.

## 스캔 모드

### 전체 큐 스캔

모든 active Packet과 active handoff를 나열한다.

### 역할별 큐 스캔

역할 기준으로 작업을 필터링한다.

- Planner
- Developer
- Artist
- Reviewer
- QA

### 승인 대기 스캔

다음 상태의 Packet을 찾는다.

```yaml
execution_status: WaitingUserApproval
```

또는 `_Docs/Handoff/00_Index.md`의 `Waiting User Approval`에 등록된 항목을 찾는다.

### 막힘 스캔

다음 상태의 Packet을 찾는다.

```yaml
delivery_status: Blocked
```

또는:

```yaml
execution_status: Blocked
```

### 신규 작업 스캔

다음 상태의 Packet을 찾는다.

```yaml
delivery_status: Ready
execution_status: NotStarted
```

또는 아직 claim되지 않은 Packet을 찾는다.

### 정합성 스캔

manifest와 index의 불일치, 누락 필드를 보고한다.

예:

- Packet 폴더는 있지만 `00_Index.md`에 없다.
- index가 없는 manifest를 가리킨다.
- manifest가 없는 문서를 참조한다.
- `approval_required: true`인데 `approval_request_path`가 비어 있다.
- `execution_status: WaitingUserApproval`인데 `Waiting User Approval` 섹션에 없다.
- `delivery_status: Done`인데 `CompletionNotice.md`가 없다.

## 보고서 섹션

스캐너 보고서에는 다음을 포함한다.

- 스캔 시각
- 스캔 모드
- 역할 필터
- 사용자 승인 대기
- 준비된 작업
- 진행 중 작업
- 막힌 작업
- 리뷰 요청
- QA 요청
- 최근 완료
- 정합성 문제
- 사용자 다음 행동 제안

## 심각도

정합성 문제는 다음 기준으로 표시한다.

- `Critical`: 안전한 상태 판단이 불가능하거나 필요한 승인이 숨겨진 상태
- `Major`: 작업은 가능할 수 있지만 핵심 라우팅 또는 승인 정보가 빠진 상태
- `Minor`: 사용은 가능하지만 메타데이터가 불완전한 상태
- `Info`: 즉시 조치가 필요하지 않은 참고 사항

## 필수 안전 규칙

스캐너는 반드시 다음을 지킨다.

- 읽기만 한다.
- Packet을 claim하지 않는다.
- `delivery_status` 또는 `execution_status`를 바꾸지 않는다.
- 승인을 기록하지 않는다.
- 작업을 완료 처리하지 않는다.
- DevLog를 만들지 않는다.
- 스캔 동작의 일부로 빌드, 테스트, 도구, 스크립트, Git 명령을 실행하지 않는다.
- manifest, index, 연결된 workflow 문서, 보이는 대화에 기록되지 않은 승인은 존재한다고 추론하지 않는다.

## 사용자 요청 예시

```text
현재 Handoff 승인 대기 목록 확인해줘.
```

```text
Developer 역할에게 온 새 Packet만 확인해줘.
```

```text
Handoff Packet 정합성만 읽기 전용으로 점검해줘.
```

## Phase 6로 넘길 것

Phase 6에서는 문서/상태 갱신 동작을 정의할 수 있다. 하지만 Phase 5가 그 권한을 부여하지는 않는다.

스캐너 보고서는 갱신을 제안할 수 있지만 직접 적용하지 않는다.

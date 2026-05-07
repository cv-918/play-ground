# WF Discord UX Spec

## 목적

사용자는 Discord만으로 작업을 지시, 감시, 수정, 승인, 완료 판단할 수 있어야 한다.

완성 단계에서 사용자는 Codex 프롬프트를 직접 보거나 복사하지 않는다. Discord는 단순 입력창이 아니라 WF 하네스의 단일 작업 콘솔이다.

## 사용자 액션

사용자가 직접 수행하는 액션은 다음으로 제한한다.

```text
- 자연어 목표 입력
- 계획 승인
- 진행 상태 확인
- 진행 중 수정 요청
- 보류
- 중단
- 재시도
- 최종 승인
- 반려
- 후속작업 생성
- 자동 승인 정책 조정
```

## 작업 지시 UX

### 사용자 입력

```text
다이얼로그 선택지 UI v1 작업 접수해줘.
선택지는 최대 3개까지만 지원하고 기존 스킵 정책은 건드리지 마.
```

### 하네스 응답

```text
작업 접수됨: WF-061 Dialogue choice UI v1

분류: code / dialogue system
위험도: L3
승인 필요: 계획 승인
예상 실행기: Codex CLI
예상 검증: build + diff + architecture gate

[승인] [수정 요청] [보류] [상세 보기]
```

## 계획 승인 UX

### 승인

```text
[승인]
```

### 수정 요청

```text
[수정 요청]
→ DialogueSession 상태 변경은 최소화하고 DialogueWindow 표시부터 처리해.
```

### 하네스 응답

```text
수정 요청 반영됨.
작업 범위가 v1 UI 표시 중심으로 축소되었습니다.

상태: 실행 준비 중
실행기: Codex CLI
```

## 작업 목록 UX

### 명령

```text
/tasks
```

### 응답

```text
현재 작업 현황

실행 중: 3
승인 대기: 1
검증 중: 1
완료 대기: 1

1. WF-061 Dialogue choice UI v1
   상태: running / Codex CLI / 18분
   최근 활동: DialogueWindow.cpp 수정
   [상세] [중단] [보류]

2. WF-062 Town NPC conditional spawn rule
   상태: approval_waiting / L4
   필요 액션: 계획 승인
   [승인] [수정 요청] [상세]
```

## 단일 작업 상세 UX

### 명령

```text
/task WF-061
```

### 응답

```text
WF-061 Dialogue choice UI v1

상태: running
실행기: Codex CLI
경과: 18분
현재 단계: implementation
최근 heartbeat: 42초 전

최근 활동:
- DialogueLineData.h 확인
- DialogueWindow.cpp 수정
- 선택지 표시 경로 분석

변경 감지:
- DialogueWindow.h
- DialogueWindow.cpp
- DialogueSession.cpp

검증:
- 빌드: 아직 실행 전
- diff gate: 대기
- architecture gate: 대기

[로그] [Diff 미리보기] [수정 요청] [보류] [중단]
```

## 진행 중 수정 요청 UX

### 사용자 입력

```text
DialogueSession 변경이 커지면 중단하고 v1 범위를 줄여.
```

### 하네스 응답

```text
수정 요청 해석됨

대상: WF-061
제어 유형: 조건부 범위 축소
감시 대상: DialogueSession
조건: 변경량 증가 감지
동작: 보류 후 재계획

[적용] [수정] [취소]
```

## 장시간 실행 알림 UX

### 정상 장시간 실행

```text
장시간 실행 중: WF-061 Dialogue choice UI v1

경과: 45분
최근 heartbeat: 1분 전
최근 활동: 입력 처리 경로 분석
상태: 정상 실행 중

조치 필요 없음.

[상세] [로그] [Diff 미리보기] [보류] [중단]
```

### 멈춤 가능성

```text
주의: WF-061 작업이 12분 동안 활동이 없습니다.

최근 활동: Codex CLI 응답 대기
상태: idle 가능성

권장 액션:
- 상세 확인
- 재시도
- 중단 후 재계획

[상세] [재시도] [중단] [보류]
```

## 작업 완료 UX

### 검토 필요 완료

```text
검토 필요: WF-061 Dialogue choice UI v1

상태: 결과 승인 대기
실행기: Codex CLI
소요 시간: 51분
위험도: L3 / Risk 38

변경 요약:
- 선택지 데이터 구조 추가
- DialogueWindow 선택지 표시 추가
- 입력 처리 v1 연결
- 관련 문서 갱신

검증:
- 빌드: 성공
- Diff Gate: 통과
- Architecture Gate: 주의 1개
- Documentation Gate: 통과

판단 필요:
- DialogueSession 변경 범위가 v1 기준에 맞는지 확인 필요

[승인] [수정 요청] [반려] [Diff] [로그] [후속작업 생성]
```

### 자동 완료

```text
자동 완료: WF-063 Discord command description Korean localization

위험도: L1
실행기: Local CLI
검증: 통과
변경 파일: 2개
상태 반영: 완료

[상세] [Diff] [완료 기록]
```

### 실패

```text
실패: WF-061 Dialogue choice UI v1

실패 단계: compile gate

원인 요약:
- DialogueWindow.cpp 함수 선언 누락
- DialogueSession 인터페이스와 호출부 불일치

권장 액션:
- Codex CLI로 재시도
- 범위 축소 후 재계획
- 수동 검토 전환

[재시도] [수정 요청] [보류] [중단] [로그]
```

## UX 원칙

1. 모바일에서 읽기 쉬운 Task Card 중심으로 제공한다.
2. 긴 설명은 상세, Diff, 로그 버튼 뒤로 분리한다.
3. 승인, 수정 요청, 보류, 중단, 재시도는 버튼 또는 모달로 처리한다.
4. 자연어 수정 요청은 바로 실행하지 않고 구조화된 RuntimeControlIntent로 변환한다.
5. 승인/반려/수정 요청은 모두 감사 로그에 남긴다.

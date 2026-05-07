# WF Runtime Execution Spec

## 목적

PC Runner는 Discord 지시를 받아 작업을 자동 실행하고, 여러 실행 세션을 동시에 감시해야 한다.

완성 단계에서 사용자는 Codex CLI/App, Copilot, Local CLI에 직접 프롬프트를 붙여넣지 않는다. PC Runner가 실행기를 선택하고, 세션을 생성하고, 진행 상황을 수집한다.

## 실행기 후보

| 실행기 | 역할 |
|---|---|
| Codex CLI | 기본 자동 코드 작업 실행기 |
| Codex App | 자동 제어 경로가 확보될 경우 병렬 작업/리뷰 표면으로 사용 |
| Copilot Agent | IDE 기반 작업 자동화 후보 |
| Local CLI | 빌드, 테스트, 로그 분석, 문서 갱신 실행 |
| OpenClaw / Hermes | 외부 에이전트 런타임 후보 |
| Browser-use / Playwright | 브라우저 자동화 후보 |
| Manual Escalation | 자동 실행 실패 또는 고위험 예외 처리 |

## 실행 라우팅 원칙

1. WF Orchestrator가 실행 경로를 결정한다.
2. Codex, Copilot, OpenClaw, Hermes는 실행 후보이지 의사결정권자가 아니다.
3. 실행 전 승인 정책과 권한 정책을 통과해야 한다.
4. 실행 결과는 반드시 Result Collector를 통해 수집한다.
5. Manual Escalation은 정상 경로가 아니라 예외 경로다.

## Task Queue 상태

```text
queued
planning
approval_waiting
starting
running
idle
blocked
verifying
result_review_waiting
auto_completed
completed_with_warning
failed
cancelled
finalized
```

## Task Workspace Manager

작업별 workspace 또는 git worktree를 사용해 실행을 격리한다.

```text
_worktrees/
├─ wf-061-dialogue-choice-ui
├─ wf-062-town-npc-spawn-rule
└─ wf-063-discord-command-localization
```

목적:

```text
- 병렬 작업 충돌 방지
- 작업별 diff 추적
- 실패 작업 복구
- 중간 snapshot 저장
- 승인 전 main 작업공간 보호
```

## Session Supervisor 책임

```text
- task_id와 session_id 매핑
- 실행기 종류 기록
- 시작 시간 기록
- 마지막 heartbeat 기록
- 최근 활동 기록
- 로그 수집
- 파일 변경 감지
- diff snapshot 생성
- 종료 코드 수집
- idle / blocked / failed 상태 분류
```

## Multi-session Scheduler

여러 작업이 동시에 실행될 수 있으므로 다음을 관리한다.

```text
- 동시 실행 수 제한
- 실행기별 queue 관리
- 고위험 작업의 병렬 실행 제한
- 동일 파일/영역 충돌 감지
- 우선순위 조정
- 장시간 실행 알림
```

## Progress Collection

진행도는 숫자 퍼센트보다 상태 기반으로 제공한다.

수집 신호:

```text
- executor log
- stdout / stderr
- 파일 변경 감지
- git diff 변화
- build/test 실행 여부
- executor summary
- heartbeat timestamp
- tool call event
```

표시 항목:

```text
- 현재 상태
- 현재 단계
- 최근 활동
- 변경 파일
- 마지막 heartbeat
- 경과 시간
- 막힘 여부
- 필요한 사용자 액션
```

## Runtime Control

사용자는 Discord에서 자연어로 실행 중 작업을 제어할 수 있다.

가능한 제어:

```text
- 중단
- 보류
- 재시도
- 범위 축소
- 실행기 변경
- 자동 승인 비활성화
- 특정 파일 변경 시 중단 조건 추가
```

자연어 제어는 바로 실행하지 않고 `RuntimeControlIntent`로 구조화한 뒤 적용한다.

## Runtime Control 처리 방식

### Live Injection

실행 중인 세션에 추가 지시를 주입한다.

사용 조건:

```text
- 실행기가 세션 입력을 받을 수 있음
- 변경 방향이 아직 크게 틀어지지 않음
- 추가 제약만으로 제어 가능
```

### Pause + Replan

실행을 보류하고 현재 diff를 저장한 뒤 재계획한다.

사용 조건:

```text
- 범위가 커졌음
- 위험도가 상승했음
- 사용자 수정 요청이 구조 변경을 요구함
```

### Stop + Restart

세션을 중단하고 수정된 goal_request로 다시 실행한다.

사용 조건:

```text
- 방향이 크게 틀어졌음
- 실패가 반복됨
- 현재 결과를 폐기하는 편이 안전함
```

## Manual Escalation 조건

```text
- Codex CLI 실행 실패
- 로그인/session 만료
- 빌드 환경 깨짐
- 승인 정책상 자동 실행 금지
- 파일 충돌
- 위험도 L5 이상
- 외부 툴 조작 필요
```

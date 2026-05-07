# WF Codex Review Adjustment

## 목적

Codex Web 검토 결과를 기준으로 WF 최종 설계 문서에 반영할 보정 사항을 정리한다.

유지해야 할 원칙:

```text
- Discord-only 사용자 인터페이스
- PC Runner 중심 실행
- 사용자 수동 프롬프트 붙여넣기 금지
- 결정 / 실행 / 상태 분리
```

## Codex Web 검토 결과 핵심

현재 저장소는 Discord 기반 WF 운영 보조 도구 단계까지는 구축되어 있다.

이미 존재하는 축:

```text
- Discord slash command 기반 orchestration
- intake/task/prepare/result command군
- Backlog / ActiveTask 상태 관리
- goal_request 생성
- result audit 보조 기능
```

아직 부족한 축:

```text
- PC Runner 주도 자동 실행
- Autonomous Execution Router
- Session Supervisor
- Task Workspace / Worktree 격리
- 자동 verification gate
- Approval / Risk / Permission / Control 정책 엔진
- Completion Card / FinalizationLog 자동화
```

## 확정 보정 결정

### 1. Manual Codex 실행은 현재 상태일 뿐, 최종형이 아니다

```text
현재:
prepare goal 생성 → (레거시/예외) Manual Escalation으로만 Codex 수동 실행

최종:
Discord goal → PC Runner → 실행기 자동 선택 → Codex CLI/Local CLI 자동 실행
```

Migration 원칙:

```text
prepare goal 기능은 폐기하지 않는다.
최종형에서는 내부 ExecutionRequest 생성기로 흡수한다.
```

### 2. 기존 Task State와 Runtime State는 병행한다

```text
Task Lifecycle State:
- 작업의 업무적 상태
- Backlog / ActiveTask / ProjectStatus와 연결

Execution Run State:
- 특정 실행 세션의 런타임 상태
- SessionState / heartbeat / executor / log / diff와 연결
```

둘은 `task_id`로 연결한다.

### 3. 실행기 1차 범위는 Codex CLI + Local CLI로 고정한다

```text
- Codex CLI Execution Adapter
- Local CLI Execution Adapter
```

Codex App / Copilot / OpenClaw / Hermes는 adapter slot만 남기고 후순위로 둔다.

### 4. 권한 정책은 단계적으로 전환한다

```text
- default deny 유지
- allowlist 기반 허용
- worktree 격리 필수
- L0~L2는 정책 조건을 만족할 때 자동 실행/자동 승인 후보가 될 수 있다.
- L3는 명시 승인 후 허용
- L4 이상은 인간 승인 필수
- commit은 최종 단계에서도 별도 승인 필요
```

### 5. Phase 2에서는 evidence collection을 먼저 고정한다

```text
Evidence Collector:
- exit code
- stdout/stderr
- log artifact
- changed files
- git diff
- build result
- test result
```

그 다음 Verification Gate가 이 증거를 해석한다.

### 6. Phase 2는 내부 순서를 재조정한다

```text
1. TaskRunState / SessionState / ProgressEventLog
2. Task Workspace Manager
3. Session Supervisor
4. Evidence Collector
5. Codex CLI Execution Adapter
6. Local CLI Execution Adapter
7. Runtime Control
```

### 7. 자동 승인은 L0~L2 조건부 후보부터 시작한다

초기 자동 승인 범위:

```text
L0: read-only / status
L1: docs / state
L2: data / config low-risk
```

L3 localized code 자동 승인은 충분한 성공 사례, 안정적인 build/diff/architecture gate, rollback 이력 부재가 확인된 뒤 허용한다.

## 사용자 승인 질문에 대한 권장 결정

```text
정책 전환:
- Codex/build 실행 금지는 worktree 격리 + allowlist + 승인 레벨 기준으로 제한 해제한다.

상태 모델:
- 기존 Task State는 유지하고 Runtime State를 별도 추가한다.

실행기 우선순위:
- 1차 실행기는 Codex CLI + Local CLI로 고정한다.

자동 승인:
- L0~L2는 정책 조건을 만족할 때만 자동 승인 후보가 될 수 있다.
- L3는 초기에는 인간 승인 또는 조건부 승인으로 둔다.

검증 게이트:
- Phase 2에서는 compile/diff evidence를 수집한다.
- 최종 gate 판정과 completion 정책은 Phase 3에서 완성한다.
```

# WF V4 Consistency Fix Summary

## 목적

Codex Web의 v3 정합성 검토 결과에서 나온 Needs Fix 항목을 반영한 v4 보정 요약이다.

## 해결한 항목

### 1. Phase 2 순서 충돌 해결

`WF_User_Action_Guide_To_Final_Completion.md`와 `WF_Implementation_Roadmap.md`의 Phase 2 순서를 다음으로 통일했다.

```text
TaskRunState / SessionState / ProgressEventLog
→ Task Workspace Manager
→ Session Supervisor
→ Evidence Collector
→ Codex CLI Execution Adapter
→ Local CLI Execution Adapter
→ Runtime Control
```

### 2. L2 자동 승인 표현 보정

L2는 무조건 자동 승인이 아니라 조건부 자동 승인 후보로 정의했다.

### 3. 현재 시점 문구 보정

현재 다음 행동은 다음이다.

```text
v4 문서 정합성 확정
→ WF-201 Define execution state model(실행 상태 모델 정의) 시작
```

### 4. Manual Codex 실행 예외 정책 추가

Manual Codex 실행은 정상 경로가 아니라 Manual Escalation으로만 허용한다.

### 5. 실행기 확장 진입 조건 추가

Codex App / Copilot Agent / OpenClaw / Hermes의 2차 allowlist 진입 조건을 명시했다.

### 6. Phase 2 / Phase 3 검증 경계 명확화

```text
Phase 2:
증거 수집

Phase 3:
증거 판정 및 완료 처리
```

## 남은 구현 시작점

첫 구현 작업은 다음으로 고정한다.

```text
WF-201 Define execution state model(실행 상태 모델 정의)
```

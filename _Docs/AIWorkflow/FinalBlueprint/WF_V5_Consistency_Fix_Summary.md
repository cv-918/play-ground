# WF V5 Consistency Fix Summary

## 목적

Codex Web의 v4 정합성 검토에서 나온 Needs Fix 항목을 반영한 v5 보정 요약이다.

## 해결한 항목

### 1. User Action Guide Phase 2 순서 충돌 해결

`WF_User_Action_Guide_To_Final_Completion.md`를 전체 재작성하여 Phase 2 순서를 다음으로 고정했다.

```text
TaskRunState / SessionState / ProgressEventLog
→ Task Workspace Manager
→ Session Supervisor
→ Evidence Collector
→ Codex CLI Execution Adapter
→ Local CLI Execution Adapter
→ Runtime Control Adapter
→ pause / stop / retry / replan controls
```

이제 `WF_Implementation_Roadmap.md`, `WF_Runtime_Execution_Spec.md`, `WF_Codex_Review_Adjustment.md`와 충돌하지 않는다.

### 2. L0~L2 자동 승인 표현 통일

문서 전반의 표현을 다음 기준으로 통일했다.

```text
L0~L2는 정책 조건을 만족할 때 자동 실행/자동 승인 후보가 될 수 있다.
L2는 조건부 가능이며 무조건 자동 승인하지 않는다.
```

### 3. 현재 시점 행동 보정

User Action Guide는 더 이상 “Codex Web 설계 검토가 다음 행동”이라고 말하지 않는다.

v5 기준 다음 행동:

```text
v5 문서 반영
→ 필요 시 v5 정합성 검토
→ WF-201 Define execution state model(실행 상태 모델 정의) 시작
```

### 4. Manual Codex 실행 예외 정책 고정

Manual Codex 실행은 최종형 정상 경로가 아니라 `Manual Escalation`으로만 허용한다.

### 5. 실행기 확장 진입 조건 고정

Codex App / Copilot Agent / OpenClaw / Hermes는 evidence 수집, 세션 추적, runtime control, WF 정책 준수 조건을 만족할 때만 2차 실행 후보로 승격한다.

## 첫 구현 작업

v5 기준 첫 구현 작업은 다음으로 고정한다.

```text
WF-201 Define execution state model(실행 상태 모델 정의)
```

# WF V6 Consistency Fix Summary

## 목적

Codex Web이 v5 정합성 검토에서 찾은 남은 표현 충돌 2개를 수정한 v6 보정 요약이다.

## 수정 항목

### 1. L0~L2 자동 실행/자동 승인 표현 보정

수정 전:

```text
- L0~L2는 정책 조건을 만족할 때 자동 실행/자동 승인 후보가 될 수 있다.
```

수정 후:

```text
- L0~L2는 정책 조건을 만족할 때 자동 실행/자동 승인 후보가 될 수 있다.
```

의도:

```text
L0~L2를 무조건 자동 실행/자동 승인하는 것이 아니라,
정책 조건과 gate를 만족할 때만 후보로 인정한다.
```

### 2. prepare goal 수동 Codex 실행 표현 보정

수정 전:

```text
prepare goal 생성 → (레거시/예외) Manual Escalation으로만 Codex 수동 실행
```

수정 후:

```text
prepare goal 생성 → (레거시/예외) Manual Escalation으로만 Codex 수동 실행
```

의도:

```text
수동 Codex 실행은 최종형 정상 경로가 아니라,
레거시 또는 장애 상황의 Manual Escalation으로만 허용한다.
```

## v6 기준

v6 기준 첫 구현 작업은 그대로 유지한다.

```text
WF-201 Define execution state model(실행 상태 모델 정의)
```

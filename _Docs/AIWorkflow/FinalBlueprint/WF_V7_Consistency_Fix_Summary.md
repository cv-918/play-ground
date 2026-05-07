# WF V7 Consistency Fix Summary

## 목적

Codex Web의 v6 정합성 검토에서 남은 표현 충돌을 수정한 v7 보정 요약이다.

## 수정 항목

### 1. prepare goal 수동 Codex 실행 잔여 문구 제거

수정 전:

```text
prepare goal 생성 → 사용자가 Codex 수동 실행
```

수정 후:

```text
prepare goal 생성 → (레거시/예외) Manual Escalation으로만 Codex 수동 실행
```

### 2. L0~L2 자동 승인 후보 표현 정규화

수정 전 예시:

```text
L0~L2는 정책 조건을 만족할 때만 자동 승인 후보한다.
```

수정 후:

```text
L0~L2는 정책 조건을 만족할 때만 자동 승인 후보가 될 수 있다.
```

또는 실행/승인을 함께 말할 때:

```text
L0~L2는 정책 조건을 만족할 때 자동 실행/자동 승인 후보가 될 수 있다.
```

## 검증

v7 생성 시 아래 잔여 문자열을 검색했다.

```text
prepare goal 생성 → 사용자가 Codex 수동 실행
후보한다
L0~L2부터 실행 허용
```

위 문자열은 v7 문서 세트에서 제거되어야 한다.

## 첫 구현 작업

v7 기준 첫 구현 작업은 그대로 유지한다.

```text
WF-201 Define execution state model(실행 상태 모델 정의)
```

# M004 Dash Visual Checklist

Status: Manual runtime checklist
Date: 2026-06-10
Purpose: 집에서 게임을 직접 실행할 때 M004 돌진 phase별 실제 visual을 확인하기 위한 체크리스트.
Related records:
- `_Docs/AIWorkflow/Studio/ResultReviews/2026-06-10_enemy_animation_context_map.md`
- `_Docs/AIWorkflow/Studio/ResultReviews/2026-06-10_m004_m005_animation_resource_check.md`

## Context

현재 read-only 분석 기준으로 확인된 내용:

```text
M004 - 돌체
ability_flags_ = 3 = ContactAttack + Dash
ProjectileAttack 없음
attack_motion_duration_ = 0.0

dash_charge_duration_ = 1.5
dash_duration_ = 0.5
dash_recovery_duration_ = 1.25
```

코드상 강한 추정:

```text
Charging phase: 별도 sprite animation request 없음. move fallback + charge particle 가능성.
Dashing phase: attack clip animation request 있음.
Recovery phase: 별도 sprite animation request 없음. move fallback 또는 정지 sprite 가능성.
```

따라서 실제 화면에서 “돌진 준비 → 돌진 → 후딜/그로기”가 의도대로 읽히는지 확인이 필요하다.

## Manual Check Target

게임 실행 후 M004가 등장하는 상황에서 M004의 dash 동작을 관찰한다.

가능하면 다음을 함께 기록한다:

```text
Stage / scene:
Enemy observed:
Approximate time:
Screen recording available: yes / no
Screenshot available: yes / no
```

## Checklist

### 1. Charge phase — 돌진 전 1.5초

확인할 것:

- [ ] M004가 돌진 전 멈추는 시간이 보이는가?
- [ ] sprite가 move처럼 보이는가?
- [ ] 별도 charge particle/effect가 보이는가?
- [ ] 플레이어 입장에서 “돌진 준비”로 읽히는가?
- [ ] 그로기/경직/무방비 상태처럼 보이는가?

관찰 메모:

```text

```

판정:

```text
charge visual: good / acceptable / unclear / poor
```

### 2. Dashing phase — 실제 돌진 0.5초

확인할 것:

- [ ] 돌진 중 attack animation이 보이는가?
- [ ] attack animation이 너무 짧거나 거의 안 보이지는 않는가?
- [ ] 이동 속도와 animation이 어색하게 따로 놀지 않는가?
- [ ] 돌진 방향 전환/flip이 자연스러운가?

관찰 메모:

```text

```

판정:

```text
dash attack visual: good / acceptable / unclear / poor
```

### 3. Recovery phase — 돌진 후 1.25초

확인할 것:

- [ ] 돌진 후 recovery 시간이 보이는가?
- [ ] sprite가 move처럼 보이는가?
- [ ] 멈춰 있는 상태로 보이는가?
- [ ] 그로기/경직/후딜 상태처럼 읽히는가?
- [ ] 별도 effect가 있는가?
- [ ] 플레이어가 “지금 공격 기회다”라고 이해할 수 있는가?

관찰 메모:

```text

```

판정:

```text
recovery visual: good / acceptable / unclear / poor
```

### 4. Overall readability

확인할 것:

- [ ] 전체 흐름이 “돌진 준비 → 돌진 → 후딜/그로기”로 읽히는가?
- [ ] charge와 recovery가 서로 구분되는가?
- [ ] 플레이어 입장에서 위험 구간과 안전 구간이 구분되는가?
- [ ] 수정 없이 유지해도 될 정도인가?

관찰 메모:

```text

```

전체 판정:

```text
M004 dash visual: good / acceptable / needs improvement / unclear
```

## Decision Guide

관찰 후 다음 중 하나로 판단한다.

### A. 수정 없음

선택 조건:

```text
charge/dash/recovery가 화면에서 충분히 읽힌다.
```

다음 액션:

```text
No code/data/asset change needed.
```

### B. Charge visual 개선 필요

선택 조건:

```text
돌진 준비가 잘 안 보인다.
```

후보:

```text
charge particle 강화
charge phase animation request 추가
별도 charge clip 추가
```

주의:

```text
particle/code/data/asset 변경은 별도 승인 필요.
```

### C. Dashing attack visual 개선 필요

선택 조건:

```text
돌진 중 attack animation이 너무 짧거나 안 보인다.
```

후보:

```text
dash_duration 조정
attack animation duration mapping 조정
DashAbility animation request 조정
```

주의:

```text
runtime behavior/data 변경은 별도 승인 필요.
```

### D. Recovery visual 개선 필요

선택 조건:

```text
돌진 후 후딜/그로기 시간이 그냥 move sprite처럼 보이거나 의도가 안 읽힌다.
```

후보:

```text
Recovery phase에서 hit clip 사용
Recovery phase에서 attack 마지막 프레임 유지
Recovery 전용 clip 추가
Recovery particle/effect 추가
```

주의:

```text
code/data/asset 변경은 별도 승인 필요.
```

## Minimal Report Back

집에서 확인 후 아래 정도만 알려줘도 다음 분석/수정 scope를 잡을 수 있다.

```text
charge: 괜찮음 / 안 보임 / 애매함
dash attack: 보임 / 안 보임 / 너무 짧음 / 애매함
recovery: 그로기처럼 보임 / 그냥 move 같음 / 안 보임 / 애매함
overall: 유지 가능 / 개선 필요 / 판단 보류
추가 메모:
```

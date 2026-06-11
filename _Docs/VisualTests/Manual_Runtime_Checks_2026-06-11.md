# Manual Runtime Checks - Pending Home Playtest

Date: 2026-06-11
Status: pending manual runtime observation
Context: 사용자가 회사에 있어 지금은 게임을 직접 실행해 확인할 수 없음. 집에서 플레이 가능한 시간에 아래 항목들을 확인한다.

## Why this exists

자동 smoke validation은 다음을 확인했다.

```text
PASS contact attack anchor
PASS projectile attack anchor
PASS bullet and player projectile anchor
PASS dust and reward anchor
PASS result and restart anchor
PASS run result semantics
PASS JSON smoke
```

하지만 실제 화면/조작감/전환 체감은 자동 검증으로 확정할 수 없다. 따라서 VisualTests 쪽에 집에서 확인할 pending checklist를 같이 남긴다.

## Pending check groups

### 1. VAL-001C - Combat / reward / collection / restart manual smoke

Primary checklist:

```text
_Docs/Validation/VAL-001C_Manual_Runtime_Playtest_Checklist.md
```

집에서 확인할 핵심:

```text
- 게임 런칭
- contact enemy hit feedback
- projectile attack visibility / hit
- player projectile visibility / hit
- enemy kill reward state
- dust spawn
- dust collection readability
- result screen end reason / reward values
- player death result
- stage progress input / hold
- restart or next in-game transition
- exit to OutGame flow
```

Minimal report back:

```text
VAL-001C startup: PASS / FAIL / BLOCKED
contact hit: good / acceptable / poor / unclear
projectile: visible / unclear / not visible
dust: spawns+collects / partial / not working / unclear
result screen: readable / wrong values / unclear
restart/exit: works / broken / unclear
notes:
```

### 2. M004 dash / groggy visual check

Primary checklist:

```text
_Docs/AIWorkflow/Studio/ResultReviews/2026-06-10_m004_dash_visual_checklist.md
```

Reason:

```text
M004 dash_charge_duration_ = 1.5
M004 dash_duration_ = 0.5
M004 dash_recovery_duration_ = 1.25
```

Read-only analysis suggested:

```text
Charging phase: likely move fallback + possible charge particle
Dashing phase: attack animation request
Recovery phase: likely move fallback / stopped sprite, unless another visual path appears at runtime
```

The user's memory: charge/recovery time may have been intended to show a groggy-like state.

집에서 확인할 핵심:

```text
- charge 1.5s가 돌진 준비로 읽히는가?
- charge particle/effect가 보이는가?
- dashing 0.5s 동안 attack animation이 보이는가?
- recovery 1.25s가 그로기/후딜처럼 보이는가?
- recovery가 그냥 move sprite처럼 보여 의도가 안 읽히는가?
```

Minimal report back:

```text
charge: 괜찮음 / 안 보임 / 애매함
dash attack: 보임 / 안 보임 / 너무 짧음 / 애매함
recovery: 그로기처럼 보임 / 그냥 move 같음 / 안 보임 / 애매함
overall: 유지 가능 / 개선 필요 / 판단 보류
notes:
```

## If blocked

If no runnable executable/build path is available at home, mark as:

```text
BLOCKED - launch/build path unavailable
```

Then create a follow-up for build/run instructions instead of changing gameplay code.

## Scope boundary

These are observation tasks only.

Do not change:

```text
- gameplay source
- gameplay JSON
- animation assets
- save/load data
- build settings
```

until manual observations are recorded and the user approves a follow-up fix scope.

# 전투 반응 시스템 정리 및 운영 가이드

## 문서 목적

이번 작업에서 하드코딩되어 있던 넉백과 카메라 셰이크를 `HitContext` 기반의 공통 반응 시스템으로 정리했다.  
이 문서는 다음 내용을 한 번에 확인할 수 있도록 작성한다.

- 이번 작업에서 실제로 바뀐 구조
- 현재 구현 상태에 대한 리뷰
- 다음 단계 확장 방향
- 기획 및 밸런싱을 위한 수치 조절 기준

v1 범위는 `HitContext`를 거치는 전투 반응 경로만 포함한다.

- 플레이어 평타
- 적 접촉 공격
- 적 돌진 공격
- 적 투사체 공격

`GetDamage()`를 직접 호출하는 일부 스킬 경로는 아직 이번 체계로 이관하지 않았다.

---

## 핵심 방향

### 1. 넉백과 셰이크를 공통 컨텍스트로 통합

기존에는 공격 소스가 각자 넉백 세기나 카메라 셰이크를 직접 하드코딩하는 구조가 섞여 있었다.  
이번에는 공격 측이 `HitContext.reaction_`에 반응 프로필을 채우고, 피격 측이 이를 해석해 넉백과 셰이크를 공통 규칙으로 적용하도록 정리했다.

즉, 공격은 "어떤 반응을 유발하는가"를 정의하고, 피격자는 "그 반응을 어떻게 적용하는가"를 담당한다.

### 2. 단위를 분리

- 넉백은 `world px` 기준 거리로 계산한다.
- 카메라 셰이크는 `normalized intensity`를 해상도에 맞는 `screen px`로 변환한다.

이렇게 분리한 이유는 둘의 성격이 다르기 때문이다.

- 넉백은 실제 게임 월드 안에서의 이동량이므로 해상도와 독립적이어야 한다.
- 카메라 셰이크는 화면 연출이므로 해상도별로 체감이 비슷하도록 보정이 필요하다.

### 3. 기획자가 다루기 쉬운 넉백 파라미터로 변경

기존 `direction + power` 방식은 실제 체감과의 연결이 약했다.  
이번에는 아래처럼 직접 해석 가능한 값으로 옮겼다.

- `direction`
- `distanceWorldPx`
- `durationSec`
- `curve`

이제 기획자는 "얼마나 멀리 밀리는지", "얼마나 오래 밀리는지", "처음 강하고 끝이 부드러운지"를 직접 설정할 수 있다.

---

## 이번 작업에서 바뀐 구조

### 1. 공통 반응 타입 추가

신규 파일 `Project/Gameplay/Common/HitReaction.h`를 추가했다.

주요 구성:

- `KnockbackCurve`
- `HitReactionProfile`
- `ResolvedHitReaction`
- `ResolveHitReaction()`
- `EvaluateKnockbackCurve()`

`HitReactionProfile`은 공격이 의도하는 기본 반응값을 담는다.

- `base_impact_`
- `knockback_distance_world_px_`
- `knockback_duration_sec_`
- `knockback_curve_`
- `camera_shake_scale_`

`ResolvedHitReaction`은 실제 전투 상황을 반영해 최종 계산된 값이다.

### 2. `HitContext`에 반응 정보 추가

`Project/Gameplay/Common/HitContext.h`에 `reaction_`을 추가했다.

이제 공격 소스는 더 이상 직접 `damage * 0.5` 같은 식으로 넉백을 계산하지 않고, `reaction_`만 설정하면 된다.

### 3. `Movement`를 거리/시간 기반 넉백으로 변경

`Project/Gameplay/Components/Movement`에 신규 인터페이스를 추가했다.

- `StartKnockback(direction, distanceWorldPx, durationSec, curve)`
- `ClearKnockback()`

기존 `ApplyKnockback(direction, power)`는 레거시 래퍼로만 유지한다.  
내부적으로는 새 거리/시간 기반 넉백으로 변환해서 동작한다.

또한 약한 넉백이 강한 넉백을 중간에 끊지 않도록, 새 넉백의 남은 총 이동량이 현재 넉백보다 강할 때만 교체되도록 처리했다.

### 4. `CameraManager`를 trauma 기반 셰이크로 변경

`Project/EngineSystems/Render/CameraManager`에 아래 요소를 추가했다.

- `AddTrauma(normalizedAmount)`
- `min_shake_px_at_design_`
- `max_shake_px_at_design_`
- `trauma_decay_per_sec_`

기존 `Shake(intensity, duration)`는 호환용 래퍼로 남겨 두었고, 내부적으로는 trauma에 누적되도록 연결했다.

### 5. 피격 반응 적용 책임을 `UnitBase`로 이동

`Project/Gameplay/Actors/Stage/UnitBase`에 `ApplyHitReaction()`을 추가했다.

이 함수는 아래 역할을 담당한다.

- 최근 실제 피해량 기록값 사용
- `ResolveHitReaction()` 호출
- 이동 컴포넌트에 넉백 적용
- 카메라 매니저에 trauma 누적

즉, 플레이어든 적이든 공통 규칙으로 반응이 처리된다.

### 6. 공격 소스별 데이터 입력 경로 정리

아래 경로들이 새 프로필 체계를 사용하도록 변경되었다.

- 플레이어 평타
- 적 접촉 공격
- 적 돌진 공격
- 적 투사체 공격

적 데이터는 `EnemyJsonInfo`에 공격 타입별 반응 필드를 추가해 설정할 수 있도록 바뀌었다.

- `contact_*`
- `dash_*`
- `projectile_*`

예시 필드:

- `*_impact_`
- `*_knockback_distance_world_px_`
- `*_knockback_duration_sec_`
- `*_knockback_curve_`
- `*_camera_shake_scale_`

---

## 핵심 계산 규칙

### 1. 전투 상황 점수

```txt
damageRatio = clamp(finalDamage / max(1, victimMaxHp), 0, 1)

impactScore = clamp(
  0.50 * baseImpact +
  0.25 * sqrt(damageRatio) +
  0.15 * (isDashAttack ? 1 : 0) +
  0.10 * (isFatalHit ? 1 : 0),
0, 1)
```

의도:

- 기본 공격 성격은 `baseImpact`가 결정한다.
- 피해 비율이 큰 공격일수록 체감 반응이 커진다.
- 돌진 공격은 추가 가중치를 받는다.
- 마무리 일격은 추가 가중치를 받는다.

### 2. 넉백 계산

```txt
resolvedDistance =
  baseDistanceWorldPx * lerp(0.85, 1.35, impactScore) / targetKnockbackResistance

resolvedDuration =
  baseDurationSec * lerp(0.95, 1.10, impactScore)

p = elapsed / resolvedDuration
frameDelta = direction * resolvedDistance * (E(p_now) - E(p_prev))

default curve:
E(p) = 1 - (1 - p)^3
```

의도:

- 반응이 강할수록 넉백 거리는 눈에 띄게 커진다.
- 반응이 강할수록 넉백 시간도 약간 늘어난다.
- 곡선 기반 누적 이동량을 사용하므로 프레임레이트와 무관하게 총 이동량이 목표 거리로 수렴한다.

### 3. 카메라 셰이크 계산

```txt
resolutionScale = min(windowWidth / designWidth, windowHeight / designHeight)

traumaGain = lerp(0.18, 0.75, impactScore)
           * cameraShakeScale
           * (victimIsPlayer ? 1.25 : 1.0)

trauma = clamp(trauma + traumaGain, 0, 1)

displayShakePx =
  (trauma < 0.08) ? 0 :
  lerp(minShakePxAtDesign, maxShakePxAtDesign, trauma * trauma) * resolutionScale

trauma = max(0, trauma - traumaDecayPerSec * dt)
```

기본값:

- 최소 셰이크: design 해상도 기준 `1px`
- 최대 셰이크: design 해상도 기준 `8px`

의도:

- 작은 피격은 거의 흔들리지 않거나 매우 약하게만 보인다.
- 연속 피격은 trauma가 누적되어 더 강한 셰이크가 된다.
- 시간이 지나면 자연스럽게 복구된다.
- 해상도에 따라 절대 px 값은 달라도 화면 대비 체감은 유사하게 유지된다.

---

## 코드 위치 안내

핵심 변경 파일:

- `Project/Gameplay/Common/HitReaction.h`
- `Project/Gameplay/Common/HitContext.h`
- `Project/Gameplay/Components/Movement.h`
- `Project/Gameplay/Components/Movement.cpp`
- `Project/EngineSystems/Render/CameraManager.h`
- `Project/EngineSystems/Render/CameraManager.cpp`
- `Project/Gameplay/Actors/Stage/UnitBase.h`
- `Project/Gameplay/Actors/Stage/UnitBase.cpp`
- `Project/Gameplay/Actors/Stage/StagePlayer.cpp`
- `Project/Gameplay/Actors/Stage/Enemy.cpp`
- `Project/Gameplay/Actors/Stage/EnemyTypes.h`
- `Project/Gameplay/Actors/Stage/ContactAttackAbility.cpp`
- `Project/Gameplay/Actors/Stage/DashAbility.cpp`
- `Project/Gameplay/Actors/Stage/ProjectileAttackAbility.cpp`
- `Project/Gameplay/Actors/Projectile/Bullet.h`
- `Project/Gameplay/Actors/Projectile/Bullet.cpp`
- `Project/Gameplay/GamePlaySystems/ObjectManager.h`
- `Project/Gameplay/GamePlaySystems/ObjectManager.cpp`
- `Project/Gameplay/Scenes/InGameScene.h`
- `Project/Gameplay/Scenes/InGameScene.cpp`
- `Data/Enemy.json`

이 중 실제 운영에서 가장 자주 보게 될 위치는 아래와 같다.

- 새 공식과 타입 확인: `HitReaction.h`
- 넉백 체감 확인: `Movement.cpp`
- 카메라 셰이크 체감 확인: `CameraManager.cpp`
- 플레이어 평타 세팅: `StagePlayer.cpp`
- 적 반응 데이터 세팅: `Data/Enemy.json`

---

## 리뷰 결과

현재 구현 기준으로 즉시 수정이 필요한 치명적 문제는 확인하지 못했다.  
구조상 방향성도 의도와 잘 맞고, 하드코딩 제거 목적도 대부분 달성된 상태다.

다만 아래 항목은 운영상 인지하고 가는 것이 좋다.

### 1. 런타임 플레이 테스트는 아직 미실시

코드 빌드는 성공했지만, 실제 플레이 중 체감과 예외 상황은 아직 검증하지 못했다.

특히 아래는 런타임에서 꼭 확인이 필요하다.

- 연속 피격 시 셰이크 누적 체감
- 강한 넉백 도중 약한 넉백 무시 로직
- 벽 근처, 이동 중, 피격 중첩 상황에서의 넉백 자연스러움
- 적별 데이터 편차가 실제로 의도한 위계로 느껴지는지

### 2. `GetDamage()` 직접 호출 경로는 아직 미이관

이번 v1 범위는 `HitContext`를 쓰는 공격만 포함한다.  
즉, 일부 스킬이나 특수 처리 경로는 여전히 공통 반응 체계 바깥에 있을 수 있다.

### 3. 레거시 호환 코드가 남아 있다

아래 인터페이스는 기존 호출부와의 호환을 위해 남겨 두었다.

- `Movement::ApplyKnockback(direction, power)`
- `CameraManager::Shake(intensity, duration)`
- 일부 legacy `knockback_power_` 필드

현재는 내부적으로 새 시스템에 연결되지만, 장기적으로는 완전 제거 대상이다.

### 4. 저항 수치 확장은 아직 기본값 단계

`targetKnockbackResistance`는 현재 사실상 `1.0` 기준으로 운용된다.  
향후 스탯이나 상태이상과 연결할 여지가 있으나, 아직 데이터 설계는 시작 단계다.

---

## 향후 확장 가이드

### 1. 넉백 저항 스탯 확장

다음 단계로 가장 자연스러운 확장은 `targetKnockbackResistance`의 실제 스탯화다.

권장 방향:

- 기본값 `1.0`
- 경량 적: `0.9` 전후
- 중량 적: `1.1 ~ 1.3`
- 보스/슈퍼아머 상태: `1.5+`

주의할 점:

- 너무 크게 잡으면 넉백이 거의 사라져 피드백이 죽는다.
- 거리만 줄일지, duration에도 일부 반영할지는 후속 정책으로 분리하는 편이 좋다.

### 2. 공격 타입 프리셋 운영

데이터를 완전히 개별값으로만 관리하면 적 종류가 늘수록 튜닝 비용이 커진다.  
중간 단계로 "경량 타격", "중량 타격", "돌진", "폭발", "약한 투사체" 같은 프리셋을 두는 것이 좋다.

추천 운영 방식:

- 공통 프리셋 정의
- 개별 적은 프리셋 값을 베이스로 사용
- 특수한 적만 일부 값만 오버라이드

### 3. 플레이어 스킬 데이터로 반응 프로필 승격

현재 플레이어 평타는 코드 상수 기반 기본 프로필이다.  
향후에는 플레이어 무기, 스킬, 강화 단계가 직접 `HitReactionProfile`을 가지도록 올리는 것이 좋다.

이렇게 하면 다음이 쉬워진다.

- 무기 타입별 손맛 차별화
- 차지 공격/강공격 전용 반응
- 강화에 따른 넉백 및 셰이크 성장

### 4. 직접 피해 경로 이관

이번 범위에서 제외된 `GetDamage()` 직호출 스킬 경로도 같은 체계로 이관하는 것이 좋다.

권장 순서:

1. 직피해 경로 목록 정리
2. 각 경로에 `HitContext` 또는 그에 준하는 반응 정보 추가
3. `UnitBase::ApplyHitReaction()` 재사용
4. 레거시 직결 셰이크/넉백 호출 제거

### 5. 디버그 표시 도구 추가

튜닝 효율을 높이려면 아래 값을 실시간으로 보는 도구가 매우 유용하다.

- `impactScore`
- `resolvedDistance`
- `resolvedDuration`
- `traumaGain`
- 현재 `trauma`
- 현재 무시된 넉백 여부

추천 형태:

- 디버그 HUD
- 로그 토글
- 피격 이벤트 히스토리

### 6. 상태이상과의 연동

이후에는 단순 타격 외에도 상태에 따라 반응을 바꿀 수 있다.

예시:

- 빙결 상태: 넉백 거리 감소, duration 증가
- 감전 상태: 셰이크 증가, 넉백 유지
- 슈퍼아머 상태: 셰이크는 유지하되 넉백만 약화

이런 확장은 `ResolveHitReaction()` 단계에서 가장 자연스럽게 흡수할 수 있다.

---

## 수치 조절 가이드

### 1. 값별 역할

### `base_impact_`

공격의 기본적인 "묵직함"을 나타낸다.  
넉백 거리, 셰이크 gain, 상황 점수에 모두 영향을 준다.

올리면:

- 같은 피해량이어도 더 강한 공격처럼 느껴진다.
- 돌진/강공격의 존재감이 빠르게 커진다.

내리면:

- 피해는 있어도 반응은 가벼운 공격이 된다.

### `knockback_distance_world_px_`

실제 월드에서 얼마나 멀리 밀리는지 결정한다.

올리면:

- 물리적으로 강하게 밀리는 느낌이 커진다.
- 몬스터와 플레이어의 위치 변화가 분명해진다.

주의:

- 너무 크면 전투 템포가 늘어지고, 적이 자주 화면 밖으로 밀릴 수 있다.

### `knockback_duration_sec_`

얼마나 오래 밀리는지를 결정한다.

올리면:

- 더 무겁고 끌려가는 느낌이 난다.
- 같은 거리라도 느리고 둔하게 느껴진다.

내리면:

- 짧고 날카로운 타격감이 난다.

핵심 해석:

- `distance`를 올리면 더 멀리 간다.
- `duration`을 올리면 같은 거리라도 더 천천히 간다.

### `knockback_curve_`

넉백 속도 분포를 결정한다.

권장 해석:

- `Linear`: 일정하게 밀림
- `OutQuad`: 초반 강하고 후반 완만
- `OutCubic`: 초반이 더 강하고 후반이 부드럽게 마무리
- `OutExpo`: 시작이 매우 강하고 체감이 과격함

기본 추천:

- 일반적인 액션 타격감은 `OutCubic`
- 매우 강한 돌진이나 폭발은 `OutExpo`도 후보

### `camera_shake_scale_`

기본 셰이크 gain에 곱해지는 배율이다.

올리면:

- 시각적 충격감이 빠르게 커진다.
- 연속 피격 시 trauma 누적 체감이 더 강해진다.

주의:

- 넉백보다 셰이크만 과하게 올리면 맞는 느낌은 큰데 실제 물리 반응은 약한, 어색한 분리가 생길 수 있다.

### 2. 추천 시작 범위

### 플레이어 평타 / 가벼운 근접

- `baseImpact`: `0.25 ~ 0.40`
- `distance`: `20 ~ 40`
- `duration`: `0.08 ~ 0.12`
- `cameraShakeScale`: `0.7 ~ 1.0`
- 기본 curve 추천: `OutCubic`

### 강공격 / 돌진 / 헤비 히트

- `baseImpact`: `0.60 ~ 0.85`
- `distance`: `80 ~ 140`
- `duration`: `0.16 ~ 0.24`
- `cameraShakeScale`: `1.1 ~ 1.4`
- 기본 curve 추천: `OutCubic` 또는 `OutExpo`

### 약한 투사체

- `baseImpact`: `0.20 ~ 0.35`
- `distance`: `20 ~ 35`
- `duration`: `0.10 ~ 0.16`
- `cameraShakeScale`: `0.8 ~ 1.0`
- 기본 curve 추천: `OutCubic`

### 3. 튜닝 순서 추천

한 번에 여러 값을 크게 건드리면 원인을 파악하기 어렵다.  
아래 순서를 추천한다.

1. 먼저 `distance`로 물리적 밀림 크기를 맞춘다.
2. 그 다음 `duration`으로 빠르기와 무게감을 조정한다.
3. 이후 `baseImpact`로 상황 점수 상승폭을 맞춘다.
4. 마지막으로 `cameraShakeScale`로 화면 연출 강도를 맞춘다.

이 순서를 쓰면 "이 공격은 실제로 얼마나 밀려야 하는가"와 "얼마나 요란하게 보여야 하는가"를 분리해서 잡기 쉽다.

### 4. 해상도 관련 해석

넉백은 `world px`이므로 해상도와 무관하게 같은 공격이면 같은 거리만큼 밀려야 한다.  
반면 카메라 셰이크는 `screen px`이므로 해상도 보정이 반드시 필요하다.

정리하면:

- 넉백은 해상도 독립
- 셰이크는 해상도 보정 적용

즉, "픽셀 단위를 썼다"는 사실만으로 해상도 대응이 깨지는 것은 아니다.  
중요한 것은 그 픽셀이 월드 기준인지, 화면 기준인지 구분해서 쓰는 것이다.

---

## 기본 세팅값 메모

현재 기본 세팅은 아래와 같이 시작해 두었다.

### 플레이어 평타

- `baseImpact = 0.35`
- `distance = 36`
- `duration = 0.10`
- `curve = OutCubic`
- `shakeScale = 1.00`

### 적 접촉 공격 기본 예시

- `impact = 0.30`
- `distance = 24`
- `duration = 0.12`
- `curve = OutCubic`
- `shakeScale = 0.85`

### 적 돌진 공격 기본 예시

- `impact = 0.75`
- `distance = 120`
- `duration = 0.20`
- `curve = OutCubic`
- `shakeScale = 1.25`

### 적 투사체 공격 기본 예시

- `impact = 0.25`
- `distance = 28`
- `duration = 0.14`
- `curve = OutCubic`
- `shakeScale = 0.90`

---

## 검증 현황

현재까지 확인된 항목:

- `Debug | x86` 기준 솔루션 빌드 성공
- 컴파일 에러 없음
- 경고는 존재하지만 대부분 기존 코드 및 형변환 관련 경고

아직 미확인 항목:

- 실제 런타임 플레이 테스트
- 해상도별 체감 비교 테스트
- 프레임레이트 변화에 따른 넉백 누적 이동량 실측
- 연속 피격 누적 셰이크 체감 검증

---

## 다음 작업 추천

우선순위 기준으로는 아래 순서를 권장한다.

1. 실제 플레이 테스트로 체감 검증
2. `Enemy.json` 수치 1차 밸런싱
3. 직접 피해 스킬 경로 이관
4. 넉백 저항 스탯화
5. 디버그 HUD 또는 로그 도구 추가

이 문서를 기준으로 운영하면, 구현 담당은 공통 규칙을 유지하고 기획 담당은 데이터 중심으로 반응 강도를 조정할 수 있다.

# Hit Flash 공통화 작업 리뷰 및 확장 가이드

## 문서 목적
이번 작업에서 `Enemy`에만 있던 피격 시 흰색 반짝임 연출을 `StagePlayer`에도 동일하게 적용했고, 동시에 유닛 공통 기능으로 정리했다.  
이 문서는 다음 내용을 빠르게 다시 파악하기 위한 용도다.

- 이번 변경의 핵심 구조와 리뷰 포인트
- 추후 다른 유닛이나 연출로 확장할 때의 권장 방향
- 현재 수치를 어떻게 읽고 조절하면 되는지에 대한 가이드

---

## 작업 리뷰

## 변경 목표
- `Enemy`의 피격 반짝임을 `StagePlayer`에도 같은 감각으로 적용
- 단순 복붙 대신 유닛 공통 로직으로 정리
- 플레이어의 좌우 반전(`flip_sprite_x_`)은 유지
- 기존 데미지 UI, 넉백, 사망 처리 흐름은 건드리지 않음

## 실제 적용 구조

### 1. `UnitBase`로 피격 flash 상태를 공통화
다음 책임을 `UnitBase`가 갖도록 정리했다.

- 피격 flash 타이머 보관
- 피격 시 flash 시작
- 프레임별 flash 타이머 감소
- 현재 flash가 활성 상태인지 판별
- 현재 프레임에 그릴 flash 강도 계산

관련 파일:

- `Project/Gameplay/Actors/Stage/UnitBase.h`
- `Project/Gameplay/Actors/Stage/UnitBase.cpp`

추가된 공통 API:

- `StartHitFlash()`
- `UpdateHitFlash(_double delta_time)`
- `IsHitFlashing() const`
- `GetHitFlashStrength() const`

의미:

- 유닛은 "피격 시 반짝일지"만 결정하면 됨
- 실제 시간 관리와 강도 계산은 공통 헬퍼가 맡음

### 2. `DrawFunctions`에 flip 지원 white flash 경로 추가
기존 `DrawTextureWhiteFlash(...)`는 일반 sprite draw에는 충분했지만, `StagePlayer`처럼 `flip_x`가 필요한 경우를 직접 지원하지 않았다.  
이번에 flip 지원 오버로드를 추가해서, 플레이어도 적과 같은 flash 렌더 경로를 쓰되 방향만 유지할 수 있게 했다.

관련 파일:

- `Project/Core/Base/DrawFunctions.h`
- `Project/Core/Base/DrawFunctions.cpp`

추가된 인터페이스:

- `DrawTextureWhiteFlash(texture, dest_rect, source_rect, flip_x, flip_y, flash, alpha)`

### 3. `Enemy`는 공통 helper를 사용하도록 리팩터링
기존 enemy 전용 타이머와 강도 계산 코드를 제거하고, `UnitBase`의 공통 helper를 쓰도록 바꿨다.

관련 파일:

- `Project/Gameplay/Actors/Stage/Enemy.h`
- `Project/Gameplay/Actors/Stage/Enemy.cpp`

바뀐 점:

- enemy 전용 `hit_flash_timer_` 제거
- `GetDamage()`에서 `StartHitFlash()` 호출
- `Update()`에서 `UpdateHitFlash()` 호출
- `_DrawObjectShape()`는 `GetHitFlashStrength()` 결과만 사용
- `_UpdateOnHit()`는 `IsHitFlashing()` 기준으로 복귀 판단

### 4. `StagePlayer`에도 동일한 flash 흐름 연결
플레이어는 기존에 flash 개념이 없었고, sprite draw 시 좌우 반전만 처리하고 있었다.  
이번 변경으로 적과 같은 타이밍의 반짝임을 사용하면서도 `flip_sprite_x_`가 유지되도록 정리했다.

관련 파일:

- `Project/Gameplay/Actors/Stage/StagePlayer.cpp`

바뀐 점:

- `GetDamage()`에서 `StartHitFlash()` 호출
- `Update()`에서 `UpdateHitFlash()` 호출
- `_DrawObjectShape()`에서 flash 활성 시 flip-aware white flash 사용

---

## 빠른 리뷰 포인트

### 잘 된 점
- 반짝임의 시간/강도 계산이 한 곳으로 모여서 유지보수가 쉬워졌다.
- `Enemy`와 `StagePlayer`가 실제로 같은 연출 규칙을 쓴다.
- 플레이어 sprite 방향 반전이 flash 중에도 깨지지 않는다.
- 빌드 기준으로 오버로드 충돌 없이 정상 통과했다.

### 현재 구조의 장점
- 새 유닛이 생겨도 `UnitBase` 기반이면 적은 수정으로 같은 hit flash를 붙일 수 있다.
- 렌더링 능력은 `DrawFunctions`, 발동 규칙은 유닛 쪽이라는 역할 분리가 비교적 명확하다.
- 연출 수치 변경 시 enemy/player를 각각 따로 만질 필요가 없다.

### 현재 구조의 한계
- flash 수치는 아직 전 유닛 공통값이다.
- 색상은 흰색 flash 하나로 고정되어 있다.
- sprite를 쓰지 않는 기본 도형 렌더링에는 별도 flash 표현이 없다.
- hit flash는 공통화됐지만, 넉백/쉐이크/무적 프레임 같은 다른 피격 반응까지 묶인 구조는 아니다.

---

## 향후 확장 가이드

## 1. 유닛별 개성 차이가 필요해질 때
지금 구조는 "전부 같은 반짝임"에 최적화돼 있다.  
보스, 엘리트, 플레이어, 소환수처럼 연출 감도를 다르게 하고 싶어지면 다음 순서로 확장하는 것이 좋다.

권장 순서:

1. `UnitBase` 공통 로직은 유지
2. 수치만 파생 클래스에서 override 가능하게 확장
3. 정말 다르게 보여야 할 때만 draw 경로를 분기

권장 형태:

- `GetHitFlashDuration() const`
- `GetHitFlashBlinkInterval() const`
- `GetHitFlashMinBlinkStrength() const`

이런 식의 protected virtual getter를 두면, 공통 계산식은 유지하면서 유닛별 감도만 달리 줄 수 있다.

## 2. 색상 flash로 확장하고 싶을 때
현재는 white flash만 지원한다.  
추후 독, 화염, 실드 피격처럼 색상을 달리하고 싶다면 `DrawTextureWhiteFlash`를 바로 늘리기보다, tint 기반 공통 API로 한 단계 올리는 편이 낫다.

확장 방향:

- `DrawTextureFlash(texture, ..., flash_color, flash_strength, ...)`

이렇게 가면:

- 일반 피격은 white
- 독은 green
- 화염은 orange
- 방어 성공은 blue

같은 식으로 자연스럽게 확장할 수 있다.

## 3. sprite 외 도형 렌더링에도 붙이고 싶을 때
현재 `__super::_DrawObjectShape()` 경로는 기본 ellipse를 그리기만 한다.  
도형 렌더 기반 유닛에도 동일한 피격 감각이 필요하면 아래 둘 중 하나가 적당하다.

선호 순서:

1. 기본 도형 색을 잠깐 밝게 바꾸는 방식
2. 외곽선 또는 additive overlay를 얹는 방식

이 경우에도 flash 타이머는 `UnitBase`를 그대로 쓰고, 실제 draw 표현만 분기하는 것이 좋다.

## 4. 피격 반응 시스템으로 더 크게 묶고 싶을 때
장기적으로는 hit flash를 단독 기능으로 두기보다 "피격 반응 패키지"로 묶을 수 있다.

예:

- hit flash
- knockback
- camera shake
- hit stop
- brief invulnerability
- hurt animation trigger

이 단계로 갈 때는 `UnitBase`에 모든 것을 몰아넣기보다 `HitReactionComponent` 또는 `HitFeedbackProfile` 형태로 분리하는 편이 더 안전하다.

---

## 수치 조절 가이드

## 현재 기준값
현재 공통값은 다음과 같다.

- `duration = 0.18`
- `blink interval = 0.045`
- blink 강도는 강한 프레임 `1.0`, 약한 프레임 `0.35`
- 시간이 끝날수록 `fade_out`으로 자연 감쇠

체감 해석:

- `0.18초`는 짧고 즉각적인 피격 피드백
- `0.045초`는 총 4프레임 성격의 짧은 깜빡임 리듬
- `0.35`는 "완전 on/off"가 아니라 여전히 원본 sprite가 보이는 약한 점멸

## 값을 바꿀 때의 기준

### 1. 지속 시간 `duration`
의미:

- 피격 반응이 전체적으로 얼마나 오래 남아 보이는지 결정

조절 팁:

- `0.12 ~ 0.16`: 더 경쾌하고 아케이드 느낌
- `0.18`: 현재 기준, 무난하고 즉각적
- `0.22 ~ 0.30`: 보스나 묵직한 피격 느낌

주의:

- 너무 길면 연속 피격 시 화면이 계속 번쩍여서 가독성이 떨어진다.
- 플레이어에 너무 길게 주면 무적처럼 오해될 수 있다.

### 2. 깜빡임 간격 `blink interval`
의미:

- 반짝임이 몇 번 정도 끊겨 보이는지, 리듬이 얼마나 빠른지 결정

조절 팁:

- 값을 줄이면: 더 빠르고 날카로운 전기 같은 느낌
- 값을 늘리면: 더 둔하고 크게 점멸하는 느낌

권장 범위:

- `0.03 ~ 0.06`

주의:

- 너무 짧으면 거의 계속 흰색으로만 느껴질 수 있다.
- 너무 길면 깜빡임 횟수가 적어서 "반짝임"보다 "잠깐 하얘짐"처럼 보일 수 있다.

### 3. 약한 blink 강도 `0.35`
의미:

- 깜빡임의 약한 프레임에서 원본 sprite가 얼마나 보이는지 결정

조절 팁:

- `0.20 ~ 0.30`: 대비가 강해서 더 번쩍임
- `0.35`: 현재 기준, 안정적
- `0.45 ~ 0.60`: 부드럽고 점잖은 느낌

주의:

- 너무 낮으면 눈에 거슬리고 피로할 수 있다.
- 너무 높으면 strong/weak 차이가 줄어 flash 느낌이 약해진다.

### 4. fade-out 비중
현재는 남은 시간 비율을 그대로 써서 강도가 점점 줄어든다.

현재 장점:

- 종료 시점이 자연스럽다.
- 마지막 프레임에서 "뚝" 끊기는 느낌이 적다.

확장 아이디어:

- 선형 감쇠 대신 ease-out 적용
- 초반 강도 유지 후 후반에만 빠르게 감소

추천 상황:

- 보스 피격은 초반 강도를 조금 더 유지하는 방식이 잘 어울릴 수 있다.

---

## 추천 튜닝 프리셋

## 1. 기본형
- duration: `0.18`
- blink interval: `0.045`
- weak blink strength: `0.35`

추천 대상:

- 일반 적
- 현재 플레이어

## 2. 가벼운 피격형
- duration: `0.12`
- blink interval: `0.03`
- weak blink strength: `0.45`

추천 대상:

- 작은 잡몹
- 빠른 템포 게임플레이

## 3. 묵직한 피격형
- duration: `0.24`
- blink interval: `0.05`
- weak blink strength: `0.25`

추천 대상:

- 엘리트
- 보스
- 강공격 피격 전용 연출

---

## 다음 작업 추천

우선순위 기준 추천:

1. hit flash 수치를 상수 묶음 또는 profile로 빼기
2. 유닛별 override 가능 구조 추가
3. 색상 flash 확장 여부 검토
4. 도형 렌더 경로에도 flash 표현 추가
5. 장기적으로 hit reaction 전체 시스템과 통합

가장 현실적인 다음 단계는 1번이다.  
지금은 공통화는 잘 됐지만, 수치가 `UnitBase.cpp` 내부 상수에 묶여 있어서 기획 조절성이 아직 높지는 않다.  
`HitFlashProfile` 또는 protected getter 기반으로 한 번 더 정리하면 다음 확장이 훨씬 쉬워진다.

---

## 검증 메모
- `Debug|x86` 솔루션 빌드 성공
- 기존 `Enemy` flash 유지 확인 필요
- `StagePlayer` 피격 시 flip 방향 유지 확인 필요
- 연속 피격 시 flash 갱신 체감 확인 필요

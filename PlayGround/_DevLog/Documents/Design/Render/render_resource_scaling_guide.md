# Render Resource Scaling Guide

## 문서 목적

이번 작업에서 적용한 `1920x1080` 기준 리소스 스케일링 정책과 애니메이션 크기 수정 내용을 정리한다.
이 문서는 아래 세 가지를 한 번에 다루기 위한 기준 문서다.

- 이번 작업 리뷰
- 이후 확장 시 지켜야 할 구조 원칙
- 화면 크기와 리소스 표시 크기 관련 수치 조절 가이드

---

## 현재 정책 요약

- 논리 좌표계는 기존과 동일하게 `1280x720` 기준을 유지한다.
- `1920x1080`은 입력/UI 기준 해상도가 아니라, 앞으로 제작될 리소스의 기준 해상도다.
- 해상도 스케일 계산의 단일 소스는 `ScreenSystem`이다.
- 월드 리소스는 `uniform-fit` 규칙을 사용한다.
- 배경은 `cover + centered crop` 규칙을 사용한다.
- UI, 입력 좌표계, 버튼 판정, `ui_scale` 흐름은 이번 범위에서 바꾸지 않는다.

핵심 수식은 아래와 같다.

```txt
worldResourceScale = min(windowWidth / 1920, windowHeight / 1080)
backgroundCoverScale = max(windowWidth / 1920, windowHeight / 1080)
```

---

## 이번 작업 리뷰

## 1. 직접 원인 수정

`TownPlayer` 애니메이션이 과하게 크게 보이던 직접 원인은 `SpriteRendererComponent`의 목적지 사각형 계산 버그였다.

문제점:

- 스케일 계산은 하고 있었지만
- 실제 `dest_rect`는 계산된 `draw_width`, `draw_height`, `pivot`을 쓰지 않고
- 원본 이미지 크기 중심 배치에 가까운 값으로 그려지고 있었다

이번 수정으로 애니메이션 프레임도 레거시 월드 스프라이트와 같은 규칙으로 크기와 피벗을 적용하게 되었다.

## 2. 구조적으로 잘 정리된 점

- `ScreenSystem`이 해상도 정책을 소유하도록 경계를 명확히 했다.
- 월드 스프라이트 목적지 사각형 계산을 공통 함수로 묶어서 중복 계산을 제거했다.
- `SpriteRendererComponent`, `StagePlayer`, `Enemy`가 같은 규칙을 공유하게 되었다.
- 배경이 더 이상 단순 stretch가 아니라 비율 유지 + 중앙 crop으로 그려진다.

## 3. 이번 구현에서 의도적으로 남겨둔 점

- UI와 입력 좌표계는 건드리지 않았다.
- `1920x1080`을 새로운 게임 논리 좌표계로 바꾸지 않았다.
- 월드 렌더링 계산만 공통화했고, 이 이상 과한 렌더링 시스템 추상화는 도입하지 않았다.

## 4. 현재 기준에서 알고 있어야 할 한계

- `1280x720`에서는 월드 리소스가 `1920` 기준 대비 `0.6667x`로 보인다.
- 즉, 기존 자산도 이번 정책을 즉시 받기 때문에 체감 표시 크기는 달라질 수 있다.
- 비 `16:9` 해상도에서는 배경 일부가 의도적으로 잘린다.
- 월드 스프라이트의 세로 체감 비율은 현재 공통 `height ratio = 0.6` 규칙을 따른다.

---

## 책임 경계

## `ScreenSystem`

책임:

- 기준 제작 해상도 `1920x1080` 보관
- 현재 창 해상도 기준 월드 스케일 계산
- 현재 창 해상도 기준 배경 cover 스케일 계산

하지 말아야 할 것:

- 개별 캐릭터별 보정값 소유
- 피벗, visible bounds, 프레임별 렌더 정보 소유

## 월드 렌더 경로

대상:

- `SpriteRendererComponent`
- `StagePlayer`
- `Enemy`

책임:

- `ScreenSystem`이 제공한 스케일을 사용해 `dest_rect`만 계산
- 스프라이트의 `pivot`, `visible bounds`, 원본 이미지 크기를 반영

하지 말아야 할 것:

- 각 렌더러 내부에서 별도의 해상도 정책 상수 선언
- `1920x1080` 상수를 직접 들고 있는 것

## `Background`

책임:

- 배경 이미지를 비율 유지로 화면에 꽉 채움
- 필요 시 중앙 crop 적용

하지 말아야 할 것:

- 해상도 정책 자체를 새로 계산하는 것
- stretch 방식으로 복귀하는 것

## UI / 입력

책임:

- 기존 `DesignResolution(1280x720)`, `MousePointDesign`, `ui_scale` 유지

하지 말아야 할 것:

- 월드 리소스 스케일 공식을 재사용해서 UI를 함께 바꾸는 것

---

## 현재 계산 규칙

## 월드 스프라이트 목적지 사각형

현재 월드 스프라이트는 아래 개념으로 그려진다.

```txt
scaleX = (worldWidth * worldResourceScale) / visibleWidth
scaleY = ((worldWidth * heightRatio) * worldResourceScale) / visibleHeight

drawWidth = imageWidth * scaleX
drawHeight = imageHeight * scaleY

pivotX = spritePivotX * scaleX
pivotY = spritePivotY * scaleY

destRect = {
  screenX - pivotX,
  screenY - pivotY,
  screenX - pivotX + drawWidth,
  screenY - pivotY + drawHeight
}
```

이 규칙이 의미하는 바는 아래와 같다.

- `worldWidth`는 월드에서 의도한 캐릭터 가로 점유 폭이다.
- `visibleWidth`, `visibleHeight`는 실제 내용물 기준 보정값이다.
- `imageWidth`, `imageHeight`는 원본 프레임 크기다.
- `pivot`은 발 위치나 중심 위치를 어디에 둘지 결정한다.
- `heightRatio = 0.6`은 현재 프로젝트의 기존 시각 비율을 보존하기 위한 규칙이다.

## 배경 렌더 규칙

배경은 아래 흐름으로 계산한다.

```txt
coverScale = max(windowWidth / 1920, windowHeight / 1080)
drawWidth = 1920 * coverScale
drawHeight = 1080 * coverScale
sourceRect = 원본 이미지에서 목표 비율(16:9)에 맞춰 중앙 crop
destRect = 현재 뷰포트 중심 기준으로 drawWidth/drawHeight 배치
```

이 방식의 장점:

- 왜곡 없이 화면을 채운다.
- 해상도가 달라도 배경이 늘어나거나 찌그러지지 않는다.
- 비 `16:9`에서 crop 위치가 예측 가능하다.

---

## 해상도별 예상 스케일

| 해상도 | 월드 스케일 | 배경 cover 스케일 | 메모 |
| --- | ---: | ---: | --- |
| `1280x720` | `0.6667` | `0.6667` | 16:9, 축소 표시 |
| `1600x900` | `0.8333` | `0.8333` | 16:9, 중간 크기 |
| `1920x1080` | `1.0000` | `1.0000` | 제작 기준 해상도 |
| `2560x1440` | `1.3333` | `1.3333` | 16:9, 확대 표시 |
| `1280x1024` | `0.6667` | `0.9481` | 월드는 fit, 배경은 세로 기준 cover 후 좌우 crop |

---

## 수치 조절 가이드

## 1. 모든 월드 캐릭터가 공통으로 너무 크거나 작게 보일 때

먼저 확인할 것:

- 정말 "전부" 같은 방향으로 어긋나는지
- 특정 캐릭터만 이상한 것이 아닌지
- 문제의 원인이 해상도 정책인지, 스프라이트 메타데이터인지

권장 조치:

- 전 캐릭터 공통 문제라면 `ScreenSystem` 쪽 정책에서 해결한다.
- 개별 렌더러 안에 임시 배율을 추가하지 않는다.

추천 방향:

- 프로젝트 전체 체감이 계속 어긋난다면 `ScreenSystem`에 전역 보정 계수를 추가하는 것은 가능하다.
- 단, 그 보정값도 `ScreenSystem`이 소유해야 하며 렌더러마다 따로 넣으면 안 된다.

## 2. 특정 캐릭터 하나만 크거나 작게 보일 때

우선순위는 아래 순서를 추천한다.

1. `visible bounds`가 실제 캐릭터 몸체를 잘 잡고 있는지 확인
2. `pivot`이 발 위치 기준으로 맞는지 확인
3. 액터의 월드 기준 폭(`transform_->Scale().x`)이 의도한 값인지 확인
4. 애니메이션 프레임마다 메타데이터가 일관적인지 확인

판단 기준:

- 몸체는 맞는데 발이 뜨거나 묻히면 `pivot` 문제일 가능성이 높다.
- 여백이 많은 프레임 때문에 유독 작거나 크게 보이면 `visible bounds` 문제일 가능성이 높다.
- 캐릭터의 실제 게임 내 점유 면적이 잘못되었으면 월드 기준 폭 문제일 가능성이 높다.

## 3. 세로로 납작하거나 과하게 커 보일 때

이 경우 가장 먼저 떠올릴 값은 공통 `height ratio`다.

현재 의미:

- `height ratio = 0.6`은 프로젝트의 기존 체감 비율을 유지하는 전역 규칙이다.

주의:

- 이 값을 바꾸면 `SpriteRendererComponent`, `StagePlayer`, `Enemy`가 모두 동시에 영향을 받는다.
- 즉, 개별 캐릭터 문제 해결용으로는 적합하지 않다.

권장 사용:

- 전체 프로젝트의 세로 체감이 한 방향으로 일관되게 어색할 때만 조정한다.

## 4. 발 위치가 밀리거나 점프한 것처럼 보일 때

조정 대상:

- `pivot`

해석:

- 발이 땅에서 떠 보이면 `pivotY`가 너무 작을 가능성이 높다.
- 발이 바닥 아래에 묻히면 `pivotY`가 너무 클 가능성이 높다.
- 좌우 중심이 어색하면 `pivotX`를 점검한다.

## 5. 애니메이션 프레임마다 크기가 출렁일 때

가능성이 높은 원인:

- 프레임별 `visible bounds` 기준 불일치
- 프레임별 `pivot` 기준 불일치
- 실제 원본 프레임 안의 캐릭터 배치가 제각각인 경우

권장 대응:

- 프레임 아틀라스 제작 규칙을 정한다.
- 최소한 같은 애니메이션 안에서는 발 기준선과 몸체 bounding 기준을 통일한다.

## 6. 배경이 너무 많이 잘린다고 느껴질 때

현재 규칙상 crop은 정상 동작일 수 있다.

점검 순서:

1. 사용 중 해상도가 비 `16:9`인지 확인
2. 배경의 안전 구역이 중앙에 배치되어 있는지 확인
3. UI나 중요한 배경 오브젝트가 화면 가장자리에 몰려 있지 않은지 확인

향후 개선 방향:

- 필요하면 `Background`에 중앙 정렬 외의 focus point 개념을 추가할 수 있다.
- 단, 이것도 배경 책임 안에서 해결해야지 다른 렌더러로 분산하면 안 된다.

---

## 앞으로 리소스를 추가할 때의 권장 규칙

## 캐릭터 / 오브젝트 리소스

- 원본 제작 기준은 `1920x1080` 체감에 맞춘다.
- 프레임 안 여백은 가능하면 일정하게 유지한다.
- 발 기준선이 흔들리지 않도록 만든다.
- `visible bounds`는 "보여야 하는 몸체" 기준으로 잡고, 투명 여백을 그대로 신뢰하지 않는다.
- `pivot`은 장식 중심보다 실제 접지점 기준을 우선한다.

## 배경 리소스

- 중앙 영역에 핵심 오브젝트를 두는 편이 안전하다.
- 비 `16:9` crop을 고려해 좌우 끝에 중요한 UI 연출 정보를 몰아두지 않는다.
- 원본이 `16:9`가 아니더라도, 최종적으로는 중앙 crop 시 정보 손실이 적은 구성을 추천한다.

---

## 향후 확장 가이드

## 1. 월드 스프라이트 공통 경로 확장

현재는 최소 대상만 공통 규칙으로 맞췄다.

다음 후보:

- `TownNpc`
- 월드 배치 오브젝트
- 추후 추가될 필드 상호작용 오브젝트

원칙:

- 새로운 월드 스프라이트 렌더 경로가 생기면 같은 helper를 재사용한다.
- 렌더러마다 별도 스케일 공식을 복제하지 않는다.

## 2. 디버그 시각화 추가

튜닝 속도를 크게 높여줄 수 있는 항목:

- `pivot` 표시
- `visible bounds` 표시
- 최종 `dest_rect` 표시
- 현재 해상도별 `worldResourceScale` 표시

이 기능이 있으면 "왜 크게 보이는가"를 감으로 보지 않고 바로 원인을 볼 수 있다.

## 3. 전역 보정 계수 도입

만약 실서비스 튜닝 결과 `1920` 기준 정책은 맞지만 체감 크기가 조금씩 어긋난다면, 아래 방향이 안전하다.

- `ScreenSystem`에 `world_resource_scale_bias` 같은 전역 보정값 추가
- 월드 스케일 계산 결과에만 곱함
- 렌더러 내부의 개별 상수 난립은 금지

적용 예:

```txt
worldScale = min(windowW / 1920, windowH / 1080) * globalBias
```

## 4. 배경 focus point 확장

중앙 crop만으로 부족한 배경이 생기면 아래 형태로 확장 가능하다.

- `Center`
- `Top`
- `Bottom`
- 사용자 정의 focus point `(0.0 ~ 1.0)`

이 확장은 `Background::CreateInfo`와 배경 렌더 계산 안에서만 해결하는 것이 좋다.

## 5. 테스트 체크리스트 문서화

추가 리소스가 계속 들어올 예정이라면 수동 테스트 체크리스트를 함께 유지하는 것이 좋다.

추천 체크 항목:

- `1280x720`, `1600x900`, `1920x1080`에서 같은 캐릭터 체감 비교
- 비 `16:9`에서 배경 crop 확인
- 카메라 추적 중 캐릭터 접지감 확인
- 충돌, 인터랙션, 파티클 위치가 렌더와 분리되어 깨지지 않는지 확인
- UI 클릭 판정과 배율이 변하지 않았는지 확인

---

## 절대 피해야 할 것

- `1920x1080`을 새 입력 좌표계처럼 사용하기
- UI에도 같은 공식을 곧바로 적용하기
- 렌더러마다 `window / 1920` 계산을 다시 쓰기
- 특정 캐릭터 문제를 해결하려고 전역 정책을 자주 흔들기
- 전역 문제를 개별 캐릭터 임시 배율로 덮기

---

## 이번 작업 기준 핵심 파일

- `Project/EngineSystems/Render/ScreenSystem.h`
- `Project/EngineSystems/Render/ScreenSystem.cpp`
- `Project/Gameplay/Animation/SpriteAnimationTypes.h`
- `Project/Gameplay/Components/SpriteRendererComponent.cpp`
- `Project/Gameplay/Actors/Stage/StagePlayer.cpp`
- `Project/Gameplay/Actors/Stage/Enemy.cpp`
- `Project/Gameplay/World/Background.cpp`

---

## 빠른 결론

이번 정리는 단순히 애니메이션 캐릭터 크기 버그를 고친 것에서 끝나지 않는다.
앞으로 들어올 `1920x1080` 기준 리소스를 현재 해상도에 맞춰 일관되게 그리기 위한 최소 구조를 만든 작업이다.

이후 확장에서 가장 중요한 원칙은 아래 두 줄로 요약된다.

- 해상도 정책은 `ScreenSystem`이 소유한다.
- 개별 리소스 튜닝은 `pivot`, `visible bounds`, 월드 기준 폭으로 해결한다.

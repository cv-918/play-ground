# 파티클 시스템 개요

## 목적

이 문서는 현재 파티클 시스템 구현, 관련 클래스의 책임, JSON 데이터 모델, 런타임 생명주기를 정리한다.

파티클 시스템은 기존 WinAPI 기반 커스텀 렌더링 경로 위에 구축된 경량 데이터 기반 시각 효과 시스템이다. 즉시 재생되는 burst 파티클과 데이터로 정의된 지속 emitter를 지원한다. 게임플레이 상태는 효과를 언제 재생할지 결정하고, `ParticleService`는 파티클 런타임 실행을 담당하며, 렌더링 단계는 계산된 파티클을 그린다.

## 범위

이 문서가 다루는 내용:

- 파티클 데이터 정의와 JSON 로딩
- 런타임 파티클 풀 관리
- Burst emission
- 지속 emitter 재생
- 씬 생명주기 cleanup
- 현재 통합 지점과 알려진 제한 사항

이 문서는 새로운 데이터 스키마를 정의하거나 런타임 동작 변경을 요청하지 않는다.

## 소스 파일

| 영역 | 파일 |
| --- | --- |
| 런타임 데이터 모델 | `PlayGround/Project/EngineSystems/Render/ParticleData.h` |
| 런타임 서비스 | `PlayGround/Project/EngineSystems/Render/ParticleService.h`, `PlayGround/Project/EngineSystems/Render/ParticleService.cpp` |
| JSON 매니저 | `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleDataManager.h`, `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleEmitterDataManager.h` |
| 데이터 파일 | `PlayGround/Data/Particle.json`, `PlayGround/Data/ParticleEmitter.json` |
| 데이터 로딩 | `PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp` |
| 씬 업데이트/렌더 통합 | `PlayGround/Project/Gameplay/Scenes/Scene.cpp`, `PlayGround/Project/Gameplay/Scenes/InGameScene.cpp` |
| 씬 cleanup | `PlayGround/Project/Gameplay/GamePlaySystems/SceneManager.cpp` |
| 디버그/샘플 사용 | `PlayGround/Project/Gameplay/Scenes/WorkStationScene.cpp`, `PlayGround/Project/Gameplay/Actors/Stage/DashAbility.cpp` |

## 상위 모델

```text
JSON data
  Particle.json
    -> ParticleSetting
    -> ParticleDataManager

  ParticleEmitter.json
    -> ParticleEmitterSpec
    -> ParticleEmitterDataManager

Runtime
  Gameplay code chooses when to play an effect
    -> ParticleService::Emit / EmitCustom / PlayEmitterAt / PlayEmitterAttached
    -> ParticleService updates active emitters
    -> ParticleService updates active particle instances
    -> ParticleService renders particles through the custom renderer
```

## 책임 경계

| 책임 | 소유자 |
| --- | --- |
| 효과가 언제 발생해야 하는지 결정 | 게임플레이 시스템, 씬, ability |
| 재사용 가능한 파티클 동작 정의 | `Particle.json`의 `ParticleSetting` |
| 지속 emitter 재생 정의 | `ParticleEmitter.json`의 `ParticleEmitterSpec` |
| ID 기반 JSON 데이터 로딩 | `ParticleDataManager`, `ParticleEmitterDataManager` |
| 활성 파티클과 emitter 소유 | `ParticleService` |
| 파티클 그리기 | `_DrawFunc`와 `_GraphicSourceMgr`를 사용하는 `ParticleService::Render` |
| 씬 전환 cleanup | `ParticleService::ClearSceneState`를 호출하는 `SceneManager::_CleanupCurrentScene` |

이 분리가 중요하다. 게임플레이 상태는 시각 효과를 트리거해야 하지만, 파티클 재생 자체는 파티클 런타임 서비스 안에 남아야 한다.

## 데이터 모델

### `EmitterShape`

`EmitterShape`는 초기 생성 모양을 정의한다.

- `Point`: 한 점
- `Circle`: 반지름 안의 무작위 위치
- `Box`: enum에는 선언되어 있지만, 현재 `ParticleService::Emit`에는 구현되어 있지 않음

### `ParticleSetting`

`ParticleSetting`은 `Particle.json`에서 로드되는 재사용 파티클 레시피다.

주요 필드:

- `id_`: `ParticleDataManager`가 사용하는 고유 데이터 ID
- `shape`: 생성 모양 enum 값
- `shapeRadius`: circle emission에서 사용하는 반지름
- `arcAngle`: 현재 월드 +X 방향을 중심으로 한 무작위 속도 각도 범위
- `minLife`, `maxLife`: 무작위 수명 범위
- `minSpeed`, `maxSpeed`: 무작위 속도 범위
- `startScale`, `endScale`: 수명 동안의 크기 변화
- `sizeEase`: 크기 보간에 사용할 easing 모드
- `startColor`, `endColor`: 수명 동안의 색상 변화
- `colorEase`: 색상 보간에 사용할 easing 모드
- `airResistance`: 업데이트마다 적용되는 속도 감쇠값
- `gravityScale`: 데이터에는 선언되어 있지만 현재 업데이트에는 적용되지 않음
- `textureKey`: 텍스처 경로 키. 비어 있으면 채워진 원으로 대체 렌더링

### `ParticleEmitterSpec`

`ParticleEmitterSpec`은 `ParticleEmitter.json`에서 로드되는 지속 emitter 정의다.

주요 필드:

- `id_`: `ParticleEmitterDataManager`가 사용하는 고유 emitter ID
- `particle_setting_id_`: 참조할 `ParticleSetting` ID
- `emit_interval_sec_`: emission tick 사이의 시간. `0`보다 커야 함
- `emit_count_per_tick_`: tick마다 생성할 파티클 수. `0`보다 커야 함
- `duration_sec_`: emitter 지속 시간. `0`은 무한 지속, 음수는 invalid

### `Particle`

`Particle`은 활성 파티클 한 개의 런타임 상태다.

저장하는 값:

- `position_`
- `velocity_`
- `life_time_`
- `max_life_time_`
- `is_active_`
- `currentScale`
- `currentColor`
- 수명 보간과 이동 감쇠에 사용할 복사된 `ParticleSetting`

각 활성 파티클은 생성 시점의 설정 복사본을 가진다. 따라서 이후 JSON reload나 setting 변경이 이미 살아 있는 파티클을 직접 변경하지 않는다.

## 런타임 서비스

### `ParticleService`

`ParticleService`는 `IInitializable`과 `IUpdatable`을 구현하는 singleton 서비스다.

Public API:

- `Initialize(pool_size)`: 파티클 풀을 할당하고 런타임 상태를 초기화
- `Update(delta_time)`: emitter를 먼저 업데이트한 뒤 활성 파티클을 업데이트
- `Render(delta_time)`: 활성 파티클 렌더링
- `Emit(setting, pos, count)`: setting의 무작위 범위를 사용해 즉시 burst 생성
- `EmitCustom(setting, pos, velocity, life_time_override, start_scale_override)`: 명시적 이동 override를 가진 단일 파티클 생성
- `PlayEmitterAt(spec, world_pos)`: 고정 월드 위치에서 지속 emitter 시작
- `PlayEmitterAttached(spec, owner, local_offset)`: owner 오브젝트에 붙은 지속 emitter 시작
- `StopEmitter(handle)`: 특정 emitter를 stop 예정 상태로 표시
- `StopAllEmittersByOwner(owner)`: 특정 owner에 붙은 모든 emitter를 stop 예정 상태로 표시
- `ClearSceneState()`: 활성 emitter와 활성 파티클 정리

### 파티클 풀

서비스는 고정 크기 풀을 사용한다.

- `particle_pool_`: 모든 파티클 저장소
- `active_indices_`: 활성 파티클 index
- `free_indices_`: 재사용 가능한 파티클 index

`free_indices_`가 비어 있으면 `_ActivateParticle`은 생성 없이 반환한다. 이 방식은 런타임 allocation을 피하지만, 현재는 풀이 가득 찼을 때 새 파티클이 조용히 드롭된다.

### 활성 Emitter

지속 emitter는 다음 컨테이너에 저장된다.

```cpp
std::unordered_map<ParticleEmitterHandle, ActiveEmitter> active_emitters_;
```

`ActiveEmitter`가 저장하는 값:

- 생성된 handle
- emitter spec
- resolve된 `ParticleSetting*`
- 선택적 owner pointer와 destruction callback id
- 고정 월드 위치 또는 owner local offset
- 경과 시간과 emit accumulator
- pending stop 상태와 stop reason

Emitter handle은 `0`을 invalid로 사용하고 `1`부터 증가한다.

## 생명주기

### 초기화

`PlayGround::Initialize`는 `GameDataLoader::LoadAll`을 통해 게임 데이터를 로드한 뒤 `_ParticleService`를 pool size `1000`으로 초기화한다.

`ParticleService::Initialize` 순서:

1. `ClearSceneState` 호출
2. 파티클 풀 resize
3. `free_indices_` 채우기
4. 다음 emitter handle을 `1`로 reset

### 데이터 로딩

`GameDataLoader`가 로드하는 파티클 데이터:

- `Data/Particle.json` -> `_ParticleDataMgr`
- `Data/ParticleEmitter.json` -> `_ParticleEmitterDataMgr`

두 manager는 `JsonDataManager<T>`를 상속하며, 데이터를 `id_`를 key로 하는 `unordered_map`에 저장한다.

`GameDataLoader::ReloadAll`은 데이터를 다시 로드하기 전에 활성 파티클 런타임 상태를 정리한다. 이는 JSON reload 후 오래된 emitter나 particle이 stale data를 참조하지 않도록 하기 위해 중요하다.

### 업데이트 순서

씬 업데이트 순서에서 파티클 업데이트는 object와 UI의 late update 이후에 배치된다.

```text
Scene::LateUpdate
  object_manager_->LateUpdate
  ui_manager_->LateUpdate
  ParticleService::Update
```

`InGameScene`은 게임이 pause 상태가 아닐 때만 파티클을 업데이트한다. 따라서 인게임 파티클은 일시정지 중 멈춘다.

`ParticleService::Update` 내부 순서:

1. `_UpdateEmitters(dt)`가 활성 emitter에서 새 파티클을 생성
2. 활성 파티클의 남은 수명 감소
3. 만료된 파티클을 `free_indices_`로 반환
4. `airResistance`로 velocity 감쇠
5. velocity로 position 갱신
6. easing 함수로 scale과 color 보간

### 렌더 순서

파티클은 월드 오브젝트 뒤, UI 앞에 렌더링된다.

```text
World objects
Particles
UI
```

파티클 렌더링 중에는 씬의 camera shake/global offset이 적용된 상태이므로, 파티클은 월드 공간 시각 요소로 취급된다.

### 씬 Cleanup

`SceneManager::_CleanupCurrentScene`은 일반 씬 전환 중 `_ParticleService.ClearSceneState()`를 호출한다.

`ClearSceneState` 순서:

1. 모든 활성 emitter stop 및 owner detach
2. 활성 emitter storage 정리
3. 활성 particle index 정리
4. free index list 재구성
5. particle별 런타임 필드 reset

정적 종료 시에는 singleton destruction order가 안전하지 않을 수 있으므로 `SceneManager::~SceneManager`가 `Shutdown(false)`를 호출해 global particle service state를 건드리지 않는다.

## Emission 경로

### 즉시 Burst

`ParticleService::Emit`은 `ParticleSetting`으로 하나 이상의 파티클을 생성한다.

현재 동작:

- Circle shape는 `shapeRadius` 안에서 생성 위치를 무작위화
- Point와 Box는 현재 입력 위치를 그대로 사용
- Velocity angle은 world +X를 중심으로 `arcAngle` 범위 안에서 무작위화
- Speed와 lifetime은 setting의 범위에서 무작위화

### Custom 단일 파티클

`ParticleService::EmitCustom`은 명시적 velocity와 선택적 lifetime/start scale override를 가진 단일 파티클을 생성한다.

현재 사용:

- `DashAbility`가 이 경로를 사용해 enemy body center를 향해 안쪽으로 이동하는 charge particle을 생성한다

### 지속 Emitter

`ParticleService::PlayEmitterAt`은 고정 월드 위치에서 emitter를 시작한다.

`ParticleService::PlayEmitterAttached`는 `GameObjectBase`에 붙은 emitter를 시작한다. Attached emitter의 동작:

- null, pending-destruction, transform 없는 owner 거부
- owner destruction callback 등록
- owner position, right/forward vector, local offset으로 월드 위치 계산
- owner가 invalid가 되면 pending stop으로 표시

`_ValidateEmitterSpec`은 다음 조건에서 emitter spec을 거부한다.

- `emit_interval_sec_ <= 0`
- `emit_count_per_tick_ == 0`
- `duration_sec_ < 0`
- 참조한 particle setting이 존재하지 않음

Invalid spec은 id, setting id, interval, count, duration과 함께 로그로 기록된다.

## 현재 사용 지점

### Debug InGame sample

`InGameScene`은 pause 상태가 아닐 때 `F6` 입력으로 `ParticleEmitter.json`의 id `2001`을 mouse world position에 재생한다.

### WorkStation sample scene

`WorkStationScene`은 debug-only 샘플 재생을 제공한다.

- `F5`: 모든 JSON 데이터 reload
- `1`: `ParticleEmitter.json` id `2001` 선택
- `2`: `Particle.json` id `1001` 선택
- Left click: 선택한 샘플을 mouse cursor 위치에 재생

### Dash charge effect

`DashAbility`는 `ParticleSetting` id `1004`를 로드하고, `EmitCustom`을 사용해 enemy body collider 주변에 charge particle을 생성한다. 이 파티클들은 body center 근처의 target을 향해 안쪽으로 이동한다.

## 검증과 실패 동작

### JSON Loading

JSON 변환 함수는 `j.at(...)`을 통해 required field를 읽는다. 필드가 없거나 JSON type이 맞지 않으면 `json::exception`이 발생하고, `JsonDataManager::Load`가 이를 catch해 parse failure로 보고한다.

중복 id는 debug message로 보고되지만, data table에서는 뒤에 나온 entry가 앞 entry를 덮어쓴다.

### Runtime Validation

지속 emitter는 활성화 전에 spec을 검증한다. Invalid emitter는 handle `0`을 반환하고 error log를 남긴다.

Attached emitter는 활성화 전에 owner 유효성을 검증한다. Invalid owner는 handle `0`을 반환하고 error log를 남긴다.

즉시 burst emission은 particle lifetime을 최소 `0.01`로 clamp하고 start scale을 최소 `0`으로 clamp하는 것 외에는 데이터 range를 별도로 검증하지 않는다.

## 알려진 제한 사항

- `EmitterShape::Box`는 enum에 존재하지만 `ParticleService::Emit`에 구현되어 있지 않다.
- `gravityScale`은 `ParticleSetting`에 존재하지만 `ParticleService::Update`에서 적용되지 않는다.
- `arcAngle`은 world +X를 중심으로 하며 owner orientation이나 gameplay direction에 연결되어 있지 않다.
- 풀 exhaustion 시 새 파티클은 조용히 드롭된다.
- `ParticleService::Render`는 각 particle render마다 `_GraphicSourceMgr`에 texture를 요청한다. caching 여부는 graphic source manager 정책에 의존한다.
- `ParticleEmitterSpec`은 resolve된 `ParticleSetting` raw pointer를 저장한다. Runtime reload 전에 particle state를 clear하는 현재 흐름이 중요한 이유다.
- `ParticleSetting::textureKey`가 비어 있으면 `currentScale * 5.0f` 반지름의 filled circle을 렌더링하고, textured mode에서는 texture dimension에 `currentScale`을 곱해 렌더링한다.

## 확장 참고

향후 파티클 작업은 다음 경계를 유지해야 한다.

- Gameplay와 AI는 효과가 언제 trigger되는지 결정한다.
- `ParticleService`는 particle playback과 rendering을 실행한다.
- JSON data는 재사용 가능한 particle/emitter 동작을 정의한다.
- Scene lifecycle은 cleanup timing을 소유하며, 개별 gameplay actor가 이를 소유하지 않는다.

향후 추가 가능성이 있는 작업은 명시적인 schema 또는 runtime behavior change로 취급해야 한다.

- Box emitter shape 동작
- Owner transform 기반 directional emission
- Gravity 적용
- Pool exhaustion logging 또는 metrics
- Texture/material caching policy
- Particle JSON range에 대한 data validation pass

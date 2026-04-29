# Particle Emitter Runtime Guide

## 개요
이 문서는 현재 프로젝트에 추가된 지속 생성 파티클 emitter 기능의 구현 상태, 확장 방향, Unity 포팅 관점, 그리고 실사용 방법을 정리한 가이드다.

현재 구조는 아래처럼 역할이 분리되어 있다.

- `ParticleSetting`
  - 개별 파티클 한 덩어리의 시각/수명/속도 레시피
- `ParticleEmitterSpec`
  - 얼마나 자주, 몇 개, 얼마나 오래 방출할지 정의
- `ParticleService`
  - active particle 갱신
  - active emitter 갱신
  - owner 추적
  - stop / cleanup 처리

## 현재 구현 요약

### 지원하는 public API
`Project/EngineSystems/Render/ParticleService.h`

```cpp
void Emit(const ParticleSetting& setting, const _Vector2& pos, _uint count = 1);

ParticleEmitterHandle PlayEmitterAt(
    const ParticleEmitterSpec& spec,
    const _Vector2& world_pos
);

ParticleEmitterHandle PlayEmitterAttached(
    const ParticleEmitterSpec& spec,
    GameObjectBase* owner,
    const _Vector2& local_offset = _Vector2::Zero()
);

void StopEmitter(ParticleEmitterHandle handle);
void StopAllEmittersByOwner(GameObjectBase* owner);
void ClearSceneState();
```

### 지원하는 emitter spec
`Project/EngineSystems/Render/ParticleData.h`

```cpp
struct ParticleEmitterSpec
{
    _uint id_ = 0;
    _uint particle_setting_id_ = 0;
    _float emit_interval_sec_ = 0.f;
    _uint emit_count_per_tick_ = 0;
    _float duration_sec_ = 0.f; // 0이면 무한 지속
};
```

### 런타임 동작 방식
- `ParticleService::Update()` 안에서 emitter를 먼저 갱신한다.
- emitter는 `emit_accumulator_sec_`를 누적하고 `while (acc >= interval)`로 실제 `Emit()`를 호출한다.
- owner attached emitter는 매 프레임 아래 식으로 방출 위치를 계산한다.

```cpp
world_pos =
    owner_position
    + owner_right * local_offset.x
    + owner_forward * local_offset.y;
```

- owner가 파괴되면 callback에서 `pending_stop_ = true`만 설정한다.
- 실제 제거는 update 루프에서 수행한다.
- scene 전환 시 `ClearSceneState()`로 emitter와 particle 상태를 모두 정리한다.

## 아직 안 한 것
이번 계획 기준으로 기능 미완성 항목은 없다.

다만 아래는 "아직 진행되지 않은 것"이 아니라 "의도적으로 v1 범위에서 뺀 것"이다.

- 실제 플레이어/적/스킬 쪽 emitter 사용처 연결
- emitter 디버그 HUD
- preset authoring tooling
- `PlayEmitterById()` 편의 API
- burst-on-start / burst-on-stop
- random interval / prewarm / looping variations

## 확장 가이드

### 1. preset 편의 API 추가
실사용이 늘어나면 아래 편의 API를 추가하는 것이 좋다.

```cpp
ParticleEmitterHandle PlayEmitterAt(_uint emitter_id, const _Vector2& world_pos);
ParticleEmitterHandle PlayEmitterAttached(_uint emitter_id, GameObjectBase* owner, const _Vector2& local_offset = _Vector2::Zero());
```

장점:
- 호출부에서 매번 `ParticleEmitterDataManager`를 조회하지 않아도 된다.
- 게임 로직 코드가 더 짧아진다.

주의:
- 내부에서 `GetData()` 실패 시 handle `0` 반환 규칙을 그대로 유지한다.

### 2. burst-on-start / burst-on-stop
연기, 화염, 전기장보다 "폭발 직후 잔불" 같은 효과에서 유용하다.

추천 확장 필드:

```cpp
_uint burst_on_start_count_ = 0;
_uint burst_on_stop_count_ = 0;
```

적용 위치:
- emitter 시작 직후
- `pending_stop_` 처리 직전

### 3. 디버그 지표 추가
디버그 창에 아래 값을 노출하면 운영이 편해진다.

- active emitter 수
- active particle 수
- free pool 수
- 최근 1초 드롭된 spawn 시도 수

### 4. emitter pooling
현재 emitter runtime은 `unordered_map` 기반이며, 대부분의 프로젝트 규모에서는 충분하다.
하지만 emitter 생성/삭제 빈도가 매우 높아지면 아래 구조도 검토할 수 있다.

- active emitter pool + free list
- handle -> slot index 테이블

### 5. spec 재로드 대응
현재 구현은 spec/particle data가 runtime 동안 재로드되지 않는 전제를 둔다.
핫리로드가 필요해지면 아래 중 하나로 정해야 한다.

- emitter 시작 시 spec도 완전 복사하고 끝까지 고정
- data revision을 두고 emitter가 다음 틱에 재resolve

현재 프로젝트는 첫 번째가 더 안전하다.

## Unity 포팅 가이드

## 개념 대응표

| 현재 프로젝트 | Unity 대응 |
| --- | --- |
| `ParticleSetting` | `ParticleSystem.Main`, `Shape`, `ColorOverLifetime`, `SizeOverLifetime` |
| `ParticleEmitterSpec` | `Emission` 모듈 + custom runtime wrapper |
| `ParticleService` | `ParticleSystemManager` 또는 `MonoBehaviour` 기반 중앙 매니저 |
| `PlayEmitterAttached` | owner `Transform`를 따라가는 wrapper |
| `ClearSceneState` | scene unload 시 manager cleanup |

### 포팅 시 바로 쓰기 좋은 구조
Unity에서는 보통 두 가지 방식이 있다.

1. `ParticleSystem` prefab을 직접 Instantiate
2. 중앙 manager가 "spec + owner"를 받아서 emission만 제어

현재 설계와 가장 비슷한 것은 2번이다.

추천 Unity 구조:

```csharp
public sealed class ParticleEmitterRuntime
{
    public int Handle;
    public ParticleEmitterSpec Spec;
    public ParticleRecipe Recipe;
    public Transform Owner;
    public Vector2 LocalOffset;
    public Vector2 FixedWorldPosition;
    public float ElapsedSec;
    public float EmitAccumulatorSec;
    public bool PendingStop;
}
```

### Unity에서 주의할 차이
- Unity는 transform parent만 걸어도 attached effect를 쉽게 만들 수 있지만,
  현재 프로젝트처럼 "방출 규칙은 manager가 가지고, particle은 별도 pool에서 관리"하는 구조와는 성격이 다르다.
- Unity `ParticleSystem.Emission.rateOverTime`은 이미 엔진이 누적/방출을 처리하므로,
  현재 accumulator 설계를 그대로 복사할 필요는 없다.
- 대신 "owner 파괴 시 정리", "scene unload 정리", "spec validation", "handle 기반 제어"는 그대로 옮길 가치가 있다.

### Unity 포팅 추천 방침
- 파티클 모양과 수명 변화는 Unity `ParticleSystem` 기본 모듈로 옮긴다.
- emitter 시작/중지, owner 추적, scene cleanup만 custom manager에서 담당한다.
- 지금 코드의 accumulator는 Unity 내장 emission으로 대체 가능하면 대체한다.

## 실사용 가이드

## 1. JSON preset 추가
`Data/Particle.json`

```json
[
  {
    "id_": 1002,
    "shape": 1,
    "shapeRadius": 10.0,
    "arcAngle": 360.0,
    "minLife": 1.5,
    "maxLife": 3.0,
    "minSpeed": 50.0,
    "maxSpeed": 100.0,
    "startScale": 1.0,
    "sizeEase": 5,
    "endScale": 3.0,
    "colorEase": 4,
    "startColor": 4288252270,
    "endColor": 1083658210,
    "airResistance": 1.0,
    "gravityScale": 0.0,
    "textureKey": ""
  }
]
```

`Data/ParticleEmitter.json`

```json
[
  {
    "id_": 2001,
    "particle_setting_id_": 1002,
    "emit_interval_sec_": 0.08,
    "emit_count_per_tick_": 2,
    "duration_sec_": 0.0
  },
  {
    "id_": 2002,
    "particle_setting_id_": 1001,
    "emit_interval_sec_": 0.03,
    "emit_count_per_tick_": 1,
    "duration_sec_": 0.35
  }
]
```

## 2. 월드 고정 emitter 재생

예: 폭발 지점에 잠깐 연기 지속 생성

```cpp
const auto* emitter_spec = _ParticleEmitterDataMgr.GetData(2002);
if (emitter_spec)
{
    const _Vector2 world_pos(640.f, 320.f);
    _ParticleService.PlayEmitterAt(*emitter_spec, world_pos);
}
```

적합한 상황:
- 폭발 잔연
- 지면 균열 먼지
- 함정 발동 지점

## 3. owner 부착 emitter 재생

예: 플레이어 발밑 오라, 화염, 독구름

```cpp
class StagePlayer;

void StartPlayerAura(StagePlayer* player)
{
    if (!player)
        return;

    const auto* emitter_spec = _ParticleEmitterDataMgr.GetData(2001);
    if (!emitter_spec)
        return;

    const _Vector2 local_offset(0.f, 12.f);
    _ParticleService.PlayEmitterAttached(*emitter_spec, player, local_offset);
}
```

적합한 상황:
- 캐릭터 오라
- 엔진 배기
- 무기 charging effect
- 이동형 독/불꽃 장판 중심점

## 4. handle을 저장했다가 수동 중지

```cpp
class MyActor : public GameObjectBase
{
public:
    void StartTrail()
    {
        const auto* emitter_spec = _ParticleEmitterDataMgr.GetData(2001);
        if (!emitter_spec)
            return;

        trail_handle_ = _ParticleService.PlayEmitterAttached(
            *emitter_spec,
            this,
            _Vector2(-6.f, 8.f));
    }

    void StopTrail()
    {
        if (trail_handle_ != 0)
        {
            _ParticleService.StopEmitter(trail_handle_);
            trail_handle_ = 0;
        }
    }

private:
    ParticleEmitterHandle trail_handle_ = 0;
};
```

## 5. owner 기준 여러 emitter 일괄 중지

```cpp
void StopAllActorEffects(GameObjectBase* actor)
{
    _ParticleService.StopAllEmittersByOwner(actor);
}
```

## 6. 직접 `Emit`를 계속 써도 되는 경우
아래 같은 경우는 지속 emitter보다 여전히 `Emit`가 더 자연스럽다.

- 피격 순간 스파크
- 폭발 한 번
- 발차기/타격 한 프레임 먼지
- UI나 짧은 one-shot 연출

예:

```cpp
const auto* setting = _ParticleDataMgr.GetData(1001);
if (setting)
{
    _ParticleService.Emit(*setting, _Vector2(400.f, 200.f), 8);
}
```

## 권장 사용 규칙
- 이벤트성 연출은 `Emit`
- 일정 시간 동안 계속 나오는 효과는 `PlayEmitterAt` 또는 `PlayEmitterAttached`
- owner 생명주기와 묶이는 효과는 가능하면 attached emitter로 처리
- scene 넘어가도 유지돼야 하는 효과가 필요해지기 전까지는 지금처럼 `ClearSceneState()` 정책 유지

## 다음 추천 작업
1. `ParticleEmitter.json`에 실제 gameplay preset 3개 추가
2. 플레이어 오라나 적 화염 효과 중 하나를 emitter 기반으로 전환
3. debug assist에 emitter/particle 카운터 표시
4. 필요 시 `PlayEmitterById()` 편의 함수 추가

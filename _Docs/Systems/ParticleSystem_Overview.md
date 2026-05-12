# Particle System Overview

## Purpose

This document summarizes the current particle system implementation, the classes that own each responsibility, the JSON data model, and the runtime lifecycle.

The particle system is a lightweight, data-driven visual effect system built on the existing custom WinAPI rendering path. It supports immediate burst particles and data-defined continuous emitters. Gameplay state decides when an effect should play; `ParticleService` owns particle runtime execution; rendering draws the resulting particles.

## Scope

This document covers:

- Particle data definitions and JSON loading
- Runtime particle pool management
- Burst emission
- Continuous emitter playback
- Scene lifecycle cleanup
- Current integration points and known limitations

This document does not define a new data schema or request runtime behavior changes.

## Source Files

| Area | Files |
| --- | --- |
| Runtime data model | `PlayGround/Project/EngineSystems/Render/ParticleData.h` |
| Runtime service | `PlayGround/Project/EngineSystems/Render/ParticleService.h`, `PlayGround/Project/EngineSystems/Render/ParticleService.cpp` |
| JSON managers | `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleDataManager.h`, `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleEmitterDataManager.h` |
| Data files | `PlayGround/Data/Particle.json`, `PlayGround/Data/ParticleEmitter.json` |
| Data loading | `PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp` |
| Scene update/render integration | `PlayGround/Project/Gameplay/Scenes/Scene.cpp`, `PlayGround/Project/Gameplay/Scenes/InGameScene.cpp` |
| Scene cleanup | `PlayGround/Project/Gameplay/GamePlaySystems/SceneManager.cpp` |
| Debug/sample usage | `PlayGround/Project/Gameplay/Scenes/WorkStationScene.cpp`, `PlayGround/Project/Gameplay/Actors/Stage/DashAbility.cpp` |

## High-Level Model

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

## Responsibility Boundaries

| Responsibility | Owner |
| --- | --- |
| Deciding when an effect should happen | Gameplay systems, scenes, abilities |
| Defining reusable particle behavior | `ParticleSetting` in `Particle.json` |
| Defining continuous emitter playback | `ParticleEmitterSpec` in `ParticleEmitter.json` |
| Loading JSON data by id | `ParticleDataManager`, `ParticleEmitterDataManager` |
| Owning active particles and emitters | `ParticleService` |
| Drawing particles | `ParticleService::Render` through `_DrawFunc` and `_GraphicSourceMgr` |
| Scene transition cleanup | `SceneManager::_CleanupCurrentScene` via `ParticleService::ClearSceneState` |

This separation is important: gameplay state should trigger visual effects, but particle playback should remain inside the particle runtime service.

## Data Model

### `EmitterShape`

`EmitterShape` defines the initial spawn shape:

- `Point`: a single point
- `Circle`: random offset inside a radius
- `Box`: declared in the enum, but not currently implemented in `ParticleService::Emit`

### `ParticleSetting`

`ParticleSetting` is the reusable particle recipe loaded from `Particle.json`.

Key fields:

- `id_`: unique data id used by `ParticleDataManager`
- `shape`: spawn shape enum value
- `shapeRadius`: radius used by circle emission
- `arcAngle`: random velocity angle spread around the current world +X direction
- `minLife`, `maxLife`: random lifetime range
- `minSpeed`, `maxSpeed`: random velocity speed range
- `startScale`, `endScale`: scale over lifetime
- `sizeEase`: easing mode for scale interpolation
- `startColor`, `endColor`: color over lifetime
- `colorEase`: easing mode for color interpolation
- `airResistance`: velocity damping applied each update
- `gravityScale`: declared in data, but not currently applied during update
- `textureKey`: texture path key; empty value uses a filled circle fallback

### `ParticleEmitterSpec`

`ParticleEmitterSpec` is the continuous emitter definition loaded from `ParticleEmitter.json`.

Key fields:

- `id_`: unique emitter id used by `ParticleEmitterDataManager`
- `particle_setting_id_`: referenced `ParticleSetting` id
- `emit_interval_sec_`: time between emission ticks; must be greater than `0`
- `emit_count_per_tick_`: number of particles emitted per tick; must be greater than `0`
- `duration_sec_`: emitter duration; `0` means infinite duration, negative values are invalid

### `Particle`

`Particle` is the runtime state of one active particle instance.

It stores:

- `position_`
- `velocity_`
- `life_time_`
- `max_life_time_`
- `is_active_`
- `currentScale`
- `currentColor`
- A copied `ParticleSetting` used for lifetime interpolation and movement damping

Each active particle owns a copy of its setting at spawn time. This allows later JSON reloads or setting changes to avoid mutating particles that are already alive.

## Runtime Service

### `ParticleService`

`ParticleService` is a singleton service that implements `IInitializable` and `IUpdatable`.

Public API:

- `Initialize(pool_size)`: allocates the particle pool and resets runtime state
- `Update(delta_time)`: updates emitters first, then active particles
- `Render(delta_time)`: draws active particles
- `Emit(setting, pos, count)`: emits an immediate burst using the setting's random ranges
- `EmitCustom(setting, pos, velocity, life_time_override, start_scale_override)`: emits one particle with explicit motion overrides
- `PlayEmitterAt(spec, world_pos)`: starts a continuous emitter at a fixed world position
- `PlayEmitterAttached(spec, owner, local_offset)`: starts a continuous emitter attached to an owner object
- `StopEmitter(handle)`: marks one emitter for stop
- `StopAllEmittersByOwner(owner)`: marks all emitters attached to an owner for stop
- `ClearSceneState()`: clears active emitters and active particles

### Particle Pool

The service uses a fixed-size pool:

- `particle_pool_`: storage for all particles
- `active_indices_`: active particle indices
- `free_indices_`: reusable particle indices

If `free_indices_` is empty, `_ActivateParticle` returns without spawning. This avoids allocation during runtime, but currently drops particles silently when the pool is exhausted.

### Active Emitters

Continuous emitters are stored in:

```cpp
std::unordered_map<ParticleEmitterHandle, ActiveEmitter> active_emitters_;
```

`ActiveEmitter` stores:

- The generated handle
- The emitter spec
- The resolved `ParticleSetting*`
- Optional owner pointer and destruction callback id
- Fixed world position or local owner offset
- Elapsed time and emit accumulator
- Pending stop state and stop reason

Emitter handles use `0` as invalid and increment from `1`.

## Lifecycle

### Initialization

`PlayGround::Initialize` loads game data through `GameDataLoader::LoadAll`, then initializes `_ParticleService` with a pool size of `1000`.

`ParticleService::Initialize`:

1. Calls `ClearSceneState`
2. Resizes the particle pool
3. Fills `free_indices_`
4. Resets the next emitter handle to `1`

### Data Loading

`GameDataLoader` loads:

- `Data/Particle.json` into `_ParticleDataMgr`
- `Data/ParticleEmitter.json` into `_ParticleEmitterDataMgr`

Both managers inherit `JsonDataManager<T>`, which stores data in an `unordered_map` keyed by `id_`.

`GameDataLoader::ReloadAll` clears active particle runtime state before reloading data. This keeps old active emitters and particles from referencing stale data after a JSON reload.

### Update Order

Scene update order places particle updates after object and UI late updates:

```text
Scene::LateUpdate
  object_manager_->LateUpdate
  ui_manager_->LateUpdate
  ParticleService::Update
```

`InGameScene` updates particles only when the game is not paused. As a result, in-game particles freeze while paused.

Inside `ParticleService::Update`:

1. `_UpdateEmitters(dt)` emits new particles from active emitters
2. Active particles lose lifetime
3. Expired particles return to `free_indices_`
4. Velocity is damped by `airResistance`
5. Position is advanced by velocity
6. Scale and color are interpolated by easing functions

### Render Order

Particles render after world objects and before UI:

```text
World objects
Particles
UI
```

The scene camera shake/global offset is active while particles render, so particles are treated as world-space visuals.

### Scene Cleanup

`SceneManager::_CleanupCurrentScene` calls `_ParticleService.ClearSceneState()` during normal scene transitions.

`ClearSceneState`:

1. Stops and detaches all active emitters
2. Clears active emitter storage
3. Clears active particle indices
4. Rebuilds the free index list
5. Resets per-particle runtime fields

During static shutdown, `SceneManager::~SceneManager` calls `Shutdown(false)` to avoid touching global particle service state when singleton destruction order may be unsafe.

## Emission Paths

### Immediate Burst

`ParticleService::Emit` creates one or more particles from a `ParticleSetting`.

Current behavior:

- Circle shape randomizes spawn position inside `shapeRadius`
- Point and Box currently use the input position directly
- Velocity angle is randomized within `arcAngle`, centered around world +X
- Speed and lifetime are randomized from the setting's ranges

### Custom Single Particle

`ParticleService::EmitCustom` emits one particle with explicit velocity and optional lifetime/start scale overrides.

Current usage:

- `DashAbility` uses this path to create charge particles that move inward toward an enemy's body center

### Continuous Emitter

`ParticleService::PlayEmitterAt` starts an emitter at a fixed world position.

`ParticleService::PlayEmitterAttached` starts an emitter attached to a `GameObjectBase`. Attached emitters:

- Reject null, pending-destruction, or transform-less owners
- Register an owner destruction callback
- Resolve world position from owner position, right/forward vectors, and local offset
- Mark themselves pending stop if the owner becomes invalid

`_ValidateEmitterSpec` rejects emitter specs when:

- `emit_interval_sec_ <= 0`
- `emit_count_per_tick_ == 0`
- `duration_sec_ < 0`
- The referenced particle setting does not exist

Invalid specs are logged with id, setting id, interval, count, and duration.

## Current Usage Points

### Debug InGame sample

`InGameScene` uses `F6` in non-paused gameplay to play `ParticleEmitter.json` id `2001` at the mouse world position.

### WorkStation sample scene

`WorkStationScene` provides debug-only sample playback:

- `F5`: reload all JSON data
- `1`: select `ParticleEmitter.json` id `2001`
- `2`: select `Particle.json` id `1001`
- Left click: play selected sample at the mouse cursor

### Dash charge effect

`DashAbility` loads `ParticleSetting` id `1004` and uses `EmitCustom` to spawn charge particles around the enemy body collider. The particles travel inward toward a target near the body center.

## Validation and Failure Behavior

### JSON Loading

The JSON conversion functions use required fields through `j.at(...)`. Missing fields or invalid JSON types will throw a `json::exception`, which `JsonDataManager::Load` catches and reports as a parse failure.

Duplicate ids are reported by debug message, but the later entry overwrites the earlier entry in the data table.

### Runtime Validation

Continuous emitters validate their spec before activation. Invalid emitters return handle `0` and log an error.

Attached emitters validate owner availability before activation. Invalid owners return handle `0` and log an error.

Immediate burst emission does not currently validate data ranges beyond clamping particle lifetime to at least `0.01` and start scale to at least `0`.

## Known Limitations

- `EmitterShape::Box` exists in the enum but is not implemented in `ParticleService::Emit`.
- `gravityScale` exists in `ParticleSetting` but is not applied in `ParticleService::Update`.
- `arcAngle` is centered on world +X and is not tied to an owner orientation or gameplay direction.
- Pool exhaustion silently drops new particles.
- `ParticleService::Render` asks `_GraphicSourceMgr` for the texture each particle render; any caching behavior depends on the graphic source manager.
- `ParticleEmitterSpec` stores a raw pointer to the resolved `ParticleSetting`. Runtime reload clears particle state before reloading data, which is important because the pointer would otherwise become stale.
- `ParticleSetting::textureKey` empty mode renders a filled circle with radius `currentScale * 5.0f`; textured mode uses texture dimensions multiplied by `currentScale`.

## Extension Notes

Future particle work should preserve these boundaries:

- Gameplay and AI decide when an effect is triggered.
- `ParticleService` executes particle playback and rendering.
- JSON data defines reusable particle and emitter behavior.
- Scene lifecycle owns cleanup timing, not individual gameplay actors.

Potential future additions should be treated as explicit schema or runtime behavior changes:

- Box emitter shape behavior
- Directional emission based on owner transform
- Gravity application
- Pool exhaustion logging or metrics
- Texture or material caching policy
- Data validation pass for particle JSON ranges

## Korean Summary

현재 파티클 시스템은 JSON 기반의 파티클 레시피와 런타임 서비스로 분리되어 있습니다.

`Particle.json`은 개별 파티클의 수명, 속도, 크기, 색상, 텍스처 같은 재사용 설정을 정의하고, `ParticleEmitter.json`은 특정 파티클 설정을 일정 간격으로 반복 생성하는 emitter 설정을 정의합니다. 런타임에서는 `ParticleService`가 고정 크기 풀을 관리하면서 burst 파티클과 지속 emitter를 업데이트하고 렌더링합니다.

파티클은 월드 오브젝트 렌더링 뒤, UI 렌더링 전에 그려집니다. 씬 전환 시 `SceneManager`가 `ParticleService::ClearSceneState`를 호출해 활성 emitter와 particle을 정리합니다. `InGameScene`에서는 일시정지 중 파티클 업데이트가 멈추고, `WorkStationScene`과 `DashAbility`에서 현재 사용 예시를 확인할 수 있습니다.

주의할 점은 `EmitterShape::Box`와 `gravityScale`은 데이터에는 존재하지만 현재 런타임 동작에는 반영되지 않는다는 점입니다. 또한 파티클 풀이 가득 차면 새 파티클은 조용히 드롭됩니다.

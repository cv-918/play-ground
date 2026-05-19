# Particle System Overview

## Purpose

This document summarizes the current particle system implementation, the classes that own each responsibility, the JSON data model, and the runtime lifecycle.

The particle system is a lightweight, data-driven visual effect system built on the existing custom WinAPI rendering path. It supports immediate burst particles and data-defined continuous emitters. Gameplay state decides when an effect should play; `ParticleService` owns particle runtime execution; rendering draws the resulting particles.

## Scope

This document covers:

- Particle data definitions and JSON loading
- Particle event set definitions and JSON loading
- Runtime particle pool management
- Burst emission
- Continuous emitter playback
- Multi-event set playback
- Scene lifecycle cleanup
- Current integration points and known limitations

This document does not define a new data schema or request runtime behavior changes.

## Source Files

| Area | Files |
| --- | --- |
| Runtime data model | `PlayGround/Project/EngineSystems/Render/ParticleData.h`, `PlayGround/Project/EngineSystems/Render/ParticleEventSetData.h` |
| Runtime service | `PlayGround/Project/EngineSystems/Render/ParticleService.h`, `PlayGround/Project/EngineSystems/Render/ParticleService.cpp`, `PlayGround/Project/EngineSystems/Render/ParticleEventSetPlayer.h`, `PlayGround/Project/EngineSystems/Render/ParticleEventSetPlayer.cpp` |
| JSON managers | `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleDataManager.h`, `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleEmitterDataManager.h`, `PlayGround/Project/Gameplay/GamePlaySystems/Json/ParticleEventSetDataManager.h` |
| Data files | `PlayGround/Data/Particle.json`, `PlayGround/Data/ParticleEmitter.json`, `PlayGround/Data/ParticleEventSet.json` |
| Data loading | `PlayGround/Project/Gameplay/GamePlaySystems/GameDataLoader.cpp` |
| Scene update/render integration | `PlayGround/Project/Gameplay/Scenes/Scene.cpp`, `PlayGround/Project/Gameplay/Scenes/InGameScene.cpp` |
| Scene cleanup | `PlayGround/Project/Gameplay/GamePlaySystems/SceneManager.cpp` |
| Debug/editor usage | `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.cpp`, `PlayGround/Project/EngineSystems/Debug/DWE_Controls.*`, `PlayGround/Project/Gameplay/Actors/Stage/DashAbility.cpp` |

## High-Level Model

```text
JSON data
  Particle.json
    -> ParticleSetting
    -> ParticleDataManager

  ParticleEmitter.json
    -> ParticleEmitterSpec
    -> ParticleEmitterDataManager

  ParticleEventSet.json
    -> ParticleEventSet
    -> ParticleEventSetDataManager

Runtime
  Gameplay code chooses when to play an effect
    -> ParticleService::Emit / EmitCustom / PlayEmitterAt / PlayEmitterAttached
    -> ParticleEventSetPlayer::Play for multi-event effects
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
| Grouping multiple particle events | `ParticleEventSet` in `ParticleEventSet.json` |
| Loading JSON data by id | `ParticleDataManager`, `ParticleEmitterDataManager`, `ParticleEventSetDataManager` |
| Owning active particles and emitters | `ParticleService` |
| Scheduling event-set playback | `ParticleEventSetPlayer` |
| Drawing particles | `ParticleService::Render` through `_DrawFunc` and `_GraphicSourceMgr` |
| Scene transition cleanup | `SceneManager::_CleanupCurrentScene` via `ParticleService::ClearSceneState` |

This separation is important: gameplay state should trigger visual effects, but particle playback should remain inside the particle runtime service.

## Data Model

### `EmitterShape`

`EmitterShape` defines the initial spawn shape:

- `Point`: a single point
- `Circle`: random offset inside a radius
- `Box`: random offset inside a square centered on the emission position

### `ParticleSetting`

`ParticleSetting` is the reusable particle recipe loaded from `Particle.json`.

Key fields:

- `id_`: unique data id used by `ParticleDataManager`
- `shape`: spawn shape enum value
- `shapeRadius`: Circle radius, or Box half extent
- `arcAngle`: random velocity angle spread around the explicit emission direction passed to `ParticleService`; the default direction is world +X
- `minLife`, `maxLife`: random lifetime range
- `minSpeed`, `maxSpeed`: random velocity speed range
- `startScale`, `endScale`: scale over lifetime
- `sizeEase`: easing mode for scale interpolation
- `startColor`, `endColor`: color over lifetime
- `colorEase`: easing mode for color interpolation
- `airResistance`: velocity damping applied each update
- `gravityScale`: vertical acceleration multiplier applied during particle update
- `textureKey`: texture path key; empty value uses a filled circle fallback

### `ParticleEmitterSpec`

`ParticleEmitterSpec` is the continuous emitter definition loaded from `ParticleEmitter.json`.

Key fields:

- `id_`: unique emitter id used by `ParticleEmitterDataManager`
- `particle_setting_id_`: referenced `ParticleSetting` id
- `emit_interval_sec_`: time between emission ticks; must be greater than `0`
- `emit_count_per_tick_`: number of particles emitted per tick; must be greater than `0`
- `duration_sec_`: emitter duration; `0` means infinite duration, negative values are invalid

### `ParticleEventSet`

`ParticleEventSet` is a reusable group of particle events loaded from `ParticleEventSet.json`.

Key fields:

- `id_`: unique event set id used by `ParticleEventSetDataManager`
- `name_`: human-readable set label
- `events_`: ordered list of `ParticleEventSpec` entries

### `ParticleEventSpec`

`ParticleEventSpec` defines one event inside a set.

Key fields:

- `id_`: event-local id for editing and debugging
- `name_`: human-readable event label
- `playback_type_`: `Burst` or `Emitter`
- `delay_sec_`: delay from set playback start
- `local_offset_x_`, `local_offset_y_`: offset from the set playback origin
- `direction_mode_`: `World` or `PlayContext`
- `base_direction_deg_`: authored event direction in degrees
- `direction_influence_`: `0..1` multiplier for the play context direction when `direction_mode_` is `PlayContext`
- `burst_count_`: particle count for burst playback
- `particle_setting_`: inline `ParticleSetting` copy used by this event
- `emitter_spec_`: emitter timing/count data used when `playback_type_` is `Emitter`

The event set keeps an inline `ParticleSetting` per event so station edits can be previewed and saved without mutating global `Particle.json` entries. The `ParticleStationScene` DebugAssistant combo box can copy an existing `Particle.json` setting into the selected event as a starting point.

Event direction is explicit. `base_direction_deg_` is always applied. `PlayContext` mode additionally adds `play_context.direction_deg_ * direction_influence_` when the caller provides a direction. No event-set playback path infers direction from an owner object.

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
- `Emit(setting, pos, count, direction_radian)`: emits an immediate burst using the setting's random ranges
- `EmitCustom(setting, pos, velocity, life_time_override, start_scale_override)`: emits one particle with explicit motion overrides
- `PlayEmitterAt(spec, world_pos, direction_radian)`: starts a continuous emitter at a fixed world position
- `PlayEmitterAt(spec, setting, world_pos, direction_radian)`: starts a continuous emitter with an inline setting copy
- `PlayEmitterAttached(spec, owner, local_offset, direction_radian)`: starts a continuous emitter attached to an owner object
- `StopEmitter(handle)`: marks one emitter for stop
- `StopAllEmittersByOwner(owner)`: marks all emitters attached to an owner for stop
- `ClearSceneState()`: clears active emitters and active particles

### Particle Pool

The service uses a fixed-size pool:

- `particle_pool_`: storage for all particles
- `active_indices_`: active particle indices
- `free_indices_`: reusable particle indices

If `free_indices_` is empty, `_ActivateParticle` drops the new particle instead of allocating. This keeps runtime memory fixed. The service records `dropped_this_frame_`, `dropped_total_`, `active_count_`, `peak_active_count_`, and `pool_size_`, and emits a throttled warning while exhaustion continues.

### Active Emitters

Continuous emitters are stored in:

```cpp
std::unordered_map<ParticleEmitterHandle, ActiveEmitter> active_emitters_;
```

`ActiveEmitter` stores:

- The generated handle
- The emitter spec
- A copied resolved `ParticleSetting`
- Optional owner pointer and destruction callback id
- Fixed world position or local owner offset
- Explicit emission direction in radians
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
- `Data/ParticleEventSet.json` into `_ParticleEventSetDataMgr`

Both managers inherit `JsonDataManager<T>`, which stores data in an `unordered_map` keyed by `id_`.

`GameDataLoader::ReloadAll` clears active particle runtime state before reloading data. Active particles and emitters copy the resolved particle setting at activation time, and clearing before reload keeps runtime state predictable for station preview and scene transitions.

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
- Box shape randomizes spawn position inside a square using `shapeRadius` as half extent
- Point uses the input position directly
- Velocity angle is randomized within `arcAngle`, centered around the explicit direction argument. Existing callers that omit the argument use world +X.
- Speed and lifetime are randomized from the setting's ranges

### Custom Single Particle

`ParticleService::EmitCustom` emits one particle with explicit velocity and optional lifetime/start scale overrides.

Current usage:

- `DashAbility` uses this path to create charge particles that move inward toward an enemy's body center

### Continuous Emitter

`ParticleService::PlayEmitterAt` starts an emitter at a fixed world position with an explicit emission direction.

The overload `PlayEmitterAt(spec, setting, world_pos)` starts an emitter from an inline setting. `ParticleEventSetPlayer` uses this path so event sets do not require every edited station event to be written back to `Particle.json`.

`ParticleService::PlayEmitterAttached` starts an emitter attached to a `GameObjectBase`. Attached emitters:

- Reject null, pending-destruction, or transform-less owners
- Register an owner destruction callback
- Resolve world position from owner position, right/forward vectors, and local offset
- Keep emission direction as the explicit direction passed at creation time
- Mark themselves pending stop if the owner becomes invalid

`_ValidateEmitterSpec` rejects emitter specs when:

- `emit_interval_sec_ <= 0`
- `emit_count_per_tick_ == 0`
- `duration_sec_ < 0`
- The referenced particle setting does not exist

Invalid specs are logged with id, setting id, interval, count, and duration.

### Event Set Playback

`ParticleEventSetPlayer` plays a copied `ParticleEventSet` with a `ParticleEventSetPlayContext`. It tracks elapsed time per active playback, fires each event after its `delay_sec_`, resolves event direction from `base_direction_deg_` plus optional play-context influence, and delegates actual burst/emitter execution to `ParticleService`.

For burst events, the player calls `ParticleService::Emit` with the event's inline setting, `burst_count_`, and resolved direction.

For emitter events, the player calls `ParticleService::PlayEmitterAt(spec, setting, world_pos, direction)` and stores returned emitter handles so `StopAll` can stop them explicitly. Finite emitter playbacks are retired after their duration and max particle lifetime. Infinite emitter playbacks remain active until stopped.

## Current Usage Points

### Debug InGame sample

`InGameScene` uses `F6` in non-paused gameplay to play `ParticleEmitter.json` id `2001` at the mouse world position.

### ParticleStation editor scene

`ParticleStationScene` replaces the old `WorkStationScene` debug sample scene. It provides a DebugAssistant-based editor for `ParticleEventSet.json`.

The `ParticleStation / EventSet` window owns set-level workflow:

- Create a new set, load an existing set, reload JSON data, and save current event-set data.
- Rename the current set.
- Select, add, and remove ordered particle events.
- Preview the current set at the mouse cursor or screen center.
- Adjust station-only preview direction.
- Read pool active/peak/drop counters and run a station-only pool stress preview.
- Read the selected event's resolved preview direction.

The `ParticleStation / Event` window owns selected-event editing:

- Rename the event.
- Change playback type, source `Particle.json` setting, texture, shape, size/color easing, and inline colors.
- Adjust direction mode, base direction, direction influence, delay, offset, burst count, lifetime, speed, scale, air resistance, gravity scale, and emitter playback values.

Keyboard shortcuts are intentionally limited to scene-level actions:

- `F5`: reload all JSON data
- `F8`: preview current set at the mouse cursor
- `Space`: preview current set at the screen center
- `F9`: save current event set data
- `Esc`: return to `IntroScene`

Station preview can enable or disable individual events without writing that state to `ParticleEventSet.json`. Disabled events are skipped only for the current station preview session.

The scene also draws a center-screen direction guide. The yellow guide shows the current station `Preview Dir`; the light-blue guide shows the selected event's resolved direction after base direction and influence are applied. These guides make direction and influence changes visible even when the particle texture or `arcAngle` would otherwise make the effect hard to read.

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

- `EmitterShape::Point` intentionally ignores `shapeRadius` because it has no spawn spread.
- Pool exhaustion still drops new particles by policy; the drop is observable through stats and throttled warning logs.
- `ParticleService::Render` asks `_GraphicSourceMgr` for the texture each particle render; any caching behavior depends on the graphic source manager.
- `ParticleEventSet` currently stores inline particle settings per event; edits in `ParticleStationScene` do not automatically update `Particle.json`.
- `ParticleSetting::textureKey` empty mode renders a filled circle with radius `currentScale * 5.0f`; textured mode uses texture dimensions multiplied by `currentScale`.

## Extension Notes

Future particle work should preserve these boundaries:

- Gameplay and AI decide when an effect is triggered.
- `ParticleService` executes particle playback and rendering.
- `ParticleEventSetPlayer` schedules grouped particle events and delegates playback to `ParticleService`.
- JSON data defines reusable particle, emitter, and event-set behavior.
- Scene lifecycle owns cleanup timing, not individual gameplay actors.

Potential future additions should be treated as explicit schema or runtime behavior changes:

- Non-square Box emitter dimensions if rectangular emission becomes necessary
- Data validation rules for direction fields if stricter authoring constraints become necessary
- Configurable pool exhaustion policy if a future effect class should reserve particles or preempt older particles
- Texture or material caching policy
- Data validation pass for particle JSON ranges

## Korean Summary

현재 파티클 시스템은 JSON 기반의 파티클 레시피와 런타임 서비스로 분리되어 있습니다.

`Particle.json`은 개별 파티클의 수명, 속도, 크기, 색상, 텍스처 같은 재사용 설정을 정의하고, `ParticleEmitter.json`은 특정 파티클 설정을 일정 간격으로 반복 생성하는 emitter 설정을 정의합니다. 런타임에서는 `ParticleService`가 고정 크기 풀을 관리하면서 burst 파티클과 지속 emitter를 업데이트하고 렌더링합니다.

파티클은 월드 오브젝트 렌더링 뒤, UI 렌더링 전에 그려집니다. 씬 전환 시 `SceneManager`가 `ParticleService::ClearSceneState`를 호출해 활성 emitter와 particle을 정리합니다. `InGameScene`에서는 일시정지 중 파티클 업데이트가 멈추고, `ParticleStationScene`과 `DashAbility`에서 현재 사용 예시를 확인할 수 있습니다.

`EmitterShape::Box`는 `shapeRadius`를 half extent로 사용하는 정사각형 생성 범위로 처리되고, `gravityScale`은 수직 가속도 배율로 적용됩니다. 이벤트 세트 방향은 명시적 `PlayContext` 영향도로 계산되며, 파티클 풀이 가득 차면 새 파티클은 고정 풀 정책에 따라 드롭되고 통계와 제한된 경고 로그로 관측됩니다.

# PlayGround 프로젝트 아키텍처 개요

## 목적

이 문서는 `PlayGround/` 프로젝트의 현재 아키텍처를 저장소 수준에서 요약한다.

목표는 개별 기능 구현 세부사항보다, 프로젝트가 어떤 층위로 나뉘고 어떤 책임 경계를 가지고 있으며, 앞으로 변경할 때 어떤 구조를 보존해야 하는지 파악할 수 있게 하는 것이다.

## 프로젝트 성격

`PlayGround`는 Windows C++ 기반의 2D 게임 프로토타입이다.

주요 특징:

- WinAPI 기반 애플리케이션
- 커스텀 렌더링 경로
- `GameObjectBase` / `ComponentBase` 기반 게임 오브젝트 구조
- Singleton 기반 전역 runtime service 다수
- JSON 기반 게임플레이 데이터 로딩
- 씬 단위 runtime lifecycle
- 스테이지 전투, 스킬, 적 AI, 타운 NPC/대화, 아웃게임 성장 UI가 함께 존재하는 프로토타입

## 상위 폴더 구조

```text
PlayGround/
  Data/
  Project/
    App/
    Core/
    EngineSystems/
    Framework/
    Gameplay/
```

## 아키텍처 레이어

### App

대표 파일:

- `PlayGround/Project/App/PlayGround.h`
- `PlayGround/Project/App/PlayGround.cpp`

역할:

- 게임 애플리케이션의 최상위 lifecycle 진입점
- 주요 singleton/service 초기화
- JSON 데이터 로딩 호출
- collision layer 설정
- window message를 input system으로 전달
- frame update/render 루프 조립

현재 `PlayGround::Initialize`의 핵심 순서:

1. Timer, Random, debug assistant 초기화
2. `RenderChain` 초기화
3. `CollisionManager` singleton 생성 보장
4. `SceneManager` 초기화
5. `InputManager` 참조 확보
6. debug self-test 실행
7. `GameDataLoader::LoadAll`로 JSON 데이터 로드
8. collision layer 관계 설정
9. `ParticleService` 초기화
10. video mode 적용

### Core

대표 영역:

- `Core/Base/`
- `Core/Interface/`
- `Core/Math/`

역할:

- 프로젝트 공통 타입, define, utility, drawing helper
- singleton, update, initialize, destroy callback 같은 공통 interface
- `Vector2`, `Vector3`, geometry, random, easing/math helper
- WinAPI rendering helper 함수의 공통 wrapper

중요 interface:

- `ISingleton<T>`: function-local static singleton 제공
- `IInitializable`: 초기화 완료 상태 추적
- `IUpdatable`: `Update`, `LateUpdate`, `Render`, enable/visible 상태 제공
- `IDestroyable`: delayed destruction과 destruction callback 제공
- `IIdentifiable`: ID/name 관리
- `ICollidable`, `IDamagable`, `IInteractable`: interaction handler 계열

### EngineSystems

대표 영역:

- `EngineSystems/Input/`
- `EngineSystems/Timer/`
- `EngineSystems/Render/`
- `EngineSystems/Physics/`
- `EngineSystems/Json/`

역할:

- 게임플레이보다 아래에 있는 엔진 성격의 시스템
- 입력, 시간, 화면/렌더, 카메라, 충돌, JSON table loading
- `Gameplay/`의 구체 콘텐츠를 직접 소유하지 않는 기반 서비스

대표 singleton/service:

- `InputManager`
- `Timer`
- `RenderChain`
- `ScreenSystem`
- `GraphicResourceManager`
- `CameraManager`
- `ParticleService`
- `CollisionManager`

### Gameplay

대표 영역:

- `Gameplay/Actors/`
- `Gameplay/Components/`
- `Gameplay/GamePlaySystems/`
- `Gameplay/Scenes/`
- `Gameplay/UI/`
- `Gameplay/Animation/`
- `Gameplay/World/`
- `Gameplay/Common/`

역할:

- 실제 게임 규칙, actor, scene, UI, skill, stage, dialogue 구현
- JSON data manager와 runtime manager가 대부분 위치
- `GameObjectBase`와 component 구조를 사용해 actor behavior 구성

## 핵심 Runtime 구조

```text
PlayGround
  -> SceneManager
    -> Scene
      -> ObjectManager
        -> GameObjectBase
          -> ComponentBase
      -> UIManager
        -> UIBase / WidgetBase

EngineSystems
  -> RenderChain / DrawFunctions / GraphicResourceManager
  -> InputManager
  -> CollisionManager
  -> CameraManager
  -> ParticleService

GameplaySystems
  -> GameDataLoader
  -> StageManager
  -> SkillManager
  -> UserProfile
  -> RunState
  -> DialogueSystem
```

## GameObject / Component 모델

### `GameObjectBase`

대표 파일:

- `PlayGround/Project/Gameplay/Actors/GameObjectBase.h`
- `PlayGround/Project/Gameplay/Actors/GameObjectBase.cpp`

역할:

- 모든 runtime actor의 기본 클래스
- `IInitializable`, `IUpdatable`, `IIdentifiable`, `IDestroyable` 구현 기반
- component 목록 소유
- handler 목록 소유
- 기본 `Transform` component 보유
- update, late update, render, debug render를 component/actor 단위로 위임

중요 구조:

- `components_`: actor에 붙은 component 저장
- `handlers_`: collision, damage, interaction 같은 handler system별 등록 목록
- `handler_mask_`: handler 등록 여부 빠른 확인용 bitmask
- `transform_`: 모든 actor가 기본적으로 보유하는 공간 정보

### `ComponentBase`

대표 파일:

- `PlayGround/Project/Gameplay/Components/ComponentBase.h`

역할:

- actor에 조립되는 기능 단위
- `ComponentType`으로 식별
- owner `GameObjectBase*` 참조
- update/render 가능한 작은 책임 단위

대표 component:

- `Transform`
- `Status`
- `Movement`
- `PlayerMovement`
- `NonPlayableMovement`
- `Combat`
- `GameplayEffectController`
- `SpriteRendererComponent`
- `SpriteAnimatorComponent`
- collider 계열
- `TownInteraction`

## Manager / Service 구분

현재 프로젝트는 manager와 service가 모두 singleton 또는 scene-owned object로 존재한다.

### 전역 singleton 성격

- `SceneManager`
- `StageManager`
- `SkillManager`
- `UserProfile`
- `RunState`
- `GameState`
- `InputManager`
- `CollisionManager`
- `CameraManager`
- `ParticleService`
- `GraphicResourceManager`
- `ScreenSystem`

전역 singleton은 편의성이 높지만, lifecycle과 참조 순서가 중요하다. 특히 scene cleanup, destruction callback, singleton destruction order를 건드리는 작업은 주의해야 한다.

### Scene-owned 성격

- `Scene`
- `ObjectManager`
- `UIManager`
- scene 내부 view/widget
- scene 내부 actor

Scene-owned 객체는 씬 전환 시 삭제되며, delayed destruction과 cleanup 순서가 중요하다.

## Scene Architecture

대표 파일:

- `Gameplay/Scenes/Scene.h`
- `Gameplay/Scenes/Scene.cpp`
- `Gameplay/GamePlaySystems/SceneManager.h`
- `Gameplay/GamePlaySystems/SceneManager.cpp`

현재 scene 종류:

- `IntroScene`
- `LoadingScene`
- `OutGameScene`
- `InGameScene`
- `WorkStationScene`

`SceneManager` 역할:

- 다음 scene 요청 관리
- fade out/in transition 관리
- 현재 scene cleanup
- 다음 scene 생성과 `OnEnter` 호출
- transition overlay 렌더링

`Scene` 기본 역할:

- `ObjectManager`, `UIManager` 생성 및 소유
- object update -> UI update
- object late update -> UI late update -> particle update
- world render -> particle render -> UI render
- scene cleanup 시 UI와 object 정리

## Data-Driven Architecture

대표 파일:

- `GamePlaySystems/GameDataLoader.cpp`
- `EngineSystems/Json/JsonDataManager.h`
- `Gameplay/GamePlaySystems/Json/*DataManager.h`
- `PlayGround/Data/*.json`

현재 데이터 로딩 구조:

```text
GameDataLoader::LoadAll
  -> PlayableCharacterDataManager
  -> DialogueJsonDataManager
  -> SkillJsonDataManager
  -> SkillDefinitionDataManager
  -> ParticleDataManager
  -> ParticleEmitterDataManager
  -> EnemyDataManager
  -> AttributeNodeDataManager
  -> StageJsonDataManager
  -> UserDataManager
  -> TownNpcPlacementDataManager
```

각 data manager는 대체로 `JsonDataManager<T>` 기반이며, `id_`를 key로 하는 table을 제공한다.

중요 경계:

- JSON은 source data다.
- DataManager는 로딩과 ID lookup을 담당한다.
- Runtime manager는 로드된 데이터를 읽어 actor, UI, skill, stage runtime behavior를 만든다.
- Schema 변경은 gameplay behavior 변경과 연결될 수 있으므로 별도 승인/문서화가 필요하다.

## Rendering Architecture

현재 렌더링은 WinAPI/WIC/GDI 계열 헤더를 포함하는 커스텀 경로다.

대표 구성:

- `RenderChain`: frame clear/present
- `DrawFunctions`: shape, text, texture drawing helper
- `GraphicResourceManager`: texture/sprite resource 관리
- `ScreenSystem`: resolution/video mode 적용
- `CameraManager`: world offset, camera shake, follow target
- `ParticleService`: world particle render

기본 render flow:

```text
PlayGround::Render
  RenderChain::Clear
  SceneManager::Render
    Scene::Render
      world object render
      particle render
      UI render
    transition overlay
    RenderAboveTransitionOverlay
  debug assistant render
  RenderChain::Present
```

렌더링 정책상 GDI+ 같은 별도 렌더링 체계 도입은 현재 구조의 주요 정책 변경에 해당한다.

## Lifecycle Safety Points

주의해야 할 lifecycle 지점:

- `PlayGround::Initialize`의 초기화 순서
- `GameDataLoader::LoadAll` 실패 시 전체 초기화 실패
- `SceneManager::_CleanupCurrentScene`
- `Scene::CleanUp`
- `ObjectManager`/`UIManager`의 delayed creation/cleanup
- `IDestroyable` destruction callback 등록/해제
- owner 기반 객체가 owner destruction callback을 보유하는 경우
- scene 전환 중 particle/collision/input/global service 접근

현재 코드에는 static shutdown 시 `SceneManager::~SceneManager`가 `Shutdown(false)`를 호출해 particle service 접근을 피하는 방어가 있다. 이는 singleton destruction order가 보장되지 않는 상황을 고려한 구조다.

## 현재 구조의 강점

- Data-driven gameplay 확장 기반이 이미 있다.
- Scene, object, UI, component의 주요 lifecycle 구분이 있다.
- Gameplay effect, skill graph, enemy ability처럼 decision과 execution을 분리하려는 구조가 보인다.
- `IDestroyable` callback을 통해 owner destruction 추적이 가능하다.
- WorkStation scene을 통한 debug/sample 재생 경로가 존재한다.

## 현재 구조의 주의점

- 여러 singleton이 직접 연결되어 있어 initialization/shutdown 순서가 중요하다.
- `CommonGamePlayType.h`가 많은 gameplay data type을 포함해 비대해지고 있다.
- 일부 actor/manager가 여러 책임을 동시에 가질 위험이 있다.
- JSON schema와 runtime behavior가 강하게 연결되어 있으므로 data field 변경은 영향 범위가 크다.
- 일부 source comment와 JSON 텍스트는 로컬 표시 환경에서 깨진 문자로 보인다. 문서/데이터 정비 시 인코딩 정책 확인이 필요하다.

## 유지해야 할 방향

향후 변경 시 권장 방향:

- Gameplay state와 animation playback을 분리한다.
- Runtime execution은 service/manager/component에 두고, JSON은 source data로 유지한다.
- Scene lifecycle에서 부분 실패가 전체 초기화를 불필요하게 중단하지 않도록 한다.
- 큰 manager에 조건 분기를 계속 추가하기보다, 필요한 경우 focused component/service/ability로 분리한다.
- Data schema 변경은 필드 의미, 기본값, invalid behavior, migration 필요성을 함께 문서화한다.
- 새 시스템은 `GameDesign`, `Systems`, `Architecture` 중 어디에 속하는지 먼저 정리하고 추가한다.

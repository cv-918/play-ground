# PlayGround 런타임 시스템 개요

## 목적

이 문서는 `PlayGround/` 프로젝트의 주요 런타임 시스템을 시스템 단위로 정리한다.

`GameDesign` 문서가 플레이 경험과 콘텐츠 의미를 설명한다면, 이 문서는 각 시스템이 런타임에서 어떤 책임을 갖고 어떤 파일에 구현되어 있는지 파악하기 위한 기준 문서다.

## 시스템 목록

| 시스템 | 주요 책임 | 대표 파일 |
| --- | --- | --- |
| App Lifecycle | 초기화, update/render loop, window message routing | `App/PlayGround.cpp` |
| Scene System | scene 전환, fade transition, scene cleanup | `SceneManager`, `Scene` |
| Object System | actor 생성, update, render, delayed cleanup | `ObjectManager`, `GameObjectBase` |
| Component System | actor 기능 조립 | `ComponentBase`, `Components/*` |
| UI System | UI 생성, update, render, cleanup | `UIManager`, `UI/*` |
| Data Loading | JSON 로딩과 table lookup | `GameDataLoader`, `JsonDataManager`, `Json/*DataManager` |
| Stage System | stage state, spawn, clear/result, rewards | `StageManager` |
| Skill System | skill equip/use/cooldown, skill graph 실행 | `SkillManager`, `SkillBase`, `Skills/*` |
| Gameplay Effect System | 상태 태그, modifier, damage payload | `GameplayEffectController`, `GameplayEffectTypes.h` |
| Enemy Ability System | enemy action state와 공격 ability | `Enemy`, `EnemyAbilitySet`, `IEnemyAbility` |
| Collision System | collision layer, collider registration, collision callbacks | `CollisionManager`, `Collider` |
| Movement System | player/non-player movement, dash, control locks | `Movement`, `PlayerMovement`, `NonPlayableMovement` |
| Dialogue System | dialogue session, line state, choices, events | `DialogueSystem`, `DialogueRunner` |
| Town Interaction | NPC placement, interaction indicator, interaction logic | `TownNpc`, `TownInteraction`, `TownNpcPlacementSpawner` |
| Particle System | particle pool, burst, emitter, render | `ParticleService` |
| Rendering System | texture/shape/text drawing, render chain, screen mode | `RenderChain`, `DrawFunctions`, `GraphicResourceManager` |
| Input System | keyboard/mouse/game input mapping | `InputManager` |
| Profile/Run State | persistent-like profile and current run state | `UserProfile`, `RunState`, `GameState` |

## App Lifecycle System

대표 파일:

- `PlayGround/Project/App/PlayGround.cpp`

책임:

- 주요 singleton 초기화
- 게임 데이터 로드
- collision layer 관계 설정
- frame update/render 호출
- WinAPI message를 input manager로 전달

중요 흐름:

```text
Initialize
  -> engine services
  -> scene manager
  -> input self-test
  -> GameDataLoader::LoadAll
  -> collision layer setup
  -> ParticleService::Initialize
  -> video mode apply

Update
  -> SceneManager::Update
  -> SceneManager::LateUpdate

Render
  -> RenderChain::Clear
  -> SceneManager::Render
  -> debug assistant render
  -> RenderChain::Present
```

## Scene System

대표 파일:

- `Gameplay/GamePlaySystems/SceneManager.h`
- `Gameplay/GamePlaySystems/SceneManager.cpp`
- `Gameplay/Scenes/Scene.h`
- `Gameplay/Scenes/Scene.cpp`

책임:

- scene 변경 요청 수신
- fade out/in transition 처리
- scene 생성과 초기화
- `OnEnter`, `OnExit` 호출
- scene cleanup 중 particle state 정리

현재 scene:

- `IntroScene`
- `LoadingScene`
- `OutGameScene`
- `InGameScene`
- `WorkStationScene`

주의점:

- scene cleanup 중 actor/UI/particle/collision callback이 얽힐 수 있다.
- `SceneManager` destructor는 static shutdown에서 particle service 접근을 피하기 위해 `Shutdown(false)`를 사용한다.
- scene lifecycle 함수에서 partial initialization 후 broad early return을 추가할 때는 core scene state가 남지 않는지 확인해야 한다.

## Object / Component System

대표 파일:

- `Gameplay/Actors/GameObjectBase.h`
- `Gameplay/Components/ComponentBase.h`
- `Gameplay/GamePlaySystems/ObjectManager.h`

책임:

- actor 생성과 update/render
- component 조립
- handler system 등록
- delayed destruction
- transform 기반 위치/방향 관리

`ObjectManager` 특징:

- update 중 생성된 object는 `new_game_objects_`에 모은 뒤 병합한다.
- cleanup 시 삭제 예약 object를 한 번에 정리한다.
- projectile spawn 같은 scene-level factory 역할 일부도 갖고 있다.

`GameObjectBase` 특징:

- 모든 actor가 `Transform`을 기본적으로 가진다.
- component list와 handler list를 함께 소유한다.
- destruction callback을 통해 외부 시스템이 owner destruction을 감지할 수 있다.

## UI System

대표 파일:

- `Gameplay/GamePlaySystems/UIManager.h`
- `Gameplay/UI/`

책임:

- UI 생성
- update/late update/render
- delayed cleanup
- view/widget lifecycle

현재 UI 영역:

- Intro UI
- OutGame skill view / option view
- InGame play/pause/result view
- HP bar
- floating text
- town NPC interaction indicator
- skill slot and tooltip widgets
- dialogue window

주의점:

- UI가 actor destruction callback을 추적하는 경우 callback 해제가 중요하다.
- scene cleanup에서 UI를 먼저 cleanup하는 구조는 actor와 연결된 UI dangling reference를 줄이기 위한 의도로 보인다.

## Data Loading System

대표 파일:

- `Gameplay/GamePlaySystems/GameDataLoader.cpp`
- `EngineSystems/Json/JsonDataManager.h`
- `Gameplay/GamePlaySystems/Json/*DataManager.h`

책임:

- JSON 파일을 runtime table로 로딩
- `id_` 기반 lookup 제공
- data reload 시 particle runtime state 정리

현재 load 대상:

- playable character
- dialogue
- skill legacy table
- skill definition
- particle
- particle emitter
- enemy
- attribute node
- stage/spawn pool
- user data
- town NPC placement

주의점:

- `JsonDataManager<T>`는 duplicate id 발견 시 debug message를 띄우고 뒤 entry로 overwrite한다.
- `from_json`에서 `j.at(...)`을 사용하므로 missing field는 parse failure가 된다.
- JSON schema 변경은 runtime loader, manager, UI, gameplay system에 영향이 크다.

## Stage System

대표 파일:

- `Gameplay/GamePlaySystems/StageManager.h`
- `Gameplay/GamePlaySystems/StageManager.cpp`
- `Gameplay/Scenes/InGameScene.cpp`

책임:

- stage state machine
- stage elapsed time/duration
- enemy spawn timer
- nav mesh / generation area
- player death 처리
- enemy death reward 처리
- run session result 생성/반영
- next stage progression 처리

상태:

```text
Enter -> Ready -> Play -> Clear/Result/Exit
Pause는 Play 중 별도 흐름으로 사용
```

주의점:

- `StageManager`는 `InGameScene`, `ObjectManager`, `UIManager` 포인터를 잡는다.
- stage transition과 scene transition이 동시에 얽히면 cleanup 순서를 조심해야 한다.
- spawn, clear, result, reward가 한 manager에 모여 있어 향후 기능 추가 시 책임이 커질 수 있다.

## Skill System

대표 파일:

- `Gameplay/GamePlaySystems/SkillManager.h`
- `Gameplay/GamePlaySystems/Skills/SkillBase.h`
- `Gameplay/GamePlaySystems/Skills/SkillRuntimeTypes.h`
- `Gameplay/GamePlaySystems/Skills/SkillExecutionActors.*`
- `Gameplay/GamePlaySystems/Json/SkillDefinitionDataManager.h`

책임:

- 스킬 장착/해제
- slot별 skill instance 관리
- cooldown/cast/runtime phase 관리
- skill graph node 실행
- projectile/area/orbiting execution entity 생성
- gameplay effect 적용

핵심 모델:

```text
SkillDefinition
  -> graph entry points
  -> node table
  -> execution entity spec
  -> gameplay effect spec

SkillBase
  -> runtime phase
  -> graph node execution
  -> cooldown/cast handling

SkillManager
  -> equipped skill slots
  -> use/reset/update
```

주의점:

- skill JSON은 legacy fields와 graph definition fields가 함께 있는 형태로 보인다.
- skill graph schema 변경은 compiler, data manager, skill runtime 모두에 영향이 있다.
- owner destruction callback을 사용하는 execution actor는 cleanup 경계가 중요하다.

## Gameplay Effect System

대표 파일:

- `Gameplay/Common/GameplayEffectTypes.h`
- `Gameplay/Components/GameplayEffectController.h`
- `Gameplay/Components/GameplayEffectController.cpp`

책임:

- active effect instance 관리
- duration/tick update
- state tag aggregation
- movement control lock 반영
- move speed modifier 반영
- damage payload 적용
- source object destruction tracking

현재 effect capability:

- root
- invincible
- knockback immune
- move input lock
- cast lock
- move speed multiplier
- damage on start/tick

주의점:

- `GameplayEffectController`는 movement component와 연결되어 control lock을 반영한다.
- source tracking callback 해제가 중요하다.

## Enemy Ability System

대표 파일:

- `Gameplay/Actors/Stage/Enemy.h`
- `Gameplay/Actors/Stage/Enemy.cpp`
- `Gameplay/Actors/Stage/EnemyAbilitySet.*`
- `Gameplay/Actors/Stage/IEnemyAbility.h`
- `Gameplay/Actors/Stage/ContactAttackAbility.*`
- `Gameplay/Actors/Stage/DashAbility.*`
- `Gameplay/Actors/Stage/ProjectileAttackAbility.*`

책임:

- enemy action state 관리
- ability flag 기반 ability 구성
- contact/dash/projectile attack 실행
- attack context 공유
- hit/death/spawn/move 상태 전환

구조적 의미:

- `EnemyActionState`는 전역 상태를 작게 유지한다.
- ability별 세부 phase는 각 ability 객체 안에서 관리한다.
- ability끼리 직접 참조하지 않고 `EnemyAttackContext`로 공격 보정 정보를 공유한다.

## Movement System

대표 파일:

- `Gameplay/Components/Movement.h`
- `Gameplay/Components/PlayerMovement.*`
- `Gameplay/Components/NonPlayableMovement.*`

책임:

- velocity 기반 이동
- player input 이동
- non-player target/directional movement
- dash impulse
- nav boundary mode 반영
- effect control lock 반영

주의점:

- gameplay effect와 movement가 연결되어 있으므로 Root/CastLock/MoveInputLock 변경은 movement behavior에 직접 영향이 있다.
- actor transform 방향과 movement direction은 attack/skill/particle 방향에도 영향을 줄 수 있다.

## Collision System

대표 파일:

- `EngineSystems/Physics/CollisionManager.*`
- `Gameplay/Components/Collider.*`
- collider subclasses

책임:

- collision layer 관계 관리
- collider 등록/해제
- collision enter/stay/exit callback
- body/attack/collector/interaction layer 구분

현재 layer:

- player body
- player attack
- player collector
- enemy body
- enemy attack
- enemy bullet
- props body
- town player interaction
- town NPC interaction

주의점:

- scene-owned collider가 scene destruction 중 `CollisionManager`를 건드릴 수 있어 initialization/shutdown 순서가 중요하다.
- collider owner destruction과 manager registration cleanup은 함께 검토해야 한다.

## Dialogue System

대표 파일:

- `Gameplay/GamePlaySystems/Dialogue/DialogueTypes.h`
- `Gameplay/GamePlaySystems/Dialogue/DialogueSystem.*`
- `Gameplay/GamePlaySystems/Dialogue/DialogueRunner.*`
- `Gameplay/GamePlaySystems/Dialogue/DialogueWindowView.*`
- `Gameplay/GamePlaySystems/Json/DialogueJsonDataManager.*`

책임:

- dialogue session 시작/종료
- line progression
- typing effect
- choices
- auto advance
- event execution
- result record
- dialogue UI 표시

주의점:

- runtime 문자열은 `std::wstring` 기반으로 처리한다.
- JSON loading 단계의 string은 dialogue system 주입 전 변환되어야 한다.
- event listener는 gameplay/session direction을 분리해야 한다.

## Town Interaction System

대표 파일:

- `Gameplay/Actors/Town/TownNpc.*`
- `Gameplay/Actors/Town/TownPlayer.*`
- `Gameplay/Components/TownInteraction.*`
- `Gameplay/GamePlaySystems/TownNpcPlacementSpawner.*`
- `Gameplay/GamePlaySystems/Json/TownNpcPlacementDataManager.*`

책임:

- town NPC placement data 로딩
- town actor 생성
- interaction availability 확인
- interaction indicator 표시
- dialogue/story event 연결 기반 제공

주의점:

- town interaction layer는 combat collision layer와 분리되어 있다.
- NPC placement schema 변경은 scene spawn과 interaction UI에 영향이 있다.

## Particle System

별도 문서:

- `_Docs/Systems/ParticleSystem_Overview.md`
- `_Docs/Systems/ParticleSystem_Overview_KR.md`

요약:

- `Particle.json`: 개별 particle setting
- `ParticleEmitter.json`: 지속 emitter spec
- `ParticleService`: pool, active emitter, update, render
- scene 전환 시 `ClearSceneState`

## Rendering / Screen / Resource System

대표 파일:

- `EngineSystems/Render/RenderChain.*`
- `EngineSystems/Render/GraphicResourceManager.*`
- `EngineSystems/Render/ScreenSystem.*`
- `Core/Base/DrawFunctions.*`

책임:

- back buffer clear/present
- shape/text/texture drawing
- texture resource lookup
- screen resolution/video mode
- global render offset

주의점:

- UI는 world camera offset 이후 offset을 reset한 상태에서 렌더링된다.
- world object와 particle은 camera shake/global offset 영향을 받는다.

## Input System

대표 파일:

- `EngineSystems/Input/InputManager.*`
- `EngineSystems/Input/InputDisplayText.*`

책임:

- WinAPI keyboard/mouse message 처리
- key/button down/up 상태 관리
- input action mapping
- debug self-test

현재 app layer에서 `HandleWindowMessage`가 mouse/key/window focus 이벤트를 `InputManager`로 전달한다.

## Profile / Run State System

대표 파일:

- `Gameplay/GamePlaySystems/UserProfile.h`
- `Gameplay/GamePlaySystems/UserProfile.cpp`
- `Gameplay/GamePlaySystems/RunState.h`
- `Gameplay/GamePlaySystems/RunState.cpp`
- `Gameplay/GamePlaySystems/GameState.h`

책임:

- 장기 user data runtime 보관
- current run result 보관
- player death/end reason/reward tracking
- equipped skill id
- attribute stat 계산
- stage/story progress
- global pause/debug state

주의점:

- `UserProfile`은 persistence-like runtime state이고, `RunState`는 current in-game session state에 가깝다.
- stage result 반영은 중복 적용 방지와 clear eligibility를 함께 확인해야 한다.

## 시스템 문서화 후속 후보

현재 시스템을 더 깊게 나누려면 다음 문서가 적합하다.

- `SceneSystem_Overview_KR.md`
- `SkillSystem_Overview_KR.md`
- `StageSystem_Overview_KR.md`
- `DialogueSystem_Overview_KR.md`
- `DataLoadingSystem_Overview_KR.md`
- `CollisionAndMovementSystem_Overview_KR.md`

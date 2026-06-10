# Enemy Animation Context Map

Status: Read-only context map
Date: 2026-06-10
Author / acting agent: Hermes Super Bot Stage 1
Session / execution surface: Discord / Hermes
Related task: Read-only pre-investigation for future enemy animation work

## 1. 판정

PASS — read-only 범위 안에서 `play-ground` 게임 repo의 적 애니메이션 관련 context map을 작성했다.

수행한 것:

- repo 구조 확인
- `AGENTS.md` / `PlayGround/Project/AGENTS.md` 일부 read-back
- enemy / animation / sprite / state / attack / hit / death / json 키워드 검색
- 관련 가능성이 높은 코드/데이터 일부 read-back
- `git status --short` 확인

수행하지 않은 것:

- 파일 수정/생성/삭제 없음
- git 변경 없음
- build setting/source/JSON/asset/Hermes config/Discord 관리 작업 없음

> Note: 이 문서는 위 read-only 조사 결과를 저장하기 위해 별도 승인으로 생성된 ResultReview 기록이다.

## 2. Intake 요약

- 작업 ID/제목: Super Bot Stage 1 read-only enemy animation context map
- Execution surface: Discord / Hermes Super Bot Stage 1
- Repo workdir: `/c/Users/kalux/workStation/play-ground`
- Goal: 나중에 적 애니메이션 관련 버그/개선 작업을 맡기기 위한 사전 context map 작성
- Approved scope: read-only inspection, keyword search, partial read-back, git status, context map
- Non-goals: 수정, 리팩터링, 데이터/asset 변경, 빌드 설정 변경, commit/push
- Success criteria: 적 애니메이션 관련 가능성이 높은 코드/데이터/리소스 위치와 책임 분리 맵 제시

## 3. Plan / Plan Review 요약

### Plan

1. repo 규칙과 구조 확인.
2. `PlayGround/` 프로젝트 구조 확인.
3. enemy / animation / sprite / state / attack / hit / death / json 관련 파일 검색.
4. high-signal 파일 read-back.
5. 확인 사실과 추정 분리.
6. 나중에 실제 버그 수정 요청 시 필요한 질문 정리.

### Plan Review

- read-only scope 안에 있음.
- 시스템 구조상 `FSM / gameplay state controls behavior`, `Animator plays animation`, `Renderer draws`, `Builder assembles data` 원칙을 기준으로 분리해서 봄.
- 지금은 버그 재현/수정 단계가 아니므로 root cause나 fix를 단정하지 않음.

### Compact Progress

- `git status --short` 확인: `?? _Docs/VisualTests/`만 보임. 이번 조사에서 변경 없음.
- repo는 C++ / WinAPI custom renderer / component-based / JSON-driven 구조로 확인.
- 적 애니메이션 high-signal 파일들을 검색 및 일부 read-back 완료.
- `Enemy.json`을 파싱해 enemy별 animation clip 구성을 요약함.

## 4. 확인한 repo 구조

확인된 주요 구조:

```text
play-ground/
  AGENTS.md
  PlayGround/
    PlayGround.sln
    PlayGround.vcxproj
    Data/
      Enemy.json
      Stage.json
      SpawnPool.json
      Skill.json
      Particle.json
      ParticleEmitter.json
      ParticleEventSet.json
      PlayableCharacter.json
      Resources/
        Textures/
          Characters/
            Enemies/
              Lv.1/
              Lv.2/
              Lv.3/
              Lv.4/
              Lv.5/
              Lv.6/
    Project/
      AGENTS.md
      App/
      Core/
      EngineSystems/
        Json/
        Render/
      Gameplay/
        Actors/
          Stage/
        Animation/
        Common/
        Components/
        GamePlaySystems/
          Json/
```

repo 규칙상 중요한 점:

- 게임 프로젝트 본체는 `PlayGround/`.
- C++ / WinAPI custom rendering / custom renderer.
- component-based `GameObject` / `Component`.
- gameplay data는 JSON-driven.
- animation playback과 gameplay state는 분리해야 함.

## 5. 적 애니메이션 관련 가능성이 높은 파일/폴더

### A. Enemy runtime / state / drawing

```text
PlayGround/Project/Gameplay/Actors/Stage/Enemy.h
PlayGround/Project/Gameplay/Actors/Stage/Enemy.cpp
PlayGround/Project/Gameplay/Actors/Stage/EnemyTypes.h
```

역할:

- `EnemyActionState`: `Spawn`, `Idle`, `Move`, `Hit`, `Attack`, `Death`
- enemy state update
- enemy animation elapsed 관리
- action state → clip name 매핑
- animation frame path resolve
- sprite draw fallback
- hit/death/spawn timing

### B. Enemy abilities / attack animation override 가능성

```text
PlayGround/Project/Gameplay/Actors/Stage/EnemyAbilitySet.h
PlayGround/Project/Gameplay/Actors/Stage/EnemyAbilitySet.cpp
PlayGround/Project/Gameplay/Actors/Stage/IEnemyAbility.h
PlayGround/Project/Gameplay/Actors/Stage/DashAbility.cpp
PlayGround/Project/Gameplay/Actors/Stage/ProjectileAttackAbility.cpp
PlayGround/Project/Gameplay/Actors/Stage/ContactAttackAbility.cpp
```

역할:

- Ability가 `EnemyAnimationRequest`를 제공할 수 있음.
- `DashAbility`는 dash 중 `attack` clip request.
- `ProjectileAttackAbility`는 `search` → `attack` clip request.
- Ability가 `Attack` state 진입/유지/종료에 관여.

### C. Animation path / clip data schema

```text
PlayGround/Project/Gameplay/GamePlaySystems/Json/AnimationClipPathInfoJson.h
PlayGround/Project/Gameplay/GamePlaySystems/Json/EnemyDataManager.h
PlayGround/Project/Gameplay/GamePlaySystems/Json/EnemyDataManager.cpp
PlayGround/Project/Gameplay/Animation/SpriteAnimationBuilder.cpp
PlayGround/Project/Gameplay/Animation/SpriteAnimationBuilder.h
PlayGround/Project/Gameplay/Animation/SpriteAnimationTypes.h
PlayGround/Project/Gameplay/Animation/SpriteAnimationSetData.h
```

역할:

- JSON animation clip schema:
  - `clip_name_`
  - `directory_`
  - `prefix_`
  - `start_index_`
  - `end_index_`
  - `fps_`
  - `loop_`
- frame path format: `prefix + 3자리 index + .png`
  - 예: `Lv4_attack_001.png`

### D. Generic sprite animator / renderer

```text
PlayGround/Project/Gameplay/Components/SpriteAnimatorComponent.h
PlayGround/Project/Gameplay/Components/SpriteAnimatorComponent.cpp
PlayGround/Project/Gameplay/Components/SpriteRendererComponent.h
PlayGround/Project/Gameplay/Components/SpriteRendererComponent.cpp
```

주의:

- generic `SpriteAnimatorComponent`가 존재하지만, read-back한 `Enemy.cpp` 기준으로 enemy는 자체 `_TryLoadAnimationFrameSprite()` / `_DrawObjectShape()` 경로를 사용하고 있을 가능성이 높음.
- 즉, “적 애니메이션 문제”가 반드시 `SpriteAnimatorComponent` 문제라고 단정하면 안 됨.

### E. Enemy data

```text
PlayGround/Data/Enemy.json
```

역할:

- enemy별 stat / ability / movement / animation clip 정의.
- `GameDataLoader.cpp`에서 `_EnemyDataMgr.Load("Data/Enemy.json")`로 로드됨.

### F. Enemy sprite resources

```text
PlayGround/Data/Resources/Textures/Characters/Enemies/
  Lv.1/
  Lv.2/
  Lv.3/
  Lv.4/
  Lv.5/
  Lv.6/
```

대표 구조:

```text
Lv.1/
  Lv1_hit.png
  move/Lv1_move_001..008.png
  die/Lv1_die_001..003.png

Lv.4/
  Lv4_hit.png
  move/Lv4_move_001..004.png
  attack/Lv4_attack_001..020.png
  die/Lv4_die_001..003.png

Lv.5/
  Lv5_hit.png
  move/Lv5_move_001..004.png
  search/Lv5_search_001..004.png
  attack/Lv5_attack_001..009.png
  die/Lv5_die_001..004.png
```

## 6. 확인한 사실

### 구조/규칙

- `AGENTS.md`에 animation/state 책임 분리 원칙이 있음:
  - FSM / gameplay state controls behavior
  - Animator plays animation
  - Renderer draws
  - Builder assembles data
- `PlayGround/Project/AGENTS.md`도 decision / execution / data 분리를 강조함.

### Enemy state

`EnemyTypes.h`에서 확인:

```cpp
enum class EnemyActionState
{
    Spawn = 0,
    Idle,
    Move,
    Hit,
    Attack,
    Death,
};
```

### Enemy state → clip name

`Enemy.cpp`에서 확인:

```cpp
Spawn -> "spawn"
Idle -> "idle"
Move -> "move"
Hit -> "hit"
Attack -> "attack"
Death -> "death"
```

### Clip fallback

`Enemy::_FindAnimationClipForState`에서 확인:

- state clip을 찾음.
- `Attack`이 아닌 상태에서 해당 state clip이 있으면 사용.
- fallback으로 `move`, 그 다음 `idle`, 그 다음 첫 번째 clip을 사용.
- 단, `Attack` state는 일반 state clip 직접 선택 로직에서 제외되어 있고, ability animation request가 중요해 보임.

### Enemy animation frame path

`Enemy.cpp`에서 확인:

- `SpriteAnimationBuilder::BuildSequenceFramePath(directory, prefix, index)` 사용.
- sequence path가 없고 single-frame range이면 `directory + prefix + ".png"`도 fallback으로 확인.
- 따라서 `hit`처럼 `Lv1_hit.png` 단일 파일도 지원하는 구조.

### Enemy JSON schema

`AnimationClipPathInfoJson.h`에서 확인:

```cpp
clip_name_
directory_
prefix_
start_index_
end_index_
fps_
loop_
```

`EnemyDataManager.h`에서 `EnemyJsonInfo`는 `animation_clips_`를 포함함.

### Data load

`GameDataLoader.cpp`에서 확인:

```cpp
constexpr char kEnemyPath[] = "Data/Enemy.json";
_EnemyDataMgr.Load(kEnemyPath)
```

### Enemy.json enemy별 clip 현황

확인된 요약:

```text
id=1 M001 - 플랑1
  clips: move, hit, death

id=2 M002 - 플랑2
  clips: idle, move, hit, death

id=3 M003 - 기체
  clips: move, hit, death

id=4 M004 - 돌체
  clips: move, hit, attack, death

id=5 M005 - 슈터
  clips: move, search, hit, attack, death

id=6 M006 - 탱커
  clips: move, hit, death
```

### Ability animation request

`EnemyAbilitySet`에서 확인:

- 여러 ability에 `TryGetAnimationRequest`를 물어봄.
- 첫 번째 true request를 사용.

`ProjectileAttackAbility.cpp`에서 확인:

- `Attack` state일 때:
  - 발사 전 일부 duration은 `search`
  - 이후는 `attack`

`DashAbility.cpp`에서 확인:

- dash phase가 `Dashing`일 때 `attack` clip request.

## 7. 추정 / 가정

아래는 확인 사실이 아니라 현재 구조에서의 추정이다.

1. 적 애니메이션 문제의 1차 조사 시작점은 `Enemy.cpp + Enemy.json + Enemies resource folder` 조합일 가능성이 높음.
   - 이유: enemy는 자체적으로 JSON clip path를 resolve하고 `_DrawObjectShape()`에서 sprite를 선택함.

2. generic `SpriteAnimatorComponent`는 적보다 플레이어/타운 캐릭터/다른 actor에 더 직접적으로 쓰일 가능성이 있음.
   - 이유: enemy read-back 경로에서는 `SpriteAnimatorComponent` 대신 enemy 자체 draw path가 확인됨.
   - 단, 전체 call graph를 완전히 추적한 것은 아니므로 단정은 아님.

3. Attack animation 문제라면 ability layer도 같이 봐야 함.
   - 이유: `DashAbility` / `ProjectileAttackAbility`가 `EnemyAnimationRequest`로 clip override를 제공함.

4. 일부 enemy는 `attack` clip이 없음.
   - id 1/2/3/6은 `attack` clip이 없고, id 4/5만 `attack` clip이 있음.
   - 만약 “공격하는데 attack animation이 안 나온다”라면 해당 enemy가 실제 attack clip을 가져야 하는 타입인지 먼저 확인해야 함.

5. Hit/death frame path 문제는 JSON prefix/directory와 실제 png 이름 불일치가 원인일 수 있음.
   - 현재 일부는 단일 `hit` 파일이고 일부는 sequence 폴더라서, path fallback 규칙 이해가 중요함.

## 8. Context Map

```text
[Data Load]
GameDataLoader.cpp
  -> _EnemyDataMgr.Load("Data/Enemy.json")
      -> EnemyDataManager / JsonDataManager
          -> EnemyJsonInfo.animation_clips_

[Enemy Runtime]
StageManager / ObjectManager / InGameScene 쪽에서 enemy 생성 가능성
  -> Enemy(info, creation_info)
      -> Initialize()
          -> movement/status/collider/ability init
          -> _BuildAbilities()
          -> _ChangeState(Spawn or Move)

[Enemy State]
EnemyActionState
  Spawn / Idle / Move / Hit / Attack / Death

[State Update]
Enemy::Update()
  -> _UpdateState(delta)
      -> _UpdateOnSpawn
      -> _UpdateOnMove
      -> _UpdateOnHit
      -> _UpdateOnAttack
      -> _UpdateOnDeath
  -> enemy_animation_elapsed_ += delta
  -> ability_set_.OnUpdate()
  -> _UpdateFacingFlip()

[Animation Clip Selection]
Enemy::_TryLoadAnimationFrameSprite()
  -> ability_set_.TryGetAnimationRequest()
       - DashAbility: attack during Dashing
       - ProjectileAttackAbility: search then attack
  -> else _FindAnimationClipForState(action_state_)
       - state clip
       - fallback move
       - fallback idle
       - fallback first clip
  -> _ResolveAnimationFrameIndex()
  -> _ResolveAnimationFramePath()
  -> _GraphicSourceMgr.GetSprite(...)

[Frame Path]
Enemy.json animation_clips_:
  directory_ + prefix_ + 3-digit index + ".png"
  or single frame:
  directory_ + prefix_ + ".png"

[Render]
Enemy::_DrawObjectShape()
  -> _TryLoadAnimationFrameSprite()
  -> fallback enemy_sprite_
  -> custom sprite draw metrics / flip / opacity / hit flash likely applied in draw path

[Assets]
PlayGround/Data/Resources/Textures/Characters/Enemies/Lv.N/
  move/
  die/
  attack/
  search/
  hit single png
```

## 9. 나중에 실제 버그 수정 요청 시 필요한 추가 질문

1. 문제 enemy
   - 어느 enemy인가?
   - 예: M001/Lv1, M004/Lv4, M005/Lv5 등.

2. 문제 action
   - `move`, `idle`, `hit`, `attack`, `search`, `death` 중 무엇인가?
   - “안 나옴”, “느림/빠름”, “첫 프레임만 보임”, “다른 애니메이션이 나옴”, “깜빡임”, “방향 반전 문제” 중 어떤 유형인가?

3. 재현 조건
   - 어떤 scene/stage에서 발생?
   - enemy spawn 직후?
   - 피격 시?
   - 공격 중?
   - 사망 시?
   - dash/projectile/contact attack 중?

4. expected behavior
   - 어떤 clip이 나와야 하는가?
   - loop 여부는?
   - duration/fps 기대값은?

5. asset/data 변경 허용 여부
   - JSON clip field 변경 가능?
   - png 리소스 추가/이름 변경 가능?
   - schema 변경은 필요한가? 필요하다면 별도 승인 필요.

6. 검증 방법
   - build/run까지 수행할지?
   - 스크린샷/영상 확인이 필요한지?
   - 로그 추가가 허용되는지?

7. 수정 경계
   - `Enemy.cpp`만 허용?
   - `Enemy.json` 허용?
   - Ability layer 허용?
   - renderer/animation component까지 허용?

## 10. Completion / Gap Analysis

### Completion

- 완료 상태: read-only context map 작성 완료
- 실제 수행: read-only repo inspection, keyword search, relevant file read-back, git status 확인, context map 작성
- 변경한 파일: 없음
- 실행한 검증: `git status --short`
  - 결과: `?? _Docs/VisualTests/`
  - 이 항목은 pre-existing untracked로 보이며, 조사에서 수정하지 않음.
- 미수행 검증: build/run/test는 수행하지 않음. 요청 scope가 read-only context map이었고 버그 재현/수정 요청이 아니었음.
- scope deviation: no
- reapproval needed: no, 단 실제 수정 단계로 넘어가려면 필요
- commit 권장 여부: no. 조사 단계에서는 변경 파일이 없었음.

### Gap Analysis

- 최초 계획과 일치한 점:
  - read-only inspection만 수행.
  - enemy animation 관련 코드/데이터/asset 위치 식별.
  - 확인 사실과 추정 분리.
  - 수정/생성/삭제/commit 없음.
- 달라진 점: 없음.
- 차이가 발생한 이유: 해당 없음.
- 다음 작업에서의 행동 개선안:
  - 실제 버그 수정 요청 시에는 먼저 “문제 enemy + 문제 action + 재현 조건”을 고정한 뒤, `Enemy.json → Enemy::_TryLoadAnimationFrameSprite → ability animation request → resource file existence` 순서로 좁히는 것이 좋다.

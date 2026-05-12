# PlayGround 게임 디자인 개요

## 목적

이 문서는 `PlayGround/` 프로젝트의 현재 게임 디자인 요소를 코드와 JSON 데이터 기준으로 요약한다.

구현 세부 구조보다는 플레이어 경험, 콘텐츠 축, 게임 규칙, 성장/전투/대화 흐름을 중심으로 정리한다.

## 현재 게임 형태

현재 프로젝트는 2D 액션/전투 프로토타입과 아웃게임 성장/선택 구조, 타운 NPC/대화 구조가 함께 들어 있는 실험형 게임 프로젝트다.

확인되는 주요 플레이 축:

- Intro에서 시작하는 scene flow
- OutGame에서 스킬 선택/옵션/타운 상호작용
- InGame에서 스테이지 전투 진행
- 플레이어 캐릭터 `Dusty`
- 적 스폰, 처치, 보상 획득
- 스킬 2개 장착과 사용
- attribute node 기반 성장
- main story progress 기반 대화/진행 가능성
- WorkStation debug scene에서 샘플 테스트

## 콘텐츠 데이터 파일

현재 `PlayGround/Data/`에는 다음 데이터 파일이 있다.

| 파일 | 디자인 의미 |
| --- | --- |
| `PlayableCharacter.json` | 플레이어블 캐릭터 스탯, 이동, 애니메이션 |
| `Enemy.json` | 적 종류, 체력, 공격, 이동, 보상, ability |
| `Stage.json` | stage와 spawn pool 연결 |
| `SpawnPool.json` | stage별 적 스폰 후보와 가중치 |
| `Skill.json` | 스킬 기본 정보와 skill graph 정의 |
| `AttributeNode.json` | 성장 node, 비용, 스탯 증가, unlock 관계 |
| `UserData.json` | 플레이어 보유 재화, 경험치, 장착 스킬, 진행도 |
| `dialogue_all_samples.json` | 대화 session, line, choice, event |
| `TownNpcPlacement.json` | 타운 NPC 배치 |
| `Particle.json` | 파티클 시각 효과 레시피 |
| `ParticleEmitter.json` | 지속형 파티클 emitter 정의 |

## 플레이어 캐릭터

현재 플레이어블 캐릭터 데이터는 `PlayableCharacter.json` 중심으로 구성된다.

확인되는 디자인 축:

- 캐릭터 ID
- 이름
- body size
- HP
- contact damage
- attack range
- collector size
- maximum move speed
- acceleration
- friction
- navigation boundary mode
- animation clip 목록

코드상 플레이어 runtime actor는 `StagePlayer`와 movement/component 구조를 통해 동작한다.

디자인 관점에서 플레이어는:

- 방향 입력으로 이동한다.
- 스킬 슬롯 2개를 사용할 수 있다.
- stage 안에서 적을 처치하고 보상을 수집한다.
- attribute/user profile에 의해 장기 성장값을 받을 수 있다.

## 전투와 스테이지

### Stage Flow

스테이지 상태는 `StageState`로 표현된다.

```text
Undefined
Enter
Ready
Play
Pause
Clear
Result
Exit
```

디자인 의미:

- `Enter`: stage 진입 처리
- `Ready`: 전투 시작 전 준비 상태
- `Play`: 실제 전투 진행
- `Pause`: 일시정지
- `Clear`: 클리어 조건 처리
- `Result`: 결과 화면/보상 반영
- `Exit`: stage 종료

`StageManager`는 stage 진행 시간, 스폰 타이머, 다음 stage 진행 가능 여부, run session result를 관리한다.

### Stage Data

`Stage.json`은 stage id와 spawn pool id를 연결한다.

`SpawnPool.json`은 해당 stage에서 등장할 적 후보를 정의한다.

스폰 후보는 다음 개념을 가진다.

- enemy id
- spawn weight
- spawn interval

현재 구조상 stage의 구체 플레이 경험은 stage id보다 spawn pool과 runtime `StageManager` 동작에 의해 크게 결정된다.

## 적 디자인

적 데이터는 `Enemy.json`과 `EnemyJsonInfo` 구조에 기반한다.

주요 디자인 축:

- tier
- special role
- HP
- contact damage
- exp/dust reward
- movement pattern
- nav boundary mode
- ability flags
- attack range
- contact attack reaction
- dash attack 설정
- projectile attack 설정

### 적 Ability

적 ability는 flag와 runtime ability object로 나뉜다.

현재 확인되는 ability:

- `ContactAttack`
- `Dash`
- `ProjectileAttack`

`EnemyActionState`는 전역 행동 상태를 담당한다.

```text
Spawn
Idle
Move
Hit
Attack
Death
```

세부 phase는 각 ability 내부에서 관리한다. 예를 들어 `DashAbility`는 charging, dashing, recovery 같은 세부 phase를 내부에서 다룬다.

디자인 관점에서 이 구조는 적의 기본 상태 수를 작게 유지하면서, 공격 방식별 세부 행동을 ability 단위로 확장할 수 있게 한다.

## 스킬 디자인

스킬은 `Skill.json`, `SkillManager`, `SkillBase`, skill graph runtime으로 구성된다.

플레이어는 최대 2개의 스킬을 장착한다.

현재 스킬 유형:

- `Active`
- `Deployable`
- `Summon`

현재 skill graph event:

- `OnUseRequested`
- `OnCastStarted`
- `OnCastCompleted`
- `OnHit`
- `OnTick`
- `OnExpired`

현재 skill node kind:

- `InstantCast`
- `TimedCast`
- `SpawnProjectile`
- `SpawnAreaField`
- `SpawnOrbiters`
- `ApplyEffect`
- `ApplyVelocityBoost`
- `EndSkill`

디자인 의미:

- 스킬은 단일 hard-coded 함수보다 graph node 조합으로 표현하려는 방향이다.
- 스킬의 실제 효과는 projectile, area field, orbiter, gameplay effect 같은 runtime entity로 분해된다.
- cooldown, cast time, lifetime, hit policy, effect application을 데이터로 조합할 수 있다.

## Gameplay Effect

`GameplayEffectSpec`은 상태 이상, modifier, damage payload를 표현한다.

현재 state tag:

- `Root`
- `Invincible`
- `KnockbackImmune`
- `MoveInputLocked`
- `CastLocked`

현재 modifier:

- `MoveSpeedMultiplier`

디자인 의미:

- 단순 피해뿐 아니라 이동 잠금, 무적, 넉백 면역, 시전 잠금 같은 상태 제어가 가능하다.
- skill, projectile, area field, enemy attack이 같은 effect model을 공유할 수 있다.

## 성장과 프로필

### User Profile

`UserProfile`과 `UserData.json`은 장기 진행 데이터를 표현한다.

현재 관리 축:

- dust/coin count
- experience
- unlocked character ids
- acquired attribute node ids and levels
- equipped skill ids
- stage progress
- main story progress

### Attribute Node

`AttributeNode.json`과 `AttributeNodeJsonInfo`는 성장 node를 정의한다.

주요 디자인 축:

- node grade
- node tier
- max level
- cost
- cost growth
- stat type
- stat value
- calculation type
- unlock character id
- parent node id
- required parent level
- child node connection direction

현재 stat type:

- `SpecialAbility`
- `Attack`
- `Hp`
- `MoveSpeed`
- `AttackRange`
- `CollectionRange`
- `Runtime`

디자인 의미:

- 캐릭터별 성장 트리 또는 공통 성장 트리로 확장할 수 있는 기반이 있다.
- parent/child 관계와 node state를 통해 unlock/acquire/master 단계가 가능하다.

## 타운과 대화

### Town NPC

`TownNpcPlacement.json`, `TownNpc`, `TownInteraction`, `TownNpcPlacementSpawner`가 타운 상호작용의 중심이다.

디자인 의미:

- 타운 scene에 NPC를 데이터 기반으로 배치한다.
- interaction collider/layer를 통해 player와 NPC 상호작용을 감지한다.
- NPC interaction은 dialogue system이나 story progress와 연결될 수 있다.

### Dialogue

대화 시스템은 session 기반이다.

주요 개념:

- message type: dialogue, narration, system message
- session state: opening, running, closing, finished
- line state: typing, waiting for next, waiting for choice, auto advancing
- choice
- event
- session result

디자인 의미:

- 대화 line 진입/종료 시 event를 실행할 수 있다.
- choice와 next index로 branching이 가능하다.
- typing effect, auto advance, skip policy를 session setting으로 제어할 수 있다.

## 시각 효과

파티클 시스템은 별도 시스템 문서에 상세 정리되어 있다.

관련 문서:

- `_Docs/Systems/ParticleSystem_Overview.md`
- `_Docs/Systems/ParticleSystem_Overview_KR.md`

게임 디자인 관점에서 파티클 데이터는:

- 스킬/적 행동/디버그 샘플에 붙는 시각 피드백 레시피
- 단발 burst용 기본 particle setting
- 지속 emission용 emitter setting

## 현재 게임 루프 추정

현재 구조에서 플레이 루프는 다음과 같이 읽힌다.

```text
Intro
  -> OutGame
    -> skill selection / option / town interaction / dialogue
    -> InGame
      -> stage enter / ready
      -> enemy spawn and combat
      -> skill use
      -> enemy death rewards
      -> stage clear or player death
      -> result
    -> UserProfile update
```

## 디자인 문서화 시 주의점

- 실제 수치와 텍스트는 JSON이 source of truth다.
- 코드 enum은 가능한 상태와 카테고리의 source of truth다.
- 기획 문서에서 새 필드를 제안할 경우 JSON schema 변경 작업으로 분리해야 한다.
- 적, 스킬, 성장, 대화는 이미 데이터 기반 구조를 갖고 있으므로, 새 콘텐츠는 기존 field 의미를 먼저 확인해야 한다.
- 현재 일부 텍스트 데이터는 로컬 표시 환경에서 깨진 문자열처럼 보이는 구간이 있으므로, 텍스트 정비 작업은 인코딩 정책 확인 후 별도 진행하는 것이 좋다.

## 향후 분리하면 좋은 기획 문서

이 개요 이후 다음 문서로 나누면 좋다.

- `StageDesign_Overview_KR.md`
- `EnemyDesign_Overview_KR.md`
- `SkillDesign_Overview_KR.md`
- `ProgressionDesign_Overview_KR.md`
- `TownAndDialogueDesign_Overview_KR.md`

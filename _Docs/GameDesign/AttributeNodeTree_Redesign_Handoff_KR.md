# Attribute Node Tree Redesign Handoff

## 목적

이 문서는 더스트 랜드의 새 어트리뷰트 트리 기획을 프로그래머에게 전달하기 위한 작업지시서다.

기존 `PlayGround/Data/AttributeNode.json`의 트리는 이번 기획에서 무시한다. 단, 현재 JSON 스키마와 런타임 구조는 유지한다.

## 작업 범위

- 새 어트리뷰트 트리 이름: `먼지자리 성도`
- 교체용 JSON 초안: `_Docs/GameDesign/AttributeNode_Redesign_Draft.json`
- 대상 런타임 데이터 파일: `PlayGround/Data/AttributeNode.json`
- JSON 스키마 변경: 없음
- 새 enum 추가: 없음
- 새 `SpecialAbilityId` 추가: 없음
- 코드 수정 필요 가능성: `MoveSpeed` 어트리뷰트 적용 경로

## 장르 분석 요약

현재 게임은 2D 탑다운 액션, 서바이버 라이트, 런 기반 메타 성장 구조에 가깝다.

주요 플레이 축은 다음과 같다.

- 몰려오는 적 사이에서 위치를 잡는 생존 압박
- 2개 스킬만 장착하는 제한된 전투 선택
- 스테이지에서 먼지와 경험치를 얻고, OutGame에서 장기 성장으로 환원하는 루프
- NPC/대화/스토리 진행 가능성이 있는 타운 기반 외부 구조

따라서 새 어트리뷰트 트리는 단순 공격력 누적보다 `처치 속도`, `생존력`, `기동`, `수집`, `런 지속 시간`을 각각 다른 플레이 성향으로 제공해야 한다.

## 시스템 분석 요약

현재 `AttributeNodeJsonInfo`는 다음 주요 필드로 트리를 표현한다.

- `id_`
- `name_`
- `desc_`
- `max_lv_`
- `grade_`
- `tier_`
- `cost_`
- `cost_growth_rate_`
- `stat_type_`
- `stat_value_`
- `special_ability_id_`
- `calc_type_`
- `unlock_character_id_`
- `parent_node_id_`
- `required_parent_node_lv_`
- `children_nodes_info_`

현재 사용 가능한 `AttributeType`은 다음과 같다.

| 값 | 이름 | 의미 |
| ---: | --- | --- |
| 0 | `Undefined` | 미정 |
| 1 | `SpecialAbility` | 특수 능력 |
| 2 | `Attack` | 공격력 |
| 3 | `Hp` | 체력 |
| 4 | `MoveSpeed` | 이동속도 |
| 5 | `AttackRange` | 공격 범위 |
| 6 | `CollectionRange` | 수집 범위 |
| 7 | `Runtime` | 스테이지 진행 시간 |

현재 사용 가능한 `NodeGrade`는 다음과 같다.

| 값 | 이름 |
| ---: | --- |
| 1 | `Common` |
| 2 | `Major` |
| 3 | `Keystone` |

현재 사용 가능한 `NodeTier`는 다음과 같다.

| 값 | 이름 |
| ---: | --- |
| 1 | `Tier1` |
| 2 | `Tier2` |
| 3 | `Tier3` |

현재 사용 가능한 `AttributeCalculationType`은 다음과 같다.

| 값 | 이름 | 비고 |
| ---: | --- | --- |
| 1 | `Additive` | 이번 초안에서 사용 |
| 2 | `Multiplicative` | 이번 초안에서는 사용하지 않음 |

이번 초안은 전부 `Additive` 기준으로 설계했다. 현재 곱연산은 레벨 누적 계산과 결합될 때 밸런스가 과하게 튈 수 있으므로 별도 검토 전까지 사용하지 않는다.

## 새 트리 구조

트리 이름은 `먼지자리 성도`다.

중앙 루트 노드에서 다섯 갈래로 나뉜다.

| 가지 | 역할 | 주요 능력치 |
| --- | --- | --- |
| 부식 가지 | 처치 속도와 공격 도달 범위 | `Attack`, `AttackRange` |
| 응집 가지 | 생존 안정성 | `Hp` |
| 바람 가지 | 카이팅과 조작 숙련 | `MoveSpeed`, `AttackRange` |
| 포집 가지 | 보상 회수와 성장 효율 | `CollectionRange`, `Runtime` |
| 긴밤 가지 | 긴 런과 위험 보상 | `Runtime`, `Hp` |

## 노드 목록

| ID | 이름 | 등급 | 티어 | 효과 | Max Lv | 수치/Lv | 부모 |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: |
| 0 | 먼지별의 눈 | Keystone | T1 | `SpecialAbility: DustCollect` | 1 | - | - |
| 100 | 산성분진 | Common | T1 | `Attack` | 5 | +0.5 | 0 |
| 101 | 따가운 입자 | Common | T1 | `Attack` | 4 | +0.75 | 100 |
| 102 | 균열을 찾는 손 | Major | T2 | `AttackRange` | 3 | +5 | 101 |
| 103 | 표면박리 | Common | T2 | `Attack` | 3 | +1.25 | 101 |
| 104 | 부식핵 | Major | T2 | `Attack` | 2 | +2.0 | 103 |
| 105 | 붉은 먼지의 심장 | Keystone | T3 | `Attack` | 1 | +5.0 | 104 |
| 200 | 뭉친 먼지 | Common | T1 | `Hp` | 5 | +1.0 | 0 |
| 201 | 속솜 | Common | T1 | `Hp` | 4 | +1.5 | 200 |
| 202 | 충격을 먹는 보풀 | Major | T2 | `Hp` | 3 | +2.5 | 201 |
| 203 | 무너져도 남는 결 | Common | T2 | `Hp` | 3 | +2.0 | 201 |
| 204 | 두꺼운 먼지껍질 | Major | T2 | `Hp` | 2 | +5.0 | 203 |
| 205 | 낡은 담요의 성 | Keystone | T3 | `Hp` | 1 | +16.0 | 204 |
| 300 | 가벼운 발끝 | Common | T1 | `MoveSpeed` | 5 | +3 | 0 |
| 301 | 바람 탄 천 | Common | T1 | `MoveSpeed` | 4 | +4 | 300 |
| 302 | 미끄러운 회피선 | Major | T2 | `MoveSpeed` | 3 | +6 | 301 |
| 303 | 돌아드는 먼지 | Common | T2 | `AttackRange` | 3 | +4 | 301 |
| 304 | 얇은 회오리 | Major | T2 | `MoveSpeed` | 2 | +8 | 303 |
| 305 | 문틈의 바람 | Keystone | T3 | `MoveSpeed` | 1 | +25 | 304 |
| 400 | 작은 정전기 | Common | T1 | `CollectionRange` | 5 | +3 | 0 |
| 401 | 더 넓은 소매 | Common | T1 | `CollectionRange` | 4 | +5 | 400 |
| 402 | 휩쓸린 골목 | Major | T2 | `CollectionRange` | 3 | +7 | 401 |
| 403 | 줍는 리듬 | Common | T2 | `Runtime` | 3 | +0.5 | 401 |
| 404 | 회수궤도 | Major | T2 | `CollectionRange` | 2 | +12 | 403 |
| 405 | 잃어버린 먼지의 귀향 | Keystone | T3 | `CollectionRange` | 1 | +30 | 404 |
| 500 | 오래가는 숨 | Common | T1 | `Runtime` | 5 | +0.25 | 0 |
| 501 | 남은 불씨 | Common | T1 | `Runtime` | 4 | +0.4 | 500 |
| 502 | 미뤄진 폐막 | Major | T2 | `Runtime` | 3 | +0.75 | 501 |
| 503 | 밤샘 체력 | Common | T2 | `Hp` | 3 | +1.5 | 501 |
| 504 | 긴 하루의 요령 | Major | T2 | `Runtime` | 2 | +1.25 | 503 |
| 505 | 새벽까지 남은 먼지 | Keystone | T3 | `Runtime` | 1 | +3.0 | 504 |

## MoveSpeed 노티

`MoveSpeed`는 enum, `AttributeStat`, JSON 필드에는 존재한다. 그러나 현재 조사 기준으로 플레이어 이동속도에 실제 반영되는 경로가 불완전해 보인다.

확인 지점:

- `PlayGround/Project/Gameplay/Components/PlayerMovement.cpp`
- `PlayGround/Project/Gameplay/Actors/Stage/StagePlayer.cpp`

현재 `PlayerMovement` 생성자에서는 캐릭터 원본 데이터만 사용한다.

```cpp
move_spd_max_ = _info->move_speed_max_;
```

기대 동작:

- 어트리뷰트의 `MoveSpeed`는 플레이어의 기본 최대 이동속도에 반영한다.
- 스킬/상태효과의 `MoveSpeedMultiplier`는 기존처럼 `external_move_speed_multiplier_`로 유지한다.
- 즉, 메타 성장 이동속도와 전투 중 버프 이동속도를 분리한다.

권장 처리 방향:

```cpp
const auto attribute_stat = _UserProfile.GetAttributeStat();
move_spd_max_ = attribute_stat.GetStat(AttributeType::MoveSpeed).GetTotalIncrease(_info->move_speed_max_);
```

실제 적용 위치는 의존성 방향을 보고 결정한다. `PlayerMovement`가 `UserProfile`을 직접 참조하는 방식이 부담스럽다면, `StagePlayer`에서 계산된 이동속도를 `PlayerMovement`에 전달하는 방식이 더 좋다.

## 검수 기준

- `AttributeNode_Redesign_Draft.json`이 JSON으로 정상 파싱된다.
- `AttributeNodeTree` UI에서 루트 `id_ = 0`부터 모든 노드가 연결되어 보인다.
- 각 자식 노드는 부모 레벨 조건을 만족하기 전에는 잠긴 상태로 보인다.
- 노드 레벨다운 시 조건을 잃은 자식 노드가 함께 잠기거나 정리된다.
- `Attack`, `Hp`, `AttackRange`, `CollectionRange`, `Runtime` 투자 효과가 실제 런에 반영된다.
- `MoveSpeed` 투자 전후 플레이어 최대 이동속도 차이가 확인된다.
- 스킬의 `MoveSpeedMultiplier` 효과와 어트리뷰트 `MoveSpeed` 효과가 중복 계산되더라도 의도대로 동작한다.

## 구현 주의사항

- 이번 작업은 JSON 스키마 변경이 아니다.
- 이번 작업은 기존 데이터 교체 작업이며, 새 필드 추가가 아니다.
- `PlayGround/Data/AttributeNode.json`을 교체하기 전에 기존 파일을 diff로 확인한다.
- `MoveSpeed` 적용 외의 코드 리팩터링은 이번 범위에 포함하지 않는다.
- 실제 빌드 및 런타임 검증 전까지 밸런스 수치는 초안으로 취급한다.

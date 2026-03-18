#pragma once

enum class CollisionLayer
{
	PlayerBody,
	PlayerAttack,
	EnemyBody,
	EnemyAttack,
	EnemyBullet,
	End
};

enum class SceneType
{
	Intro,
	Loading,
	OutGame,
	InGame,
	Count,
};

enum class ComponentType
{
	Undefined,
	Transform,
	Status,
	Movement,
	Collider,
	Combat,
};

enum class MovementPattern
{
	Undefined = 0,	// 초기화 값
	Playable,		// 직접 조작
	Stopped,		// 정지 (이동 없음)
	Directional,	// 직선 이동
	Target,			// 타겟 추적 이동
	Count,
};

enum class EnemyCategory
{
	Undefined = 0,	// 초기화 값
	WasExpDust,		// 경험치 먼지였던 것
	Count,
};

enum class EnemyTier
{
	Undefined = 0,	// 초기화 값
	Normal,			// 일반		| 자원 공급용1
	Elite,			// 중급		| 자원 공급용2
	Danger,			// 위험		| 플레이 흐름 변화 유도
	Special,		// 특수		| 플레이 흐름 변화 유도
	Count,
};

enum class EnemySpecialRole
{
	Undefined = 0,	// 초기화 값
	Tank,			// 고체력형 | 높은 HP 배율
	Rich,			// 고보상형	| 높은 자원 배율
	Shooter,		// 공격형	| 투사체
	Splitter,		// 변이형	| 분열/강화
	Count,
};

enum class EnemyProjectilePattern
{
	Undefined = 0,	// 초기화 값
	Direct,			// 진행 방향 | 직선 진행
	Aimed,			// 타겟 방향 | 직선 진행
	Count,
};

enum class PlayableCharacterId
{
	Undefined = 0,
	Dusty,
};

struct UnitJsonInfo
{
	_uint id_ = 0;
	std::string name_;

	_float body_size_ = 0.f;
	_double attack_speed_ = 0.f;

	_float hp_ = 0.f;
	_float contact_damage_ = 0.f;
};

struct EnemyJsonInfo : public UnitJsonInfo
{
	EnemyTier tier_ = EnemyTier::Undefined;
	EnemySpecialRole role_ = EnemySpecialRole::Undefined;

	_uint reward_ = 0;

	EnemyProjectilePattern projectile_pattern_ = EnemyProjectilePattern::Undefined;
	_float projectile_damage_ = 0.f;
	_float projectile_speed_ = 0.f;

	_uint split_count_ = 0; // 분열형 몬스터가 분열할 때 생성되는 자식 몬스터의 수

	MovementPattern movement_pattern_ = MovementPattern::Undefined;
	_uint move_speed_unit_ = 0; // 몬스터의 기본 이동 속도. 실제 이동 속도는 이 값에 20.f를 곱해서 계산
};

struct PlayableCharacterJsonInfo : public UnitJsonInfo
{
	_float attack_size_ = 0.f;

	_float move_speed_max_ = 0.f;	// 최대 이동 속도
	_float acceleration_ = 0.f;		// 가속도. 높을수록 빠르게 최대 이동 속도에 도달
	_float friction_ = 0.f;			// 마찰 계수. 높을수록 빠르게 감속
};

enum class NodeGrade { Undefined, Common, Major, Keystone };
enum class NodeState { Undefined, Hidden, Locked, Unlocked, Acquired, Mastered };

enum class AttributeType
{
	Undefined = 0,	// 초기화 값
	SpecialAbility,	// 특수 능력 (예: 특수 능력 개방, 조건부 발동 능력 등)
					// 이 값을 SpecialAbilityId와 조합하여 특정 특수 능력을 식별할 수 있습니다. 예시에서는 "적 처치 시 체력 회복" 능력이 SPECIAL_ABILITY_DUST_COLLECT_NODE_ID로 정의된다고 가정하고 있습니다.

	Attack,
	Hp,
	MoveSpeed,
	AttackRange,
	CollectionRange,
};

enum class SpecialAbilityId
{
	Undefined = 0,	// 초기화 값
	DustCollect,
};

enum class AttributeCalculationType
{
	Undefined = 0,	// 초기화 값
	Additive,		// 덧셈 방식으로 증가 (예: 공격력 +10)
	Multiplicative,	// 곱셈 방식으로 증가 (예: 공격력 *1.1)
};

enum class NodeDirection
{
	Undefined = 0,	// 초기화 값
	Up,
	RightUp,
	Right,
	RightDown,
	Down,
	LeftDown,
	Left,
	LeftUp,
};

struct AttributeNodeJsonInfo
{
	// --- 기본 정보 ---
	_uint id_ = 0;
	std::string name_;
	NodeGrade grade_ = NodeGrade::Undefined;
	std::string desc_;
	_uint max_lv_ = 0;

	// --- 능력치 증가 정보 ---
	AttributeType stat_type_ = AttributeType::Undefined; // 노드가 증가시키는 능력치의 유형. 필요에 따라 공격력, 체력, 이동 속도 등 다양한 능력치 유형을 정의하고 활용할 수 있습니다.
	SpecialAbilityId special_ability_id_ = SpecialAbilityId::Undefined; // 특수 능력 노드인 경우, 해당 능력을 식별하는 ID. 예시에서는 "적 처치 시 체력 회복" 능력이 SPECIAL_ABILITY_DUST_COLLECT_NODE_ID로 정의된다고 가정하고 있습니다.
	AttributeCalculationType calc_type_ = AttributeCalculationType::Undefined; // 능력치 증가 계산 방식. 필요에 따라 덧셈 방식, 곱셈 방식 등 다양한 계산 방식을 정의하고 활용할 수 있습니다.

	// --- 로직용 연결 데이터 ---
	_int unlock_character_id_ = -1; // 이 캐릭터를 얻어야 '발견'됨. 필요에 따라 특정 스테이지 클리어, 특정 노드 습득 등 다양한 조건으로 노드 발견을 설정할 수 있습니다.

	// 일단은 부모노드는 하나만 존재한다고 가정, 필요에 따라 std::vector<_uint> parent_node_ids_ 같은 형태로 변경 가능
	// 부모 노드가 존재하지 않는 경우 -1로 설정하여 무조건 잠금 해제된 상태로 시작하도록 함
	_int parent_node_id_ = -1;

	// 부모 노드가 특정 레벨 이상이어야 잠금 해제되는 경우를 위한 변수. 필요에 따라 부모 노드 레벨업 시스템이 구현되면 이 부분을 활용하여 노드 간의 레벨 의존성을 관리할 수 있습니다.
	_uint required_parent_node_lv_ = 0;

	// --- 자식 노드 정보 ---
	// 자식 노드 ID와 연결 방향 정보 (예: { {child_node_id, direction}, ... }). 필요에 따라 자식 노드가 여러 개 존재하거나 다양한 방향으로 연결되는 경우를 관리할 수 있습니다.
	std::vector<std::pair<_uint, NodeDirection>> children_nodes_info_;
};

struct UserDataJsonInfo
{
	_uint id_ = 0;

	// 유저 데이터에 필요한 변수들을 여기에 추가. 예시에서는 코인 수와 획득한 노드 ID 리스트를 포함.
	_uint coin_count_ = 0;

	// 플레이어가 잠금 해제한 캐릭터의 ID 리스트. 필요에 따라 캐릭터 잠금 해제 시스템이 구현되면 이 부분을 활용하여 플레이어가 잠금 해제한 캐릭터를 관리할 수 있습니다.
	std::vector<_uint> unlocked_character_ids_;

	// 플레이어가 획득한 노드의 ID, 레벨 쌍. 필요에 따라 노드 레벨업 시스템이 구현되면 이 부분을 활용하여 플레이어가 획득한 노드와 그 레벨을 관리할 수 있습니다.
	std::vector<std::pair<_uint, _uint>> acquired_node_ids_;

	// 플레이어의 현재 스테이지 진행 상황을 나타내는 변수. 필요에 따라 플레이어가 클리어한 스테이지 수나 현재 스테이지 번호 등을 관리하는 데 활용할 수 있습니다.
	_uint stage_progress_ = 0;
};

struct AttributeStat
{
	// --- 특수 능력 관련 변수 ---
	// 특수 능력은 단일 노드로 구현된다고 가정하고, 해당 노드가 활성화되었는지 여부를 나타내는 변수입니다.
	// 필요에 따라 특수 능력이 여러 개 존재하거나 레벨업 시스템이 구현되면 이 부분을 확장하여 관리할 수 있습니다.
	// 비트 마스크 방식을 차용하도록 변경할 수도 있음 (예: uint32_t special_abilities_ = 0; // 각 비트가 특정 특수 능력의 활성화 여부를 나타냄)
	_bool special_ability_dust_collect_ = false;	

	// --- 능력치 증가 수치를 관리하는 변수들 ---
	_float attack_increase_ = 0.f; // 공격력 증가량
	_float attack_increase_rate_ = 1.f; // 공격력 증가율 (곱셈 방식으로 증가하는 노드가 있을 경우 활용)

	_float hp_increase_ = 0.f; // 체력 증가량
	_float hp_increase_rate_ = 1.f; // 체력 증가율 (곱셈 방식으로 증가하는 노드가 있을 경우 활용)

	_float move_speed_increase_ = 0.f; // 이동 속도 증가량
	_float move_speed_increase_rate_ = 1.f; // 이동 속도 증가율 (곱셈 방식으로 증가하는 노드가 있을 경우 활용)

	_float attack_range_increase_ = 0.f; // 공격 범위 증가량
	_float attack_range_increase_rate_ = 1.f; // 공격 범위 증가율 (곱셈 방식으로 증가하는 노드가 있을 경우 활용)

	_float collection_range_increase_ = 0.f; // 수집 범위 증가량
	_float collection_range_increase_rate_ = 1.f; // 수집 범위 증가율 (곱셈 방식으로 증가하는 노드가 있을 경우 활용)

	// 같은 카테고리의 능력치를 구조체로 묶어서 관리할 수도 있다
	/*
		struct Stat
		{
			_bool is_additive_active_ = false;
			_float additive_increase_ = 0.f; // 덧셈 방식 증가량
			_bool is_multiplicative_active_ = false;
			_float multiplicative_increase_rate_ = 1.f; // 곱셈 방식 증가율
		}

		Stat attack_stat_;
		Stat hp_stat_;
		이런 식으로 구성하는 것도 가능하다.

		- is_additive_active_와 is_multiplicative_active_ 는 비트 마스크 방식으로 변경할 수도 있다.
		- (is_additive_active_ || is_multiplicative_active_) 같은 식으로 해당 방식의 노드가 활성화되었는지 여부를 체크할 수도 있다.
	*/
};

struct AttributeLevelInfo
{
	_float value_ = 0.f; // 레벨당 증가 수치
	AttributeCalculationType calc_type_ = AttributeCalculationType::Undefined; // 증가 계산 방식
	_uint cost_ = 0; // 레벨업 비용. 필요에 따라 레벨업마다 증가하는 형태로, cost_per_lv_ 같은 변수를 추가하여 계산할 수도 있음

	//_float increase_ = 0.f; // 레벨당 증가량
	//_float increase_rate_ = 1.f; // 레벨당 증가율 (곱셈 방식으로 증가하는 노드가 있을 경우 활용)
	//_uint cost_ = 0; // 노드 레벨업 비용. 레벨업마다 증가하는 형태로, cost_per_lv_ 같은 변수를 추가하여 계산할 수도 있음
};

// 어트리뷰트 레벨 별로 저장이 필요한 데이터들
struct AttributeLevelJsonInfo
{
	_uint id_ = 0; // AttributeType 값이다

	// 레벨별 증가량과 비용 정보를 담고 있는 벡터. 인덱스가 레벨을 나타내도록 구성 (예: lv_table_[0]은 레벨 1의 정보, lv_table_[1]은 레벨 2의 정보, ...)
	std::vector<AttributeLevelInfo> lv_table_;
};

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

enum class NodeType { Undefined, Common, Major, Keystone };
enum class NodeState { Undefined, Hidden, Discovered, Unlocked, Acquired };
enum class AttributeType
{
	Undefined = 0,	// 초기화 값
	SpecialAbility,	// 특수 능력 (예: "적 처치 시 체력 회복")
	Attack,
	Hp,
	MoveSpeed,
	AttackRange,
};

struct AttributeNodeJsonInfo
{
	// --- 기본 정보 ---
	_uint id_ = 0;
	std::string name_;
	NodeType type_ = NodeType::Undefined;
	std::string desc_;

	// --- 3단계 시스템용 변수 ---
	NodeState state_ = NodeState::Undefined;
	_uint curr_lv_ = 0;
	_uint last_lv_ = 0;

	// --- 로직용 연결 데이터 ---
	_uint character_unlock_id_ = 0;
	// pair<자식 노드 ID, 방향 정보(int/enum)>
	std::vector<std::pair<_uint, _uint>> children_nodes_info_;
};

struct UserDataJsonInfo
{
	_uint id_ = 0;

	// 유저 데이터에 필요한 변수들을 여기에 추가. 예시에서는 코인 수와 획득한 노드 ID 리스트를 포함.
	_uint coin_count_ = 0; // 플레이어가 획득한 코인 수
	std::vector<std::pair<_uint, _uint>> acquired_node_ids_; // 플레이어가 획득한 노드의 ID, 레벨 쌍. 필요에 따라 노드 레벨업 시스템이 구현되면 이 부분을 활용하여 플레이어가 획득한 노드와 그 레벨을 관리할 수 있습니다.
};

//// 노드 레벨 별로 저장이 필요한 데이터들
//struct AttributeNodeLevelJsonInfo
//{
//	_uint node_id_ = 0;
//
//	// 레벨 별로 저장이 필요한 데이터들을 여기에 추가. 예시에서는 공격력 증가량과 이동 속도 증가량을 포함.
//	_uint level_ = 0;
//	_float attack_increase_ = 0.f; // 공격력 증가량
//	_float hp_increase_ = 0.f; // 체력 증가량
//	_float move_speed_increase_ = 0.f; // 이동 속도 증가량
//
//	AttributeType stat_type_ = AttributeType::Undefined; // 노드가 증가시키는 능력치의 유형. 필요에 따라 공격력, 체력, 이동 속도 등 다양한 능력치 유형을 정의하고 활용할 수 있습니다.
//	_uint cost_ = 0; // 노드 레벨업 비용. 레벨업마다 증가하는 형태로, cost_per_lv_ 같은 변수를 추가하여 계산할 수도 있음
//};
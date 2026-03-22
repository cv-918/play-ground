#pragma once

#pragma region [ 코어 시스템 관련 ]
enum class CollisionLayer
{
	PlayerBody,
	PlayerAttack,
	PlayerCollector,
	EnemyBody,
	EnemyAttack,
	EnemyBullet,
	PropsBody,
	End
};
#pragma endregion

#pragma region [ 게임 플레이 관련 ]
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
	SphereCollider,
	RectCollider,
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

enum class PropsType
{
	Undefined = 0,
	Dust,
};

enum class PropsState
{
	Undefined = 0,
	Idle,
	Tracking,
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
	// ------ 몬스터 분류 관련 ------
	EnemyTier tier_ = EnemyTier::Undefined;
	EnemySpecialRole role_ = EnemySpecialRole::Undefined;

	// ------ 보상 관련 ------
	_uint exp_reward_ = 0;
	_uint dust_reward_ = 0; // 드랍하는 먼지 보상량
	_uint dust_resource_count_ = 0; // 드랍하는 먼지 수

	// ------ 투사체 관련 ------
	// 투사체 종류가 다양해진다면, 투사체 스크립트 따로 빼서 넘기는게 나을 수도 있다. 그렇지 않을 경우 이대로
	EnemyProjectilePattern projectile_pattern_ = EnemyProjectilePattern::Undefined;
	_float projectile_damage_ = 0.f;
	_float projectile_speed_ = 0.f;

	// ------ 이동 관련 ------
	MovementPattern movement_pattern_ = MovementPattern::Undefined;
	_uint move_speed_unit_ = 0; // 몬스터의 이동 속도 단위. 실제 이동 속도는 이 값에 20.f를 곱해서 계산
};

struct PlayableCharacterJsonInfo : public UnitJsonInfo
{
	_float attack_range_ = 0.f;
	_float collector_size_ = 0.f;

	_float move_speed_max_ = 0.f;	// 최대 이동 속도
	_float acceleration_ = 0.f;		// 가속도. 높을수록 빠르게 최대 이동 속도에 도달
	_float friction_ = 0.f;			// 마찰 계수. 높을수록 빠르게 감속
};

struct UnitCreationInfo
{
	_Vector3 position_;
	_Vector3 look_point_;
};
#pragma endregion

#pragma region [ 컨텐츠 관련 ]
enum class NodeGrade
{
	Undefined,
	Common,
	Major,
	Keystone
};

enum class NodeTier
{
	Undefined,
	Tier1,
	Tier2,
	Tier3
};

enum class NodeState
{
	Undefined,
	Hidden,				// 발견되지 않은 노드 (발견 조건을 충족하지 못한 상태)
	Locked,				// 잠긴 노드 (발견 조건을 충족했지만 습득 조건을 충족하지 못한 상태)
	Unlocked,			// 잠금 해제된 노드 (잠금 해제 조건을 충족하고 습득 가능한 상태)
	Acquired,			// 습득한 노드 (습득 조건을 충족하여 레벨 1 이상인 상태)
	Mastered			// 마스터한 노드 (습득 조건을 충족하여 최대 레벨인 상태)
};

enum class AttributeType
{
	Undefined = 0,		// 초기화 값
	SpecialAbility,		// 특수 능력 (예: 특수 능력 개방, 조건부 발동 능력 등)
	// 이 값을 SpecialAbilityId와 조합하여 특정 특수 능력을 식별할 수 있습니다. 예시에서는 "적 처치 시 체력 회복" 능력이 SPECIAL_ABILITY_DUST_COLLECT_NODE_ID로 정의된다고 가정하고 있습니다.

	Attack,				// 공격력
	Hp,					// 체력
	MoveSpeed,			// 이동 속도 (예: 플레이어의 이동 속도 증가)
	AttackRange,		// 공격 범위 (예: 플레이어의 공격 범위 증가)
	CollectionRange,	// 수집 범위 (예: 아이템이나 자원 수집 범위)
	Runtime,			// 플레이 시간 증가량
};

enum class SpecialAbilityId
{
	Undefined = 0,		// 초기화 값
	DustCollect,
};

enum class AttributeCalculationType
{
	Undefined = 0,		// 초기화 값
	Additive,			// 덧셈 방식으로 증가 (예: 공격력 +10)
	Multiplicative,		// 곱셈 방식으로 증가 (예: 공격력 *1.1)
};

enum class NodeDirection
{
	Undefined = 0,		// 초기화 값
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
	// ------ 기본 정보 ------
	_uint id_ = 0;

	// 노드 이름
	std::string name_;

	// 노드 설명
	std::string desc_;

	// 노드의 최대 레벨.
	_uint max_lv_ = 0;

	// ------ 노드 등급 정보 ------
	// 노드의 등급 (예: Common, Major, Keystone). 필요에 따라 노드 등급에 따른 추가적인 효과나 제한 사항이 있을 수 있습니다.
	NodeGrade grade_ = NodeGrade::Undefined;

	// 노드의 티어 (예: Tier1, Tier2, Tier3). 필요에 따라 노드 티어에 따른 추가적인 효과나 제한 사항이 있을 수 있습니다.
	NodeTier tier_ = NodeTier::Undefined;

	// ------ 노드 습득 정보 ------
	// 노드 습득에 필요한 코스트
	_uint cost_ = 0;

	// 노드 레벨업 시 코스트 증가율. 예시로 레벨업마다 코스트가 20% 증가하는 경우 0.2f로 설정
	_float cost_growth_rate_ = 0.f;

	// ------ 능력치 증가 정보 ------
	// 노드가 증가시키는 능력치의 유형.
	AttributeType stat_type_ = AttributeType::Undefined;

	// 노드가 증가시키는 능력치의 기본 수치. 필요에 따라 레벨업마다 증가하는 형태로, value_per_lv_ 같은 변수를 추가하여 계산할 수도 있음
	_float stat_value_ = 0.f;

	// 특수 능력 노드인 경우, 해당 능력을 식별하는 ID.
	SpecialAbilityId special_ability_id_ = SpecialAbilityId::Undefined;

	// 능력치 증가 계산 방식
	AttributeCalculationType calc_type_ = AttributeCalculationType::Undefined;

	// ------ 잠금 해제 조건 정보 ------
	// 이 노드를 잠금 해제하기 위해 필요한 캐릭터 ID
	_int unlock_character_id_ = -1;

	// 이 노드를 잠금 해제하기 위해 필요한 부모 노드 ID
	// 부모 노드가 존재하지 않는 경우 -1로 설정하며, 이 경우 무조건 잠금 해제된 상태로 시작하도록 함.
	_int parent_node_id_ = -1;

	// 부모 노드가 존재하는 경우, 이 노드를 잠금 해제하기 위해 요구되는 부모 노드의 레벨.
	_uint required_parent_node_lv_ = 0;

	// ------ 자식 노드 정보 ------
	// 자식 노드 ID와 연결 방향 정보 (예: { {child_node_id, direction}, ... }). 필요에 따라 자식 노드가 여러 개 존재하거나 다양한 방향으로 연결되는 경우를 관리할 수 있습니다.
	std::vector<std::pair<_uint, NodeDirection>> children_nodes_info_;
};

struct Stat
{
	Stat() : is_additive_active_(false), additive_increase_(0.f), is_multiplicative_active_(false), multiplicative_increase_rate_(1.f) {}

	_bool is_additive_active_ = false;			// 덧셈 방식 증가가 활성화되었는지 여부 (현재 미사용)
	_float additive_increase_ = 0.f;			// 덧셈 방식 증가량
	_bool is_multiplicative_active_ = false;	// 곱셈 방식 증가가 활성화되었는지 여부 (현재 미사용)
	_float multiplicative_increase_rate_ = 1.f; // 곱셈 방식 증가율 (1.f는 기본 상태, 예: 공격력 *1.1은 1.1f로 설정)
};

struct AttributeStat
{
	const Stat& GetStat(AttributeType _type) const
	{
		auto it = attribute_stats_.find(_type);
		if (it != attribute_stats_.end())
			return it->second;
		else
			return Stat(); // 기본값 반환
	}

	const std::map<AttributeType, Stat>& GetStats() const { return attribute_stats_; }

	void IncreaseStat(AttributeType _type, AttributeCalculationType _calc, _float _value)
	{
		auto it = attribute_stats_.find(_type);
		if (it != attribute_stats_.end())
		{
			switch (_calc)
			{
			case AttributeCalculationType::Additive:
				it->second.is_additive_active_ = true;
				it->second.additive_increase_ += _value;
				break;
			case AttributeCalculationType::Multiplicative:
				it->second.is_multiplicative_active_ = true;
				it->second.multiplicative_increase_rate_ *= _value;
				break;
			}
		}
		else
		{
			// 존재하지 않는 AttributeType인 경우, 필요에 따라 로그를 남기거나 예외 처리를 할 수 있습니다.
			_DEBUG_MSGBOX(_T("Undefined AttributeType: %d"), s_int(_type));
		}
	}

	// ------ 특수 능력 관련 ------
	// 특수 능력은 단일 노드로 구현된다고 가정하고, 해당 노드가 활성화되었는지 여부를 나타내는 변수입니다.
	// 필요에 따라 특수 능력이 여러 개 존재하거나 레벨업 시스템이 구현되면 이 부분을 확장하여 관리할 수 있습니다.
	// 비트 마스크 방식을 차용하도록 변경할 수도 있음 (예: uint32_t special_abilities_ = 0; // 각 비트가 특정 특수 능력의 활성화 여부를 나타냄)
	_bool special_ability_dust_collect_ = false;

private:
	// ------ 능력치 증가 관련  ------
	std::map<AttributeType, Stat> attribute_stats_ = {
		{ AttributeType::Attack, {}},
		{ AttributeType::Hp, {}},
		{ AttributeType::MoveSpeed, {}},
		{ AttributeType::AttackRange, {}},
		{ AttributeType::CollectionRange, {}},
		{ AttributeType::Runtime, {}},
	};
};
#pragma endregion

#pragma region [ 유저 데이터 관련 ]
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
#pragma endregion

#pragma region [ 디버그 정보 관련 ]
enum class __DebugColliderRenderState
{
	// 비활성화 상태. 콜라이더 렌더링이 완전히 꺼진 상태입니다.
	OnDisabled,
	
	// 일반 상태. 충돌 상태와 무관하게 모든 콜라이더가 초록색으로 렌더링됩니다.
	OnNormal,

	// 충돌 상태. 충돌이 감지된 콜라이더는 빨간색으로 렌더링되고, 충돌이 감지되지 않은 콜라이더는 초록색으로 렌더링됩니다.
	OnCollision,

	Count,
};
#pragma endregion

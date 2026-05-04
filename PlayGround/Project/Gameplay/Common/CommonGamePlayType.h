#pragma once

#include "HitReaction.h"

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

	TownPlayerInteraction,
	TownNpcInteraction,
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
	WorkStation,
	Count,
};

enum class StageState
{
	Undefined,
	Enter,
	Ready,
	Play,
	Pause,
	Clear,
	Result,
	Exit
};

enum class ComponentType
{
	Undefined,
	Transform,
	Status,
	Movement,
	SphereCollider,
	RectCollider,
	EllipseCollider,
	Combat,
	GameplayEffectController,
	SpriteRenderer,
	SpriteAnimator,
};

enum class MovementPattern
{
	Undefined = 0,	// 초기화 값
	Directional = 1,	// 직선 이동
	Target = 2,		// 타겟 추적 이동
	Count = 3,
};

enum class NavBoundaryMode
{
	None = 0,					// 이동 영역 제한 없음
	ContainFootprint = 1,		// 발밑 footprint만 이동 가능 영역 안에 유지
	ContainVisualBounds = 2,	// footprint + 시각 여백까지 화면 안쪽에 유지
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

enum class EnemyAbilityFlags : _uint
{
	None = 0,
	ContactAttack = 1 << 0,
	Dash = 1 << 1,
	ProjectileAttack = 1 << 2,
};

/** @brief 비트 OR 연산자 */
inline EnemyAbilityFlags operator|(EnemyAbilityFlags _lhs, EnemyAbilityFlags _rhs)
{
	return s_cast(EnemyAbilityFlags, s_uint(_lhs) | s_uint(_rhs));
}

/** @brief 비트 AND 연산자 */
inline EnemyAbilityFlags operator&(EnemyAbilityFlags _lhs, EnemyAbilityFlags _rhs)
{
	return s_cast(EnemyAbilityFlags, s_uint(_lhs) & s_uint(_rhs));
}

/** @brief 비트 OR 대입 연산자 */
inline EnemyAbilityFlags& operator|=(EnemyAbilityFlags& _lhs, EnemyAbilityFlags _rhs)
{
	_lhs = (_lhs | _rhs);
	return _lhs;
}

/** @brief 특정 Ability 플래그 포함 여부 확인 */
inline _bool HasEnemyAbilityFlag(EnemyAbilityFlags _flags, EnemyAbilityFlags _flag)
{
	return 0 != (s_uint(_flags) & s_uint(_flag));
}

enum class ProjectilePattern
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
	Bounce,
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

	std::string image_path_; // 플레이어 캐릭터의 이미지 경로. 필요에 따라 UI에서 캐릭터 이미지를 표시하거나, 게임 오브젝트의 스프라이트 렌더링에 활용할 수 있습니다.
};

struct AnimationClipPathInfo
{
	/** 클립 이름. 예: idle, run, attack */
	std::string clip_name_;

	/** 클립 프레임들이 들어있는 디렉터리 경로 */
	std::string directory_;

	/** 파일명 접두어. 예: Idle_, Move */
	std::string prefix_;

	/** 시작 프레임 번호 */
	_int start_index_ = 1;

	/** 끝 프레임 번호 */
	_int end_index_ = 1;

	/** 초당 프레임 수 */
	_float fps_ = 8.0f;

	/** 루프 여부 */
	_bool loop_ = true;
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

	// ------ 이동 관련 ------
	MovementPattern movement_pattern_ = MovementPattern::Undefined;
	_uint move_speed_unit_ = 0; // 실제 이동 속도는 이 값에 20.f를 곱해서 계산
	NavBoundaryMode nav_boundary_mode_ = NavBoundaryMode::None;
	_float nav_footprint_radius_ = 0.f;
	_float nav_footprint_offset_y_ = 0.f;
	_float nav_visual_margin_x_ = 0.f;
	_float nav_visual_margin_y_ = 0.f;

	// ------ 능력 관련 ------
	EnemyAbilityFlags ability_flags_ = EnemyAbilityFlags::None;

	// ------ 공통 공격 관련 ------
	_float attack_range_ = 0.f;            // 공격 개시 범위
	_double attack_motion_duration_ = 0.0; // 공격 모션 시간
	_float contact_impact_ = 0.f;
	_float contact_knockback_distance_world_px_ = 0.f;
	_float contact_knockback_duration_sec_ = 0.f;
	KnockbackCurve contact_knockback_curve_ = KnockbackCurve::OutCubic;
	_float contact_camera_shake_scale_ = 0.f;

	// ------ 돌진 관련 ------
	_float dash_speed_ = 0.f;
	_double dash_duration_ = 0.0;
	_double dash_charge_duration_ = 0.0;
	_double dash_cooldown_ = 0.0;
	_double dash_recovery_duration_ = 0.0;
	_float dash_damage_multiplier_ = 1.f;
	_float dash_impact_ = 0.f;
	_float dash_knockback_distance_world_px_ = 0.f;
	_float dash_knockback_duration_sec_ = 0.f;
	KnockbackCurve dash_knockback_curve_ = KnockbackCurve::OutCubic;
	_float dash_camera_shake_scale_ = 0.f;
	_float dash_knockback_power_ = 0.f;

	// ------ 투사체 관련 ------
	ProjectilePattern projectile_pattern_ = ProjectilePattern::Undefined;
	_float projectile_damage_ = 0.f;
	_float projectile_speed_ = 0.f;
	_float projectile_impact_ = 0.f;
	_float projectile_knockback_distance_world_px_ = 0.f;
	_float projectile_knockback_duration_sec_ = 0.f;
	KnockbackCurve projectile_knockback_curve_ = KnockbackCurve::OutCubic;
	_float projectile_camera_shake_scale_ = 0.f;
	_float projectile_knockback_power_ = 0.f;
};

struct PlayableCharacterJsonInfo : public UnitJsonInfo
{
	_float attack_range_ = 0.f;
	_float collector_size_ = 0.f;

	_float move_speed_max_ = 0.f;	// 최대 이동 속도
	_float acceleration_ = 0.f;		// 가속도. 높을수록 빠르게 최대 이동 속도에 도달
	_float friction_ = 0.f;			// 마찰 계수. 높을수록 빠르게 감속
	NavBoundaryMode nav_boundary_mode_ = NavBoundaryMode::ContainFootprint;
	_float nav_footprint_radius_ = 0.f;
	_float nav_footprint_offset_y_ = 0.f;
	_float nav_visual_margin_x_ = 0.f;
	_float nav_visual_margin_y_ = 0.f;

	/** 실제 애니메이션 클립 메타 정보 */
	std::vector<AnimationClipPathInfo> animation_clips_;
};

struct UnitCreationInfo
{
	_Vector3 position_;
	_Vector3 look_point_;
	_float stat_multiplier_ = 1.f; // 스탯 배율. 필요에 따라 몬스터의 체력이나 공격력을 스테이지 진행 시간에 비례해서 증가시키는 로직에서 활용할 수 있습니다.
	_bool skip_spawn_fade_ = false; // 초기 배치처럼 즉시 활성화되어야 하는 경우 Spawn 페이드를 건너뛴다.
	_bool has_nav_mesh_ = false; // 생성 시점에 유닛이 참조할 스테이지 nav mesh가 함께 전달되었는지 여부
	_Rect nav_mesh_{}; // 유닛이 사용하는 이동 가능 영역. 현재는 최종 위치 클램프 용도로 사용

	// 이 유닛을 소유하는 게임 오브젝트에 대한 포인터. 필요에 따라 스킬 오브젝트가 소환될 때, 이 정보를 활용하여 스킬 오브젝트가 소유자(예: 플레이어 캐릭터)의 위치나 방향을 참조하거나, 소유자와 상호작용하는 로직에서 활용할 수 있습니다.
	class GameObjectBase* owner_ = nullptr;
};

enum class RunEndReason
{
	Undefined = 0,
	TimeExpired,
	PlayerDied,
	StageProgressed,
	Abandoned,
};

struct RunSessionResult
{
	_bool is_cleared_ = false;
	RunEndReason end_reason_ = RunEndReason::Undefined;
	_bool kill_goal_reached_ = false;
	_bool stage_clear_eligible_ = false;
	_bool result_apply_eligible_ = false;
	_uint earned_coin_count_ = 0;
	_uint gained_experience_ = 0;
	_double play_time_ = 0.0;
};

struct StageJsonInfo
{
	_uint id_ = 0;

	/** 이 스테이지에서 사용할 스폰 풀의 ID. 필요에 따라 스폰 풀 정보를 활용하여 스테이지 진행 중에 적을 스폰하는 로직에서 사용할 수 있습니다. */
	_uint spawn_pool_id_ = 0;
};

struct SpawnEnemyJsonInfo
{
	/** 설정하고자 하는 적의 ID. Enemy.json에 기반합니다. */
	_uint id_ = 0;

	/** 스폰 가중치 (같은 스폰 그룹 내에서 이 값이 높을수록 더 자주 스폰됨) */
	_uint weight_ = 0;

	/** 이 적이 스폰되는 간격 (초 단위). 필요에 따라 스폰 간격이 짧을수록 더 자주 스폰되는 형태로 구현할 수 있습니다. */
	_float spawn_interval_ = 0.f;
};

struct StageSpawnPoolJsonInfo
{
	_uint id_ = 0;

	/** 스테이지에 등장하는 적들의 정보. 필요에 따라 이 정보를 활용하여 스테이지 진행 중에 적을 스폰하는 로직에서 사용할 수 있습니다. */
	std::vector<SpawnEnemyJsonInfo> spawn_enemies_info_;
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

	/** 노드 이름. 필요에 따라 UI에서 이 이름을 표시하거나, 로그 메시지 등에 활용할 수 있습니다. */
	std::string name_;

	/** 노드 설명. 필요에 따라 UI에서 이 설명을 표시하거나, 로그 메시지 등에 활용할 수 있습니다. */
	std::string desc_;

	/** 노드의 최대 레벨. 필요에 따라 레벨업 시스템이 구현되면 이 값을 활용하여 노드의 최대 레벨을 제한할 수 있습니다.  */
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

	_bool is_additive_active_ = false;			// 덧셈 방식 증가가 활성화되었는지 여부
	_float additive_increase_ = 0.f;			// 덧셈 방식 증가량
	_bool is_multiplicative_active_ = false;	// 곱셈 방식 증가가 활성화되었는지 여부
	_float multiplicative_increase_rate_ = 1.f; // 곱셈 방식 증가율 (1.f는 기본 상태, 예: 공격력 *1.1은 1.1f로 설정)

	_float GetTotalIncrease(_float base_value) const
	{
		_float total_value = base_value;
		if (is_additive_active_)
			total_value += additive_increase_;
		if (is_multiplicative_active_)
			total_value *= multiplicative_increase_rate_;
		return total_value;
	}
};

struct AttributeStat
{
	const Stat& GetStat(AttributeType _type) const
	{
		auto it = attribute_stats_.find(_type);
		if (it != attribute_stats_.end())
			return it->second;

		static Stat default_stat; // 기본값을 담는 정적 변수
		return default_stat;
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

/** 스킬 유형. 필요에 따라 스킬의 행동이나 효과를 관리하는 로직에서 활용할 수 있습니다. 예시에서는 액티브 스킬, 설치형 스킬, 소환형 스킬로 구분하고 있습니다. */
enum class SkillType
{
	Undefined = 0,
	Active,
	Deployable,
	Summon,
	Count,
};

/** 스킬 잠금 해제 방식. 필요에 따라 스킬 잠금 해제 조건을 관리하는 로직에서 활용할 수 있습니다. */
enum class SkillUnlockType
{
	Undefined = 0,
	NodeUnlock,		// 노드 잠금 해제 시 획득
	StageClear,		// 특정 스테이지 클리어 시 획득
	ResourceAmount,	// 특정 자원량 달성 시 획득
	TimeElapsed,	// 플레이 시간 경과 시 획득
};

enum class MainStoryProgress
{
	Undefined = 0,
	Prologue1,
	Prologue2,
	Prologue3,
	Prologue4,
	Prologue5,

	Chapter1,
	Chapter2,
};

struct SkillJsonInfo
{
	/** @defgroup SKILL_TABLE Skill Table
	 * 스킬 테이블에 포함될 수 있는 정보들입니다. 필요에 따라 스킬의 행동이나 효과를 관리하는 로직에서 활용할 수 있습니다. 예시에서는 스킬 유형, 최대 레벨, 잠금 해제 방식, 쿨다운 시간, 지속 시간 등을 포함하고 있습니다.
	 * @{
	 */

	 /** @name [COMMON] 공용 정보 */
	 ///@{
	 /** 스킬 ID. 필요에 따라 스킬의 행동이나 효과를 관리하는 로직에서 활용할 수 있습니다. 예시에서는 스킬의 고유 식별자로 사용하고 있습니다. */
	_uint id_ = 0;

	/** 스킬 이름. 필요에 따라 스킬의 행동이나 효과를 관리하는 로직에서 활용할 수 있습니다. 예시에서는 스킬의 기본적인 이름을 담는 용도로 사용하고 있습니다. */
	std::string name_;

	/** 스킬 설명. 필요에 따라 스킬의 행동이나 효과를 관리하는 로직에서 활용할 수 있습니다. 예시에서는 스킬의 기본적인 설명을 담는 용도로 사용하고 있습니다. */
	std::string desc_;

	/** 스킬 아이콘 이미지 경로. UI에서 스킬 슬롯, 툴팁, 스킬 선택창 등에 표시할 때 사용합니다. */
	std::string icon_path_;
	///@}

	/** 스킬의 유형. 필요에 따라 스킬의 행동이나 효과를 관리하는 로직에서 활용할 수 있습니다. 예시에서는 액티브 스킬, 설치형 스킬, 소환형 스킬로 구분하고 있습니다. */
	SkillType type_ = SkillType::Undefined;

	/** 스킬의 최대 레벨. 필요에 따라 스킬 레벨업 시스템이 구현되면 이 부분을 활용하여 스킬의 최대 레벨을 관리할 수 있습니다. */
	_uint max_lv_ = 0;

	/** 스킬 잠금 해제 방식. 필요에 따라 스킬 잠금 해제 조건을 관리하는 로직에서 활용할 수 있습니다. 예시에서는 노드 잠금 해제 시 스킬이 획득된다고 가정하고 있습니다. */
	SkillUnlockType unlock_type_ = SkillUnlockType::Undefined;

	/** 스킬의 기본 쿨다운 시간 (초 단위). 필요에 따라 스킬 레벨업 시 쿨다운이 감소하는 형태로, cooldown_reduction_per_lv_ 같은 변수를 추가하여 계산할 수도 있음 */
	_double cooldown_ = 0.0;

	/** 스킬의 지속 시간 (초 단위). 필요에 따라 스킬 레벨업 시 지속 시간이 증가하는 형태로, duration_increase_per_lv_ 같은 변수를 추가하여 계산할 수도 있음 */
	_double duration_ = 0.0;

	/** 스킬의 도트 피해 간격 (초 단위). 필요에 따라 스킬이 일정 간격으로 도트 피해를 주는 형태로 구현할 수 있습니다. */
	_double dot_interval_ = 0.0;

	/** 스킬의 효과 범위 (예: 스킬이 반경 3미터 내의 적에게 피해를 주는 경우 3.f로 설정). 필요에 따라 스킬이 특정 범위 내의 적에게 영향을 주는 형태로 구현할 수 있습니다. */
	_float area_of_effect_ = 0.f;

	/** 스킬의 데미지 배율 (예: 공격력의 150%에 해당하는 피해를 주는 경우 1.5f로 설정). 필요에 따라 스킬이 공격력과 연동된 피해를 주는 형태로 구현할 수 있습니다. */
	_float damage_multiplier_ = 0.f;

	/** 스킬의 고정 피해량. 필요에 따라 스킬이 공격력과 무관하게 일정한 피해를 주는 형태로 구현할 수 있습니다. */
	_float flat_damage_ = 0.f;

	/** @name [PROJECTILE] 투사체 정보 */
	///@{
	/** 발사되는 투사체의 수.필요에 따라 스킬이 여러 개의 투사체를 발사하는 형태로 구현할 수 있습니다. */
	_uint proj_count_ = 1;

	/** 투사체의 이동 속도.필요에 따라 스킬이 발사하는 투사체의 속도를 관리하는 로직에서 활용할 수 있습니다. */
	_float proj_speed_ = 0.0f;

	/** 투사체의 생명 시간 (초 단위). 필요에 따라 스킬이 발사하는 투사체가 일정 시간 후에 소멸하는 형태로 구현할 수 있습니다. */
	_double proj_lifetime_ = 0.0;

	/** 투사체의 크기. 필요에 따라 스킬이 발사하는 투사체의 크기를 관리하는 로직에서 활용할 수 있습니다. */
	_float proj_size_ = 0.f;
	///@}
	/** @} */
};
#pragma endregion

#pragma region [ 유저 데이터 관련 ]
struct UserDataJsonInfo
{
	/** 플레이어의 고유 ID. 필요에 따라 플레이어 데이터 관리 시스템이 구현되면 이 부분을 활용하여 플레이어 데이터를 식별하고 관리할 수 있습니다. */
	_uint id_ = 0;

	/** 플레이어가 보유한 먼지의 총량. 필요에 따라 먼지 수집 시스템이 구현되면 이 부분을 활용하여 플레이어가 보유한 먼지를 관리할 수 있습니다. */
	_uint dust_count_ = 0;

	/** 플레이어가 획득한 총 경험치 양. 필요에 따라 경험치 시스템이 구현되면 이 부분을 활용하여 플레이어의 경험치를 관리할 수 있습니다. */
	_uint experience_ = 0;

	/** 플레이어가 잠금 해제한 캐릭터의 ID 목록. 필요에 따라 캐릭터 잠금 해제 시스템이 구현되면 이 부분을 활용하여 플레이어가 잠금 해제한 캐릭터들을 관리할 수 있습니다. */
	std::vector<_uint> unlocked_character_ids_;

	/** 플레이어가 습득한 노드의 ID 목록. 필요에 따라 노드 습득 시스템이 구현되면 이 부분을 활용하여 플레이어가 습득한 노드들을 관리할 수 있습니다. */
	std::vector<std::pair<_uint, _uint>> acquired_node_ids_;

	/** 플레이어가 현재 장착한 스킬 ID. 비어 있는 슬롯은 -1을 사용합니다. */
	std::array<_int, 2> equipped_skill_ids_ = { -1, -1 };

	/** 플레이어의 현재 스테이지 진행 상황을 나타내는 변수. 필요에 따라 플레이어가 클리어한 스테이지 수나 현재 스테이지 번호 등을 관리하는 데 활용할 수 있습니다. */
	_uint stage_progress_ = 0;

	/** 플레이어의 메인 스토리 진행 상황을 나타내는 변수. 필요에 따라 플레이어가 메인 스토리에서 어느 지점까지 진행했는지를 관리하는 데 활용할 수 있습니다. */
	MainStoryProgress main_story_progress_ = MainStoryProgress::Undefined;
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

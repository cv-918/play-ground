#pragma once

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

enum class EnemyGrade
{
	Undefined = 0,	// 초기화 값
	Common,			// 일반		| 자원 공급용1
	UnCommon,		// 중급		| 자원 공급용2
	Danger,			// 위험		| 플레이 흐름 변화 유도
	Special,		// 특수		| 플레이 흐름 변화 유도
	Count,
};

enum class EnemyRole
{
	Undefined = 0,	// 초기화 값
	Tanky,			// 고체력형 | 높은 HP 배율
	HighLoot,		// 고보상형	| 높은 자원 배율
	Ranger,			// 공격형	| 투사체
	Mutant,			// 변이형	| 분열/강화
	Count,
};

struct EnemyJsonInfo
{
	// 공용 필드
	EnemyCategory category_ = EnemyCategory::Undefined;
	EnemyGrade grade_ = EnemyGrade::Undefined;

	// 선택적으로 값이 존재하는 필드 (예: 역할군은 Special 등급에서만 존재)
	EnemyRole role_ = EnemyRole::Undefined;

	MovementPattern movement_pattern_ = MovementPattern::Undefined;
	_float move_speed_ = 0.f;

	_float scale_ = 0.f;
	_bool collidable_ = false;

	_float hp_ = 0;
	_int coin_reward_ = 0;
	//_Color color_ = Colors::White;
	
	// 필요에 따라 추가 정보 필드 (예: HP 배율, 자원 배율, 공격 패턴 등)

	EnemyJsonInfo() DEFAULT;
};

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
	Lobby,
	GamePlay,
	Count,
};
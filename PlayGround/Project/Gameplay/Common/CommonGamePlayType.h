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
	Lobby,
	GamePlay,
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
	Direct,			// 직선 발사
	Count,
};

struct EnemyJsonInfo
{
	_uint id_ = 0;
	std::string name_;

	EnemyTier tier_ = EnemyTier::Undefined;
	EnemySpecialRole role_ = EnemySpecialRole::Undefined;

	_float hp_ = 0.f;
	_float contact_damage_ = 0.f;

	_uint reward_ = 0;

	EnemyProjectilePattern projectile_pattern_ = EnemyProjectilePattern::Undefined;
	_float projectile_damage_ = 0.f;
	_float projectile_speed_ = 0.f;

	_uint split_count_ = 0; // 분열형 몬스터가 분열할 때 생성되는 자식 몬스터의 수

	MovementPattern movement_pattern_ = MovementPattern::Undefined;
	_uint move_speed_unit_ = 0; // 몬스터의 기본 이동 속도. 실제 이동 속도는 이 값에 20.f를 곱해서 계산

	_float scale_ = 0.f;
};

struct PlayableCharacterJsonInfo
{
	_uint id_ = 0;
	std::string name_;

	_float hp_ = 0.f;
	_float contact_damage_ = 0.f;

	_float move_speed_max_ = 0.f;
	_float acceleration_ = 0.f;
	_float friction_ = 0.f;
};
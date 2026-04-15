#pragma once
#include <Base/Bases.h>
#include <Base/Defines.h>

/**
 * @brief 적 유닛이 가질 수 있는 전역 행동 상태입니다.
 *
 * 전역 상태는 크게 유지하고,
 * 세부적인 phase(예: 돌진 준비/돌진 중/그로기, 발사 모션 진행 등)는
 * 각 Ability 내부에서 관리합니다.
 */
enum class EnemyActionState
{
	Spawn = 0,
	Idle,
	Move,
	Hit,
	Attack,
	Death,
};

/**
 * @brief 런타임에 등록되는 적 능력 객체의 식별 타입입니다.
 *
 * EnemyAbilityFlags는 데이터 정의용,
 * EnemyAbilityType은 런타임 객체 식별용으로 사용합니다.
 */
enum class EnemyAbilityType
{
	Undefined = 0,
	ContactAttack,
	Dash,
	ProjectileAttack,
};

/**
 * @brief EnemyJsonInfo에서 적이 보유한 능력을 표현하는 비트 플래그입니다.
 *
 * 이 값은 데이터 로딩 시 사용되며,
 * 런타임에서는 이 플래그를 기반으로 Ability 객체를 생성/등록합니다.
 */
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

/**
 * @brief 특정 플래그 보유 여부를 확인합니다.
 */
inline _bool HasEnemyAbilityFlag(EnemyAbilityFlags _flags, EnemyAbilityFlags _flag)
{
	return 0 != (s_uint(_flags) & s_uint(_flag));
}
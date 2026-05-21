#pragma once

#include <string>

#include "Common/HitReaction.h"

/**
 * @brief 적 유닛이 가질 수 있는 전역 행동 상태입니다.
 *
 * 전역 상태는 크게 유지하고,
 * 세부적인 phase(예: 돌진 중/그로기, 발사 모션 진행 등)는
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
 * @brief Enemy의 현재 공격 보정 컨텍스트입니다.
 *
 * - 각 Ability는 이 컨텍스트에 자신의 공격 보정값을 반영할 수 있습니다.
 * - 실제 충돌 공격/피해 적용은 ContactAttackAbility가 이 값을 읽어서 처리합니다.
 * - Ability끼리 직접 참조하지 않기 위한 간접 결합 지점입니다.
 */
struct EnemyAttackContext
{
	_float damage_multiplier_ = 1.f;
	HitReactionProfile reaction_;
	_bool is_dash_attack_ = false;

	void Reset()
	{
		damage_multiplier_ = 1.f;
		reaction_ = HitReactionProfile{};
		is_dash_attack_ = false;
	}
};

struct EnemyAnimationRequest
{
	std::wstring clip_name_;
	_double elapsed_ = 0.0;
	_double duration_ = 0.0;
};

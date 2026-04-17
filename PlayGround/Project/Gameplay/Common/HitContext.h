#pragma once


#include <Base/Bases.h>
#include "Core/Math/Vector3.h"
#include "HitReaction.h"

class GameObjectBase;

/**
 * @brief 피격 적용에 필요한 공통 정보입니다.
 *
 * 공격 능력이 생성하고,
 * 피격 대상이 ApplyHit()를 통해 이 정보를 적용합니다.
 */
struct HitContext
{
	// 공격 출처
	GameObjectBase* source_ = nullptr;

	// 최종 적용 데미지
	_float damage_ = 0.f;

	// 넉백 관련
	_Vector3 knockback_direction_ = _Vector3::Zero();
	_float knockback_power_ = 0.f;
	HitReactionProfile reaction_;

	// 공격 메타 정보
	_bool is_dash_attack_ = false;
};

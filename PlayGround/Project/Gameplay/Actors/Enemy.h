#pragma once
#include "UnitBase.h"

#include "Components/NonPlayableMovement.h"

class Enemy abstract : public Unit
{
protected:
	explicit Enemy(const EnemyJsonInfo* _info) : info_(_info) {}

protected:
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

	// 투사체 발사 로직
	void HandleProjectilePattern(_double _delta_time);

protected:
	const EnemyJsonInfo* info_;

	EnemySpecialRole role_ = EnemySpecialRole::Undefined;

	_double projectile_fire_timer_ = 0.0; // 투사체 발사 타이머. 발사 간격에 따라 증가시키면서 투사체 발사 여부를 결정하는 데 사용
};


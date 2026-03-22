#pragma once
#include "UnitBase.h"

#include "Components/NonPlayableMovement.h"

class Enemy : public UnitBase
{
protected:
	explicit Enemy(const EnemyJsonInfo* _info, const UnitCreationInfo& _creation_info)
		: info_(_info), creation_info_(_creation_info) {}

protected:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

	void OnDestroy() override;

	// 투사체 발사 로직
	void HandleProjectilePattern(_double _delta_time);

protected:
	const EnemyJsonInfo* info_ = nullptr;
	const UnitCreationInfo creation_info_; // 지역변수로 생성해서 사용할 확률이 매우 높기 때문에, 참조 방식이 아니라 값 방식으로 저장.

	_double projectile_fire_timer_ = 0.0; // 투사체 발사 타이머. 발사 간격에 따라 증가시키면서 투사체 발사 여부를 결정하는 데 사용
};


#pragma once

#include "Enemy.h"

// 추후에 몬스터 생성로직 개선되면 이것도 제거
#include "GamePlaySystems/StageManager.h"

class ExpDust final : public Enemy
{
public:
	explicit ExpDust(const EnemyJsonInfo* _info) : Enemy(_info) {}

private:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

	void OnDestroy() override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	void GetDamage(_float _damage) override;
};

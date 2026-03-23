#pragma once
#include "Enemy.h"

class ExpDust final : public Enemy
{
public:
	explicit ExpDust(const EnemyJsonInfo* _info, const UnitCreationInfo& _creation_info)
		: Enemy(_info, _creation_info) {}

public:
	_bool Initialize() override;

private:
	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	// IDamagable을(를) 통해 상속됨
	void GetDamage(_float _damage) override;
};

#pragma once
#include "SkillObjectBase.h"

class AtmosphericCorrosionObject final
    : public SkillObjectBase
	, public ICollidable
{
public:
	explicit AtmosphericCorrosionObject(const SkillJsonInfo* _info, const UnitCreationInfo& _c_info)
		: SkillObjectBase(_info, _c_info) {}

public:
	_bool Initialize() override;

private:
	_int Update(_double _delta_time) override;
	void OnDestroy() override;

	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	void AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider);

private:
	_double life_timer_ = 0.0;
	
	// 적의 움직임을 멈추는 기능이 아직 살아있는지 여부를 관리하는 플래그.
	_bool is_movement_disabled_ = false;

	class SphereCollider* collider_ = nullptr;
	std::vector<class Movement*> affected_movements_;
};


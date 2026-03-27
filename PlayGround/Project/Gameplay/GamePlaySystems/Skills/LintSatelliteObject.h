#pragma once
#include "SkillObjectBase.h"

class LintSatelliteObject final
    : public SkillObjectBase
	, public ICollidable
{
public:
	explicit LintSatelliteObject(const SkillJsonInfo* _info, const UnitCreationInfo& _c_info)
		: SkillObjectBase(_info, _c_info) {}

public:
	_bool Initialize() override;

private:
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

	void AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider);

private:
	_double life_timer_ = 0.0;
	_float  current_angle_ = 0.f; // 현재 회전 각도 (라디안)

	// 초기 생성 시 부여받은 오프셋 (여러 개의 위성이 있을 경우 겹치지 않게 하기 위함)
	_float  start_angle_offset_ = 0.f;

	class SphereCollider* collider_ = nullptr;
};


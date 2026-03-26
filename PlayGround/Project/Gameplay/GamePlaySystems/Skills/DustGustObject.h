#pragma once
#include "SkillObjectBase.h"

class DustGustObject final
	: public SkillObjectBase
	, public ICollidable
{
public:
	explicit DustGustObject(const SkillJsonInfo* _info, const UnitCreationInfo& _c_info)
		: SkillObjectBase(_info, _c_info) {}

public:
	_bool Initialize() override;

private:
	_int Update(_double _delta_time) override;
	void OnCollisionEnter(Collider* _this, Collider* _other) override;

private:
	_double life_timer_ = 0.0; // 투사체의 남은 수명. 필요에 따라 투사체가 일정 시간 후에 소멸하는 형태로 구현할 수 있습니다.
};


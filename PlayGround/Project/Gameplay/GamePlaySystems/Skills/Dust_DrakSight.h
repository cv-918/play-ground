#pragma once
#include "SkillBase.h"

class Dust_DrakSight final : public SkillBase
{
public:
	explicit Dust_DrakSight(const SkillJsonInfo* _info) : SkillBase(_info) {}

private:
	_bool Execute(GameObjectBase* _owner, const _Vector3& _direction) override;
};


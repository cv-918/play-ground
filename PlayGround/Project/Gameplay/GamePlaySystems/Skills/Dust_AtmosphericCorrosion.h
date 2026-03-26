#pragma once
#include "SkillBase.h"

class Dust_AtmosphericCorrosion final : public SkillBase
{
public:
	explicit Dust_AtmosphericCorrosion(const SkillJsonInfo* _info) : SkillBase(_info) {}

private:
	// SkillBase을(를) 통해 상속됨
	_bool Execute(GameObjectBase* _owner, const _Vector3& _direction) override;
};


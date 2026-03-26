#pragma once
#include "SkillBase.h"

class Dust_DustGust final : public SkillBase
{
public:
	explicit Dust_DustGust(const SkillJsonInfo* _info) : SkillBase(_info) {}

private:
	_bool Execute(GameObjectBase* _owner, const _Vector3& _direction) override;
};


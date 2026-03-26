#pragma once
#include "../../Actors/GameObjectBase.h"

class SkillObjectBase abstract
    : public GameObjectBase
{
public:
	explicit SkillObjectBase(const SkillJsonInfo* _info, const UnitCreationInfo& _c_info)
		: skill_info_(_info), creation_info_(_c_info) {}

protected:
	const SkillJsonInfo* skill_info_ = nullptr;
	const UnitCreationInfo creation_info_;
};


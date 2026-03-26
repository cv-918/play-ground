#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	SkillJsonInfo,
	id_,
	name_,
	desc_,
	type_,
	max_lv_,
	unlock_type_,
	cooldown_,
	duration_,
	dot_interval_,
	area_of_effect_,
	damage_multiplier_,
	flat_damage_,
	proj_count_,
	proj_speed_,
	proj_lifetime_
)

#define _SkillDataMgr SkillJsonDataManager::Get()

class SkillJsonDataManager final
	: public ISingleton<SkillJsonDataManager>
	, public JsonDataManager<SkillJsonInfo>
{
};


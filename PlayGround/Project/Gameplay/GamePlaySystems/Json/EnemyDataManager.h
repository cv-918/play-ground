#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	EnemyJsonInfo,
	id_,
	name_,
	body_size_,
	attack_speed_,
	hp_,
	contact_damage_,
	tier_,
	role_,
	exp_reward_,
	dust_reward_,
	dust_resource_count_,
	projectile_pattern_,
	projectile_damage_,
	projectile_speed_,
	movement_pattern_,
	move_speed_unit_
)

#define _EnemyDataMgr EnemyDataManager::Get()

class EnemyDataManager
	: public JsonDataManager<EnemyJsonInfo>
	, public ISingleton<EnemyDataManager>
{
};


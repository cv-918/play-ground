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
	reward_,
	projectile_pattern_,
	projectile_damage_,
	projectile_speed_,
	split_count_,
	movement_pattern_,
	move_speed_unit_
)

#define _EnemyDataMgr EnemyDataManager::Get()

class EnemyDataManager
	: public JsonDataManager<EnemyJsonInfo>
	, public ISingleton<EnemyDataManager>
{
	// JsonDataManager을(를) 통해 상속됨
	_bool Save(const std::string& _file_path) override;
};


#pragma once

#include "EngineSystems/Json/JsonDataManager.h"

#define _EnemyDataMgr EnemyDataManager::Get()
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(EnemyJsonInfo, id_, name_, tier_, role_, hp_, contact_damage_, reward_, projectile_pattern_, projectile_damage_, projectile_speed_, split_count_, movement_pattern_, move_speed_unit_, scale_)

class EnemyDataManager
	: public JsonDataManager<EnemyJsonInfo>
	, public ISingleton<EnemyDataManager>
{
};


#pragma once

#include "EngineSystems/Json/JsonDataManager.h"

#define _EnemyDataMgr EnemyDataManager::Get()
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(EnemyJsonInfo, category_, grade_, role_, movement_pattern_, move_speed_, scale_, collidable_, hp_, coin_reward_/*, color_*/)

class EnemyDataManager
	: public JsonDataManager<EnemyJsonInfo>
	, public ISingleton<EnemyDataManager>
{
};


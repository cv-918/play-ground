#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	StageJsonInfo,
	id_,
	spawn_pool_id_
)

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	SpawnEnemyJsonInfo,
	id_,
	weight_,
	spawn_interval_
)

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	StageSpawnPoolJsonInfo,
	id_,
	spawn_enemies_info_
)

#define _StageDataMgr StageJsonDataManager::Get()

class StageJsonDataManager final
	: public ISingleton<StageJsonDataManager>
	, public JsonDataManager<StageJsonInfo>
{
public:
	_bool Load(const std::string& _stage_path, const std::string& _pool_path);

	const StageJsonInfo* GetStageInfo(_uint _id) const;
	const StageSpawnPoolJsonInfo* GetSpawnPoolInfo(_uint _id) const;

	_uint GetStageCount() const { return s_uint(stage_table_.size()); }

private:
	std::unordered_map<_uint, StageJsonInfo> stage_table_;
	std::unordered_map<_uint, StageSpawnPoolJsonInfo> pool_table_;
};
#include "framework.h"
#include "StageJsonDataManager.h"

_bool StageJsonDataManager::Load(const std::string& _stage_path, const std::string& _pool_path)
{
	stage_table_.clear();
	pool_table_.clear();

	// 1. Stage Info 로드
	std::ifstream stage_file(_stage_path);
	if (stage_file.is_open())
	{
		nlohmann::json j;
		stage_file >> j;

		for (auto& item : j)
		{
			auto info = item.get<StageJsonInfo>();
			stage_table_[info.id_] = info;
		}
	}
	else
	{
		_DEBUG_MSGBOX(_T("Failed to open stage data file: %s"), _UtilFunc::ToWString(_stage_path).c_str());
		return false;
	}

	// 2. Spawn Pool 로드
	std::ifstream pool_file(_pool_path);
	if (pool_file.is_open())
	{
		nlohmann::json j;
		pool_file >> j;

		for (auto& item : j)
		{
			auto info = item.get<StageSpawnPoolJsonInfo>();
			pool_table_[info.id_] = info;
		}
	}
	else
	{
		_DEBUG_MSGBOX(_T("Failed to open spawn pool data file: %s"), _UtilFunc::ToWString(_pool_path).c_str());
		return false;
	}

    return true;
}

const StageJsonInfo* StageJsonDataManager::GetStageInfo(_uint _id) const
{
	auto it = stage_table_.find(_id);
	return (it != stage_table_.end()) ? &it->second : nullptr;
}

const StageSpawnPoolJsonInfo* StageJsonDataManager::GetSpawnPoolInfo(_uint _id) const
{
	auto it = pool_table_.find(_id);
	return (it != pool_table_.end()) ? &it->second : nullptr;
}

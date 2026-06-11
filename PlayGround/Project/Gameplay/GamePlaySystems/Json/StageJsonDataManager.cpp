#include "framework.h"
#include "StageJsonDataManager.h"

_bool StageJsonDataManager::Load(const std::string& _stage_path, const std::string& _pool_path)
{
	std::unordered_map<_uint, StageJsonInfo> loaded_stage_table;
	std::unordered_map<_uint, StageSpawnPoolJsonInfo> loaded_pool_table;

	const auto stage_path_w = _UtilFunc::ToWString(_stage_path);
	const auto pool_path_w = _UtilFunc::ToWString(_pool_path);

	try
	{
		// 1. Stage Info 로드
		std::ifstream stage_file(_stage_path);
		if (!stage_file.is_open())
		{
			_SYSTEM_LOG_ERROR(L"Failed to open stage data file: %s", stage_path_w.c_str());
			_DEBUG_MSGBOX(_T("Failed to open stage data file: %s"), stage_path_w.c_str());
			return false;
		}

		nlohmann::json stage_json;
		stage_file >> stage_json;
		for (const auto& item : stage_json)
		{
			auto info = item.get<StageJsonInfo>();
			loaded_stage_table[info.id_] = info;
		}
	}
	catch (const nlohmann::json::exception& e)
	{
		const auto error_w = _UtilFunc::ToWString(e.what());
		_SYSTEM_LOG_ERROR(L"Stage data json parse failed. file: %s, error: %s", stage_path_w.c_str(), error_w.c_str());
		_DEBUG_MSGBOX(_T("Stage data json parse failed. file: %s"), stage_path_w.c_str());
		return false;
	}

	try
	{
		// 2. Spawn Pool 로드
		std::ifstream pool_file(_pool_path);
		if (!pool_file.is_open())
		{
			_SYSTEM_LOG_ERROR(L"Failed to open spawn pool data file: %s", pool_path_w.c_str());
			_DEBUG_MSGBOX(_T("Failed to open spawn pool data file: %s"), pool_path_w.c_str());
			return false;
		}

		nlohmann::json pool_json;
		pool_file >> pool_json;
		for (const auto& item : pool_json)
		{
			auto info = item.get<StageSpawnPoolJsonInfo>();
			loaded_pool_table[info.id_] = info;
		}
	}
	catch (const nlohmann::json::exception& e)
	{
		const auto error_w = _UtilFunc::ToWString(e.what());
		_SYSTEM_LOG_ERROR(L"Spawn pool json parse failed. file: %s, error: %s", pool_path_w.c_str(), error_w.c_str());
		_DEBUG_MSGBOX(_T("Spawn pool json parse failed. file: %s"), pool_path_w.c_str());
		return false;
	}

	stage_table_ = std::move(loaded_stage_table);
	pool_table_ = std::move(loaded_pool_table);

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

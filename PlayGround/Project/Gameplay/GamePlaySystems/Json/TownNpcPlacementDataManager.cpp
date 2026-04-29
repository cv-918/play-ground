#include "framework.h"
#include "TownNpcPlacementDataManager.h"

namespace
{
	constexpr const char* kOutGameSceneId = "out_game";

	_bool _ParsePosition(const nlohmann::json& _position_json, _Vector3& _out_position)
	{
		if (!_position_json.is_object())
			return false;

		if (!_position_json.contains("x") || !_position_json["x"].is_number())
			return false;

		if (!_position_json.contains("y") || !_position_json["y"].is_number())
			return false;

		if (!_position_json.contains("z") || !_position_json["z"].is_number())
			return false;

		_out_position.x = _position_json["x"].get<_float>();
		_out_position.y = _position_json["y"].get<_float>();
		_out_position.z = _position_json["z"].get<_float>();
		return true;
	}

	void _OnInvalidPlacement(const std::wstring& _file_path_w, const _int _index, const wchar_t* _reason)
	{
		_SYSTEM_LOG_WARN(L"TownNpcPlacement invalid entry skipped. file: %s, index: %d, reason: %s", _file_path_w.c_str(), _index, _reason);
#ifdef _DEBUG
		_ASSERTE(false);
#endif
	}
}

_bool TownNpcPlacementDataManager::Load(const std::string& _file_path)
{
	scene_table_.clear();

	const std::wstring file_path_w = _UtilFunc::ToWString(_file_path);

	std::ifstream file(_file_path);
	if (!file.is_open())
	{
		_SYSTEM_LOG_ERROR(L"TownNpcPlacement file open failed: %s", file_path_w.c_str());
		_DEBUG_MSGBOX(L"Failed to open town npc placement file: %s", file_path_w.c_str());
		return false;
	}

	nlohmann::json root;
	try
	{
		file >> root;
	}
	catch (const nlohmann::json::exception& e)
	{
		const std::wstring error_w = _UtilFunc::ToWString(e.what());
		_SYSTEM_LOG_ERROR(L"TownNpcPlacement json parse failed. file: %s, error: %s", file_path_w.c_str(), error_w.c_str());
		_DEBUG_MSGBOX(L"Failed to parse town npc placement file: %s", file_path_w.c_str());
		return false;
	}

	if (!root.is_object())
	{
		_SYSTEM_LOG_ERROR(L"TownNpcPlacement root must be an object. file: %s", file_path_w.c_str());
		_DEBUG_MSGBOX(L"TownNpcPlacement root must be an object. file: %s", file_path_w.c_str());
		return false;
	}

	if (!root.contains("scene_id") || !root["scene_id"].is_string())
	{
		_SYSTEM_LOG_ERROR(L"TownNpcPlacement requires scene_id string. file: %s", file_path_w.c_str());
		_DEBUG_MSGBOX(L"TownNpcPlacement requires scene_id string. file: %s", file_path_w.c_str());
		return false;
	}

	if (!root.contains("placements") || !root["placements"].is_array())
	{
		_SYSTEM_LOG_ERROR(L"TownNpcPlacement requires placements array. file: %s", file_path_w.c_str());
		_DEBUG_MSGBOX(L"TownNpcPlacement requires placements array. file: %s", file_path_w.c_str());
		return false;
	}

	TownNpcPlacementSceneData scene_data;
	scene_data.scene_id_ = root["scene_id"].get<std::string>();

	std::unordered_map<std::string, _bool> placement_id_table;

	const auto& placements_json = root["placements"];
	for (size_t i = 0; i < placements_json.size(); ++i)
	{
		const auto& entry_json = placements_json[i];
		if (!entry_json.is_object())
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"entry must be object");
			continue;
		}

		TownNpcPlacementEntry entry;

		if (!entry_json.contains("placement_id") || !entry_json["placement_id"].is_string())
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"missing placement_id");
			continue;
		}

		entry.placement_id_ = entry_json["placement_id"].get<std::string>();
		if (entry.placement_id_.empty())
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"empty placement_id");
			continue;
		}

		if (placement_id_table.find(entry.placement_id_) != placement_id_table.end())
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"duplicate placement_id");
			continue;
		}

		if (!entry_json.contains("npc_id") || !entry_json["npc_id"].is_string())
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"missing npc_id");
			continue;
		}

		entry.npc_id_ = entry_json["npc_id"].get<std::string>();
		if (entry.npc_id_.empty())
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"empty npc_id");
			continue;
		}

		if (!entry_json.contains("position"))
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"missing position");
			continue;
		}

		if (!_ParsePosition(entry_json["position"], entry.position_))
		{
			_OnInvalidPlacement(file_path_w, s_int(i), L"invalid position");
			continue;
		}

		if (entry_json.contains("facing") && entry_json["facing"].is_string())
			entry.facing_ = entry_json["facing"].get<std::string>();

		if (entry_json.contains("enabled") && entry_json["enabled"].is_boolean())
			entry.enabled_ = entry_json["enabled"].get<_bool>();

		placement_id_table[entry.placement_id_] = true;
		scene_data.placements_.push_back(entry);
	}

	scene_table_[scene_data.scene_id_] = scene_data;
	_SYSTEM_LOG_INFO(L"TownNpcPlacement loaded. scene_id: %s, entry_count: %d", _UtilFunc::ToWString(scene_data.scene_id_).c_str(), s_int(scene_data.placements_.size()));
	return true;
}

const TownNpcPlacementSceneData* TownNpcPlacementDataManager::GetSceneData(const std::string& _scene_id) const
{
	auto it = scene_table_.find(_scene_id);
	if (it == scene_table_.end())
		return nullptr;

	return &it->second;
}

const std::vector<TownNpcPlacementEntry>& TownNpcPlacementDataManager::GetOutGamePlacements() const
{
	const auto* scene_data = GetSceneData(kOutGameSceneId);
	if (scene_data == nullptr)
		return empty_placements_;

	return scene_data->placements_;
}

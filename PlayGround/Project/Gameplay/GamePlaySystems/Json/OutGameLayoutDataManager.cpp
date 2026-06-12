#include "framework.h"
#include "OutGameLayoutDataManager.h"

#include <filesystem>

namespace
{
	constexpr const char* kExpectedOutGameSceneId = "out_game";

	_bool _TryGetNumber(const nlohmann::json& _json, const char* _key, _float& _out_value)
	{
		if (!_json.is_object() || !_json.contains(_key) || !_json[_key].is_number())
			return false;

		_out_value = _json[_key].get<_float>();
		return true;
	}

	_bool _TryGetInt(const nlohmann::json& _json, const char* _key, _int& _out_value)
	{
		if (!_json.is_object() || !_json.contains(_key) || !_json[_key].is_number_integer())
			return false;

		_out_value = _json[_key].get<_int>();
		return true;
	}

	_bool _ParseVector2(const nlohmann::json& _json, _Vector2& _out_value)
	{
		_float x = 0.f;
		_float y = 0.f;
		if (!_TryGetNumber(_json, "x", x) || !_TryGetNumber(_json, "y", y))
			return false;

		_out_value = _Vector2(x, y);
		return true;
	}

	_bool _ParseVector3(const nlohmann::json& _json, _Vector3& _out_value)
	{
		_float x = 0.f;
		_float y = 0.f;
		_float z = 0.f;
		if (!_TryGetNumber(_json, "x", x) || !_TryGetNumber(_json, "y", y) || !_TryGetNumber(_json, "z", z))
			return false;

		_out_value = _Vector3(x, y, z);
		return true;
	}

	_bool _ParseRect(const nlohmann::json& _json, OutGameLayoutRect& _out_rect)
	{
		if (!_TryGetInt(_json, "left", _out_rect.left_))
			return false;
		if (!_TryGetInt(_json, "top", _out_rect.top_))
			return false;
		if (!_TryGetInt(_json, "right", _out_rect.right_))
			return false;
		if (!_TryGetInt(_json, "bottom", _out_rect.bottom_))
			return false;

		return _out_rect.IsValid();
	}

	void _WriteVector2(nlohmann::json& _json, const _Vector2& _value)
	{
		_json["x"] = _value.x;
		_json["y"] = _value.y;
	}

	void _WriteVector3(nlohmann::json& _json, const _Vector3& _value)
	{
		_json["x"] = _value.x;
		_json["y"] = _value.y;
		_json["z"] = _value.z;
	}

	void _WriteRect(nlohmann::json& _json, const OutGameLayoutRect& _rect)
	{
		_json["left"] = _rect.left_;
		_json["top"] = _rect.top_;
		_json["right"] = _rect.right_;
		_json["bottom"] = _rect.bottom_;
	}

	void _WarnInvalidNpcEntry(const std::wstring& _file_path_w, const _int _index, const wchar_t* _reason)
	{
		_SYSTEM_LOG_WARN(L"OutGameLayout NPC entry skipped. file: %s, index: %d, reason: %s", _file_path_w.c_str(), _index, _reason);
	}

	void _WarnInvalidInteractionArea(const std::wstring& _file_path_w, const std::string& _placement_id, const wchar_t* _reason)
	{
		_SYSTEM_LOG_WARN(L"OutGameLayout NPC interaction area defaulted. file: %s, placement_id: %s, reason: %s",
			_file_path_w.c_str(),
			_UtilFunc::ToWString(_placement_id).c_str(),
			_reason);
	}
}

_bool OutGameLayoutDataManager::Load(const std::string& _file_path)
{
	const std::wstring file_path_w = _UtilFunc::ToWString(_file_path);

	std::ifstream file(_file_path);
	if (!file.is_open())
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout file open failed: %s", file_path_w.c_str());
		_DEBUG_MSGBOX(L"Failed to open OutGameLayout file: %s", file_path_w.c_str());
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
		_SYSTEM_LOG_ERROR(L"OutGameLayout json parse failed. file: %s, error: %s", file_path_w.c_str(), error_w.c_str());
		_DEBUG_MSGBOX(L"Failed to parse OutGameLayout file: %s", file_path_w.c_str());
		return false;
	}

	if (!root.is_object())
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout root must be an object. file: %s", file_path_w.c_str());
		return false;
	}

	OutGameLayoutSceneData loaded_data;

	if (!root.contains("scene_id") || !root["scene_id"].is_string())
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout requires scene_id string. file: %s", file_path_w.c_str());
		return false;
	}
	loaded_data.scene_id_ = root["scene_id"].get<std::string>();
	if (loaded_data.scene_id_ != kExpectedOutGameSceneId)
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout scene_id mismatch. expected: out_game, actual: %s", _UtilFunc::ToWString(loaded_data.scene_id_).c_str());
		return false;
	}

	if (root.contains("background") && root["background"].is_object())
	{
		const auto& background_json = root["background"];
		if (background_json.contains("path") && background_json["path"].is_string())
			loaded_data.background_path_ = _UtilFunc::ToWString(background_json["path"].get<std::string>());
	}

	if (!root.contains("player") || !root["player"].is_object())
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout requires player object. file: %s", file_path_w.c_str());
		return false;
	}

	const auto& player_json = root["player"];
	if (!player_json.contains("walkable_rect") || !_ParseRect(player_json["walkable_rect"], loaded_data.player_walkable_rect_))
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout requires valid player.walkable_rect. file: %s", file_path_w.c_str());
		return false;
	}

	if (!root.contains("npcs") || !root["npcs"].is_array())
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout requires npcs array. file: %s", file_path_w.c_str());
		return false;
	}

	std::unordered_map<std::string, _bool> placement_id_table;
	const auto& npcs_json = root["npcs"];
	for (size_t i = 0; i < npcs_json.size(); ++i)
	{
		const auto& npc_json = npcs_json[i];
		if (!npc_json.is_object())
		{
			_WarnInvalidNpcEntry(file_path_w, s_int(i), L"entry must be object");
			continue;
		}

		OutGameLayoutNpcEntry entry;
		if (!npc_json.contains("placement_id") || !npc_json["placement_id"].is_string())
		{
			_WarnInvalidNpcEntry(file_path_w, s_int(i), L"missing placement_id");
			continue;
		}
		entry.placement_id_ = npc_json["placement_id"].get<std::string>();
		if (entry.placement_id_.empty())
		{
			_WarnInvalidNpcEntry(file_path_w, s_int(i), L"empty placement_id");
			continue;
		}
		if (placement_id_table.find(entry.placement_id_) != placement_id_table.end())
		{
			_WarnInvalidNpcEntry(file_path_w, s_int(i), L"duplicate placement_id");
			continue;
		}

		if (!npc_json.contains("npc_id") || !npc_json["npc_id"].is_string())
		{
			_WarnInvalidNpcEntry(file_path_w, s_int(i), L"missing npc_id");
			continue;
		}
		entry.npc_id_ = npc_json["npc_id"].get<std::string>();
		if (entry.npc_id_.empty())
		{
			_WarnInvalidNpcEntry(file_path_w, s_int(i), L"empty npc_id");
			continue;
		}

		if (!npc_json.contains("position") || !_ParseVector3(npc_json["position"], entry.position_))
		{
			_WarnInvalidNpcEntry(file_path_w, s_int(i), L"invalid position");
			continue;
		}

		if (npc_json.contains("visual_width") && npc_json["visual_width"].is_number())
		{
			const auto visual_width = npc_json["visual_width"].get<_float>();
			if (visual_width > 0.f)
				entry.visual_width_ = visual_width;
		}

		if (npc_json.contains("facing") && npc_json["facing"].is_string())
			entry.facing_ = npc_json["facing"].get<std::string>();

		if (npc_json.contains("enabled") && npc_json["enabled"].is_boolean())
			entry.enabled_ = npc_json["enabled"].get<_bool>();

		if (npc_json.contains("interaction_area") && npc_json["interaction_area"].is_object())
		{
			const auto& interaction_json = npc_json["interaction_area"];
			if (interaction_json.contains("center_offset"))
			{
				if (!_ParseVector2(interaction_json["center_offset"], entry.interaction_area_.center_offset_))
					_WarnInvalidInteractionArea(file_path_w, entry.placement_id_, L"invalid center_offset");
			}

			if (interaction_json.contains("radius_x") && interaction_json["radius_x"].is_number())
			{
				const auto radius_x = interaction_json["radius_x"].get<_float>();
				if (radius_x > 0.f)
					entry.interaction_area_.radius_x_ = radius_x;
				else
					_WarnInvalidInteractionArea(file_path_w, entry.placement_id_, L"radius_x must be greater than 0");
			}

			if (interaction_json.contains("y_ratio") && interaction_json["y_ratio"].is_number())
			{
				const auto y_ratio = interaction_json["y_ratio"].get<_float>();
				if (y_ratio > 0.f)
					entry.interaction_area_.y_ratio_ = y_ratio;
				else
					_WarnInvalidInteractionArea(file_path_w, entry.placement_id_, L"y_ratio must be greater than 0");
			}
		}

		placement_id_table[entry.placement_id_] = true;
		loaded_data.npcs_.push_back(entry);
	}

	if (loaded_data.npcs_.empty())
	{
		_SYSTEM_LOG_ERROR(L"OutGameLayout requires at least one valid NPC entry. file: %s", file_path_w.c_str());
		return false;
	}

	out_game_layout_ = loaded_data;
	loaded_file_path_ = _file_path;
	_SYSTEM_LOG_INFO(L"OutGameLayout loaded. file: %s, npc_count: %d", file_path_w.c_str(), s_int(out_game_layout_.npcs_.size()));
	return true;
}

_bool OutGameLayoutDataManager::Save(const std::string& _file_path) const
{
	std::filesystem::path path(_file_path);
	if (!path.parent_path().empty())
		std::filesystem::create_directories(path.parent_path());

	try
	{
		nlohmann::json root;
		root["scene_id"] = out_game_layout_.scene_id_;
		root["background"]["path"] = _UtilFunc::ToString(out_game_layout_.background_path_);
		_WriteRect(root["player"]["walkable_rect"], out_game_layout_.player_walkable_rect_);

		root["npcs"] = nlohmann::json::array();
		for (const auto& entry : out_game_layout_.npcs_)
		{
			nlohmann::json npc_json;
			npc_json["placement_id"] = entry.placement_id_;
			npc_json["npc_id"] = entry.npc_id_;
			_WriteVector3(npc_json["position"], entry.position_);
			npc_json["visual_width"] = entry.visual_width_;
			npc_json["facing"] = entry.facing_;
			_WriteVector2(npc_json["interaction_area"]["center_offset"], entry.interaction_area_.center_offset_);
			npc_json["interaction_area"]["radius_x"] = entry.interaction_area_.radius_x_;
			npc_json["interaction_area"]["y_ratio"] = entry.interaction_area_.y_ratio_;
			npc_json["enabled"] = entry.enabled_;
			root["npcs"].push_back(npc_json);
		}

		std::ofstream file(path, std::ios::binary);
		if (!file.is_open())
		{
			_DEBUG_MSGBOX(_T("Failed to create OutGameLayout file: %s"), path.wstring().c_str());
			return false;
		}

		file << root.dump(2);
		file.close();
		if (file.fail())
			return false;

		_SYSTEM_LOG_INFO(L"OutGameLayout saved: %s", path.wstring().c_str());
		return true;
	}
	catch (const std::exception& e)
	{
		_DEBUG_MSGBOX(_T("Failed to save OutGameLayout data: %s"), _TF(e.what()));
		return false;
	}
}

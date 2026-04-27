#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

inline void to_json(json& _json, const UserDataJsonInfo& _info)
{
	_json = json{
		{ "id_", _info.id_ },
		{ "dust_count_", _info.dust_count_ },
		{ "experience_", _info.experience_ },
		{ "unlocked_character_ids_", _info.unlocked_character_ids_ },
		{ "acquired_node_ids_", _info.acquired_node_ids_ },
		{ "equipped_skill_ids_", _info.equipped_skill_ids_ },
		{ "stage_progress_", _info.stage_progress_ },
		{ "is_first_play_", _info.main_story_progress_ }
	};
}

inline void from_json(const json& _json, UserDataJsonInfo& _info)
{
	_info.id_ = _json.value("id_", 0u);
	_info.dust_count_ = _json.value("dust_count_", 0u);
	_info.experience_ = _json.value("experience_", 0u);
	_info.unlocked_character_ids_ = _json.value("unlocked_character_ids_", std::vector<_uint>{});
	_info.acquired_node_ids_ = _json.value("acquired_node_ids_", std::vector<std::pair<_uint, _uint>>{});
	_info.equipped_skill_ids_ = _json.value("equipped_skill_ids_", std::array<_int, 2>{ -1, -1 });
	_info.stage_progress_ = _json.value("stage_progress_", 0u);

	if (_info.stage_progress_ <= 0)
		_info.stage_progress_ = 1;

	_info.main_story_progress_ = s_cast(MainStoryProgress, _json.value("main_story_progress_", 0u));
}

#define _UserDataMgr UserDataManager::Get()

class UserDataManager final
	: public ISingleton<UserDataManager>
	, public JsonDataManager<UserDataJsonInfo>
{
public:
	explicit UserDataManager();
	~UserDataManager() override;

public:
	_bool Load(const std::string& _file_path) override;

	// JsonDataManager을(를) 통해 상속됨
	_bool Save(const std::string& _file_path) override;
};

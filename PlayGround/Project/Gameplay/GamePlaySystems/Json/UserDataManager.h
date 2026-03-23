#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	UserDataJsonInfo,
	id_,
	dust_count_,
	experience_,
	unlocked_character_ids_,
	acquired_node_ids_,
	stage_progress_
)

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


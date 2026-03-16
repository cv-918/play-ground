#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	UserDataJsonInfo,
	id_,
	coin_count_,
	acquired_node_ids_
)

#define _UserDataMgr UserDataManager::Get()

class UserDataManager final
	: public ISingleton<UserDataManager>
	, public JsonDataManager<UserDataJsonInfo>
{
public:
	_bool Load(const std::string& _file_path) override;

	// JsonDataManager을(를) 통해 상속됨
	_bool Save(const std::string& _file_path) override;
};


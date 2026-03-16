#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(AttributeNodeJsonInfo,
	id_, name_, type_, desc_,
	state_, curr_lv_, last_lv_,
	character_unlock_id_, children_nodes_info_
)

#define _AttributeNodeDataMgr AttributeNodeDataManager::Get()

class AttributeNodeDataManager
	: public JsonDataManager<AttributeNodeJsonInfo>
	, public ISingleton<AttributeNodeDataManager>
{
	// JsonDataManager을(를) 통해 상속됨
	_bool Save(const std::string& _file_path) override;
};


#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	AttributeNodeJsonInfo,
	id_, name_, grade_, desc_, max_lv_,
	stat_type_, special_ability_id_, calc_type_,
	unlock_character_id_, parent_node_id_, required_parent_node_lv_, children_nodes_info_
)

#define _AttributeNodeDataMgr AttributeNodeDataManager::Get()

class AttributeNodeDataManager
	: public JsonDataManager<AttributeNodeJsonInfo>
	, public ISingleton<AttributeNodeDataManager>
{
	// JsonDataManager을(를) 통해 상속됨
	_bool Save(const std::string& _file_path) override;
};


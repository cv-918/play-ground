#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	PlayableCharacterJsonInfo,
	id_,
	name_,
	body_size_,
	attack_speed_,
	hp_,
	contact_damage_,
	attack_range_,
	collector_size_,
	move_speed_max_,
	acceleration_,
	friction_
)

#define _CharacterDagaMgr PlayableCharacterDataManager::Get()

class PlayableCharacterDataManager
	: public JsonDataManager<PlayableCharacterJsonInfo>
	, public ISingleton<PlayableCharacterDataManager>
{
	// JsonDataManager을(를) 통해 상속됨
	_bool Save(const std::string& _file_path) override;
};


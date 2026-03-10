#pragma once

#include "EngineSystems/Json/JsonDataManager.h"

#define _CharacterDagaMgr PlayableCharacterDataManager::Get()
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(PlayableCharacterJsonInfo, id_, name_, hp_, contact_damage_, move_speed_max_, acceleration_, friction_)

class PlayableCharacterDataManager
	: public JsonDataManager<PlayableCharacterJsonInfo>
	, public ISingleton<PlayableCharacterDataManager>
{
};


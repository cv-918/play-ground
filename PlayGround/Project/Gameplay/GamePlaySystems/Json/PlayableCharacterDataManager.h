#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	AnimationClipPathInfo,
	clip_name_,
	directory_,
	prefix_,
	start_index_,
	end_index_,
	fps_,
	loop_
)

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	PlayableCharacterJsonInfo,
	id_,
	name_,
	body_size_,
	attack_speed_,
	hp_,
	contact_damage_,
	image_path_,
	attack_range_,
	collector_size_,
	move_speed_max_,
	acceleration_,
	friction_,
	animation_clips_
)

#define _CharacterDagaMgr PlayableCharacterDataManager::Get()

class PlayableCharacterDataManager
	: public JsonDataManager<PlayableCharacterJsonInfo>
	, public ISingleton<PlayableCharacterDataManager>
{
};


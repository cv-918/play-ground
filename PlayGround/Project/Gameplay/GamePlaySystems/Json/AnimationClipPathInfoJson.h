#pragma once

#include "EngineSystems/Json/JsonDataManager.h"
#include "Common/CommonGamePlayType.h"

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

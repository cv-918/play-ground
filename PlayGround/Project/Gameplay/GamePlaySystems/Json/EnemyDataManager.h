#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
	EnemyJsonInfo,
	id_,
	name_,
	body_size_,
	attack_speed_,
	hp_,
	contact_damage_,
	image_path_,
	tier_,
	role_,
	exp_reward_,
	dust_reward_,
	dust_resource_count_,
	movement_pattern_,
	move_speed_unit_,
	nav_boundary_mode_,
	nav_footprint_radius_,
	nav_footprint_offset_y_,
	nav_visual_margin_x_,
	nav_visual_margin_y_,
	ability_flags_,
	attack_range_,
	attack_motion_duration_,
	dash_speed_,
	dash_duration_,
	dash_cooldown_,
	dash_recovery_duration_,
	dash_damage_multiplier_,
	dash_knockback_power_,
	projectile_pattern_,
	projectile_damage_,
	projectile_speed_,
	projectile_knockback_power_
)

#define _EnemyDataMgr EnemyDataManager::Get()

class EnemyDataManager
	: public JsonDataManager<EnemyJsonInfo>
	, public ISingleton<EnemyDataManager>
{
};


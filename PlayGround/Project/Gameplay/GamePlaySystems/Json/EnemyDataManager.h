#pragma once
#include "AnimationClipPathInfoJson.h"
#include "EngineSystems/Json/JsonDataManager.h"

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE_WITH_DEFAULT(
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
	contact_impact_,
	contact_knockback_distance_world_px_,
	contact_knockback_duration_sec_,
	contact_knockback_curve_,
	contact_camera_shake_scale_,
	dash_speed_,
	dash_duration_,
	dash_charge_duration_,
	dash_cooldown_,
	dash_recovery_duration_,
	dash_damage_multiplier_,
	dash_impact_,
	dash_knockback_distance_world_px_,
	dash_knockback_duration_sec_,
	dash_knockback_curve_,
	dash_camera_shake_scale_,
	dash_knockback_power_,
	projectile_pattern_,
	projectile_damage_,
	projectile_speed_,
	projectile_impact_,
	projectile_knockback_distance_world_px_,
	projectile_knockback_duration_sec_,
	projectile_knockback_curve_,
	projectile_camera_shake_scale_,
	projectile_knockback_power_,
	projectile_spawn_offset_x_,
	projectile_spawn_offset_y_,
	animation_clips_
)

#define _EnemyDataMgr EnemyDataManager::Get()

class EnemyDataManager
	: public JsonDataManager<EnemyJsonInfo>
	, public ISingleton<EnemyDataManager>
{
public:
	_bool Save(const std::string& _file_path) override;
};


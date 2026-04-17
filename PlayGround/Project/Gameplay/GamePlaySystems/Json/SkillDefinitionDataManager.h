#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include "GamePlaySystems/Skills/SkillDefinitionCompiler.h"

struct SkillDefinitionEntryPointJsonInfo
{
	SkillGraphEvent event_ = SkillGraphEvent::OnUseRequested;
	_int node_id_ = -1;
};

struct SkillDefinitionJsonInfo
{
	_uint id_ = 0;
	std::string display_name_;
	std::string description_;
	std::string icon_path_;
	_double cooldown_sec_ = 0.0;
	std::vector<SkillDefinitionEntryPointJsonInfo> graph_entry_points_;
	std::vector<SkillGraphNode> node_table_;
	std::vector<std::string> binding_keys_;
};

namespace SkillDefinitionJson
{
	inline std::string ReadEnumString(const nlohmann::json& _json)
	{
		return _json.is_string() ? _json.get<std::string>() : std::string{};
	}

	inline SkillGraphEvent ParseGraphEvent(const nlohmann::json& _json)
	{
		if (_json.is_number_integer())
			return s_cast(SkillGraphEvent, _json.get<_int>());

		const auto value = ReadEnumString(_json);
		if ("OnCastStarted" == value) return SkillGraphEvent::OnCastStarted;
		if ("OnCastCompleted" == value) return SkillGraphEvent::OnCastCompleted;
		if ("OnHit" == value) return SkillGraphEvent::OnHit;
		if ("OnTick" == value) return SkillGraphEvent::OnTick;
		if ("OnExpired" == value) return SkillGraphEvent::OnExpired;
		return SkillGraphEvent::OnUseRequested;
	}

	inline SkillNodeKind ParseNodeKind(const nlohmann::json& _json)
	{
		if (_json.is_number_integer())
			return s_cast(SkillNodeKind, _json.get<_int>());

		const auto value = ReadEnumString(_json);
		if ("TimedCast" == value) return SkillNodeKind::TimedCast;
		if ("SpawnProjectile" == value) return SkillNodeKind::SpawnProjectile;
		if ("SpawnAreaField" == value) return SkillNodeKind::SpawnAreaField;
		if ("SpawnOrbiters" == value) return SkillNodeKind::SpawnOrbiters;
		if ("ApplyEffect" == value) return SkillNodeKind::ApplyEffect;
		if ("ApplyVelocityBoost" == value) return SkillNodeKind::ApplyVelocityBoost;
		if ("EndSkill" == value) return SkillNodeKind::EndSkill;
		return SkillNodeKind::InstantCast;
	}

	inline ExecutionEntityKind ParseExecutionEntityKind(const nlohmann::json& _json)
	{
		if (_json.is_number_integer())
			return s_cast(ExecutionEntityKind, _json.get<_int>());

		const auto value = ReadEnumString(_json);
		if ("Projectile" == value) return ExecutionEntityKind::Projectile;
		if ("AreaField" == value) return ExecutionEntityKind::AreaField;
		if ("Orbiting" == value) return ExecutionEntityKind::Orbiting;
		return ExecutionEntityKind::None;
	}

	inline SkillHitPolicyKind ParseHitPolicyKind(const nlohmann::json& _json)
	{
		if (_json.is_number_integer())
			return s_cast(SkillHitPolicyKind, _json.get<_int>());

		const auto value = ReadEnumString(_json);
		if ("SinglePerTargetLifetime" == value) return SkillHitPolicyKind::SinglePerTargetLifetime;
		if ("PerTargetInterval" == value) return SkillHitPolicyKind::PerTargetInterval;
		if ("EnterOnlyCapture" == value) return SkillHitPolicyKind::EnterOnlyCapture;
		return SkillHitPolicyKind::None;
	}

	inline GameplayModifierType ParseModifierType(const nlohmann::json& _json)
	{
		if (_json.is_number_integer())
			return s_cast(GameplayModifierType, _json.get<_int>());

		const auto value = ReadEnumString(_json);
		if ("MoveSpeedMultiplier" == value) return GameplayModifierType::MoveSpeedMultiplier;
		return GameplayModifierType::MoveSpeedMultiplier;
	}

	inline GameplayStateTag ParseStateTag(const std::string& _value)
	{
		if ("Root" == _value) return GameplayStateTag::Root;
		if ("Invincible" == _value) return GameplayStateTag::Invincible;
		if ("KnockbackImmune" == _value) return GameplayStateTag::KnockbackImmune;
		if ("MoveInputLocked" == _value) return GameplayStateTag::MoveInputLocked;
		if ("CastLocked" == _value) return GameplayStateTag::CastLocked;
		return GameplayStateTag::None;
	}
}

inline void from_json(const nlohmann::json& _json, SkillDefinitionEntryPointJsonInfo& _out)
{
	_out.event_ = SkillDefinitionJson::ParseGraphEvent(_json.at("event_"));
	_out.node_id_ = _json.value("node_id_", -1);
}

inline void from_json(const nlohmann::json& _json, HitReactionProfile& _out)
{
	_out.base_impact_ = _json.value("base_impact_", 0.f);
	_out.knockback_distance_world_px_ = _json.value("knockback_distance_world_px_", 0.f);
	_out.knockback_duration_sec_ = _json.value("knockback_duration_sec_", 0.f);
	_out.knockback_curve_ = _json.contains("knockback_curve_")
		? s_cast(KnockbackCurve, _json.at("knockback_curve_").get<_int>())
		: KnockbackCurve::OutCubic;
	_out.camera_shake_scale_ = _json.value("camera_shake_scale_", 0.f);
}

inline void from_json(const nlohmann::json& _json, GameplayModifier& _out)
{
	_out.type_ = SkillDefinitionJson::ParseModifierType(_json.at("type_"));
	_out.magnitude_ = _json.value("magnitude_", 1.f);
}

inline void from_json(const nlohmann::json& _json, DamagePayload& _out)
{
	_out.amount_ = _json.value("amount_", 0.f);
	_out.has_reaction_ = _json.value("has_reaction_", false);
	if (_json.contains("reaction_"))
	{
		_out.reaction_ = _json.at("reaction_").get<HitReactionProfile>();
	}
}

inline void from_json(const nlohmann::json& _json, GameplayEffectSpec& _out)
{
	_out.effect_key_ = _json.value("effect_key_", std::string{});
	_out.duration_sec_ = _json.value("duration_sec_", 0.0);
	_out.tick_interval_sec_ = _json.value("tick_interval_sec_", 0.0);
	_out.max_tick_count_ = _json.value("max_tick_count_", 0);
	_out.apply_damage_on_start_ = _json.value("apply_damage_on_start_", false);
	_out.apply_damage_on_tick_ = _json.value("apply_damage_on_tick_", false);
	_out.refresh_existing_ = _json.value("refresh_existing_", false);

	_out.state_tags_ = GameplayStateTag::None;
	if (_json.contains("state_tags_"))
	{
		for (const auto& tag_json : _json.at("state_tags_"))
		{
			const auto tag_value = tag_json.is_string()
				? SkillDefinitionJson::ParseStateTag(tag_json.get<std::string>())
				: s_cast(GameplayStateTag, tag_json.get<_int>());
			_out.state_tags_ |= tag_value;
		}
	}

	if (_json.contains("modifiers_"))
	{
		_out.modifiers_ = _json.at("modifiers_").get<std::vector<GameplayModifier>>();
	}

	if (_json.contains("damage_payload_"))
	{
		_out.damage_payload_ = _json.at("damage_payload_").get<DamagePayload>();
	}
}

inline void from_json(const nlohmann::json& _json, ExecutionEntitySpec& _out)
{
	_out.kind_ = _json.contains("kind_")
		? SkillDefinitionJson::ParseExecutionEntityKind(_json.at("kind_"))
		: ExecutionEntityKind::None;
	_out.hit_policy_ = _json.contains("hit_policy_")
		? SkillDefinitionJson::ParseHitPolicyKind(_json.at("hit_policy_"))
		: SkillHitPolicyKind::None;
	_out.size_ = _json.value("size_", 0.f);
	_out.speed_ = _json.value("speed_", 0.f);
	_out.lifetime_sec_ = _json.value("lifetime_sec_", 0.0);
	_out.grow_duration_sec_ = _json.value("grow_duration_sec_", 0.0);
	_out.per_target_interval_sec_ = _json.value("per_target_interval_sec_", 0.0);
	_out.count_ = _json.value("count_", 1u);
	_out.orbit_radius_ = _json.value("orbit_radius_", 0.f);
	_out.angular_speed_deg_per_sec_ = _json.value("angular_speed_deg_per_sec_", 0.f);
	_out.destroy_on_hit_ = _json.value("destroy_on_hit_", false);

	if (_json.contains("on_hit_effect_"))
	{
		_out.on_hit_effect_ = _json.at("on_hit_effect_").get<GameplayEffectSpec>();
	}

	if (_json.contains("on_capture_effect_"))
	{
		_out.on_capture_effect_ = _json.at("on_capture_effect_").get<GameplayEffectSpec>();
	}
}

inline void from_json(const nlohmann::json& _json, SkillGraphNode& _out)
{
	_out.node_id_ = _json.value("node_id_", -1);
	_out.kind_ = SkillDefinitionJson::ParseNodeKind(_json.at("kind_"));
	_out.next_node_id_ = _json.value("next_node_id_", -1);
	_out.duration_sec_ = _json.value("duration_sec_", 0.0);
	_out.scalar_value_ = _json.value("scalar_value_", 0.f);
	_out.count_value_ = _json.value("count_value_", 0u);

	if (_json.contains("execution_spec_"))
	{
		_out.execution_spec_ = _json.at("execution_spec_").get<ExecutionEntitySpec>();
	}

	if (_json.contains("effect_spec_"))
	{
		_out.effect_spec_ = _json.at("effect_spec_").get<GameplayEffectSpec>();
	}
}

inline void from_json(const nlohmann::json& _json, SkillDefinitionJsonInfo& _out)
{
	_out.id_ = _json.value("id_", 0u);
	_out.display_name_ = _json.value("display_name_", std::string{});
	_out.description_ = _json.value("description_", std::string{});
	_out.icon_path_ = _json.value("icon_path_", std::string{});
	_out.cooldown_sec_ = _json.value("cooldown_sec_", 0.0);
	_out.graph_entry_points_ = _json.value("graph_entry_points_", std::vector<SkillDefinitionEntryPointJsonInfo>{});
	_out.node_table_ = _json.value("node_table_", std::vector<SkillGraphNode>{});
	_out.binding_keys_ = _json.value("binding_keys_", std::vector<std::string>{});
}

#define _SkillDefinitionDataMgr SkillDefinitionDataManager::Get()

class SkillDefinitionDataManager final : public ISingleton<SkillDefinitionDataManager>
{
public:
	_bool Load(const std::string& _file_path);

	const std::unordered_map<_uint, SkillDefinition>& GetTable() const { return data_table_; }

	const SkillDefinition* GetData(_uint _id) const
	{
		const auto iter = data_table_.find(_id);
		return iter != data_table_.end() ? &iter->second : nullptr;
	}

private:
	std::unordered_map<_uint, SkillDefinition> data_table_;
};

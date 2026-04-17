#pragma once

#include <map>
#include <string>
#include <vector>

#include "Gameplay/Common/GameplayEffectTypes.h"

class GameObjectBase;

enum class SkillGraphEvent
{
	OnUseRequested = 0,
	OnCastStarted,
	OnCastCompleted,
	OnHit,
	OnTick,
	OnExpired,
};

enum class SkillNodeKind
{
	InstantCast = 0,
	TimedCast,
	SpawnProjectile,
	SpawnAreaField,
	SpawnOrbiters,
	ApplyEffect,
	ApplyVelocityBoost,
	EndSkill,
};

enum class ExecutionEntityKind
{
	None = 0,
	Projectile,
	AreaField,
	Orbiting,
};

enum class SkillHitPolicyKind
{
	None = 0,
	SinglePerTargetLifetime,
	PerTargetInterval,
	EnterOnlyCapture,
};

enum class SkillRuntimePhase
{
	Idle = 0,
	Casting,
	Cooldown,
	Disabled,
};

struct ExecutionEntitySpec
{
	ExecutionEntityKind kind_ = ExecutionEntityKind::None;
	SkillHitPolicyKind hit_policy_ = SkillHitPolicyKind::None;
	GameplayEffectSpec on_hit_effect_{};
	GameplayEffectSpec on_capture_effect_{};
	_float size_ = 0.f;
	_float speed_ = 0.f;
	_double lifetime_sec_ = 0.0;
	_double grow_duration_sec_ = 0.0;
	_double per_target_interval_sec_ = 0.0;
	_uint count_ = 1;
	_float orbit_radius_ = 0.f;
	_float angular_speed_deg_per_sec_ = 0.f;
	_bool destroy_on_hit_ = false;
};

struct SkillGraphNode
{
	_int node_id_ = -1;
	SkillNodeKind kind_ = SkillNodeKind::EndSkill;
	_int next_node_id_ = -1;
	_double duration_sec_ = 0.0;
	_float scalar_value_ = 0.f;
	_uint count_value_ = 0;
	ExecutionEntitySpec execution_spec_{};
	GameplayEffectSpec effect_spec_{};
};

struct SkillDefinition
{
	_uint skill_id_ = 0;
	std::string display_name_;
	std::string description_;
	std::string icon_path_;
	_double cooldown_sec_ = 0.0;
	std::map<SkillGraphEvent, _int> graph_entry_points_;
	std::vector<SkillGraphNode> node_table_;
	std::vector<std::string> binding_keys_;
};

inline const SkillGraphNode* FindSkillGraphNode(const SkillDefinition& _definition, _int _node_id)
{
	for (const auto& node : _definition.node_table_)
	{
		if (node.node_id_ == _node_id)
			return &node;
	}

	return nullptr;
}

struct SkillExecutionContext
{
	GameObjectBase* owner_ = nullptr;
	_Vector3 aim_direction_ = _Vector3::Zero();
};

struct SkillInstance
{
	const SkillDefinition* definition_ = nullptr;
	SkillExecutionContext context_{};
};

struct SkillRuntimeState
{
	SkillRuntimePhase phase_ = SkillRuntimePhase::Idle;
	_double cooldown_remaining_sec_ = 0.0;
	_double cast_remaining_sec_ = 0.0;
	SkillInstance active_instance_{};
};

#pragma once

#include <vector>

#include "ComponentBase.h"
#include "Gameplay/Common/GameplayEffectTypes.h"

class Movement;

class GameplayEffectController final : public ComponentBase
{
public:
	GameplayEffectController()
		: ComponentBase(ComponentType::GameplayEffectController)
	{
	}

public:
	_int Update(_double _delta_time) override;

	void ApplyEffect(const GameplayEffectSpec& _spec, const GameplayEffectApplicationParams& _params);

	_bool HasStateTag(GameplayStateTag _tag) const;
	_bool IsInvincible() const { return HasStateTag(GameplayStateTag::Invincible); }
	_bool IsKnockbackImmune() const { return HasStateTag(GameplayStateTag::KnockbackImmune); }
	_float GetMoveSpeedMultiplier() const { return aggregated_move_speed_multiplier_; }

private:
	struct ActiveEffectInstance
	{
		GameplayEffectSpec spec_{};
		GameplayEffectApplicationParams params_{};
		_double remaining_duration_sec_ = 0.0;
		_double tick_accumulator_sec_ = 0.0;
		_int applied_tick_count_ = 0;
	};

private:
	void _ApplyDamagePayload(const DamagePayload& _payload, const GameplayEffectApplicationParams& _params);
	void _RebuildAggregates();
	Movement* _GetMovement() const;

private:
	std::vector<ActiveEffectInstance> active_effects_;
	GameplayStateTag aggregated_state_tags_ = GameplayStateTag::None;
	_float aggregated_move_speed_multiplier_ = 1.f;
};

#pragma once

#include <string>
#include <vector>

#include "Common/HitReaction.h"
#include "Core/Math/Vector3.h"

class GameObjectBase;

enum class GameplayStateTag : _uint
{
	None = 0,
	Root = 1 << 0,
	Invincible = 1 << 1,
	KnockbackImmune = 1 << 2,
	MoveInputLocked = 1 << 3,
	CastLocked = 1 << 4,
};

inline GameplayStateTag operator|(GameplayStateTag _lhs, GameplayStateTag _rhs)
{
	return s_cast(GameplayStateTag, s_uint(_lhs) | s_uint(_rhs));
}

inline GameplayStateTag& operator|=(GameplayStateTag& _lhs, GameplayStateTag _rhs)
{
	_lhs = (_lhs | _rhs);
	return _lhs;
}

inline _bool HasGameplayStateTag(GameplayStateTag _value, GameplayStateTag _flag)
{
	return 0 != (s_uint(_value) & s_uint(_flag));
}

enum class MovementControlLock : _uint
{
	None = 0,
	MoveInputLock = 1 << 0,
	CastLock = 1 << 1,
	Root = 1 << 2,
};

inline MovementControlLock operator|(MovementControlLock _lhs, MovementControlLock _rhs)
{
	return s_cast(MovementControlLock, s_uint(_lhs) | s_uint(_rhs));
}

inline MovementControlLock& operator|=(MovementControlLock& _lhs, MovementControlLock _rhs)
{
	_lhs = (_lhs | _rhs);
	return _lhs;
}

inline _bool HasMovementControlLock(MovementControlLock _value, MovementControlLock _flag)
{
	return 0 != (s_uint(_value) & s_uint(_flag));
}

enum class GameplayModifierType
{
	MoveSpeedMultiplier = 0,
};

struct GameplayModifier
{
	GameplayModifierType type_ = GameplayModifierType::MoveSpeedMultiplier;
	_float magnitude_ = 1.f;
};

struct DamagePayload
{
	_float amount_ = 0.f;
	HitReactionProfile reaction_{};
	_bool has_reaction_ = false;
};

struct GameplayEffectSpec
{
	std::string effect_key_;
	_double duration_sec_ = 0.0;
	_double tick_interval_sec_ = 0.0;
	_int max_tick_count_ = 0;
	GameplayStateTag state_tags_ = GameplayStateTag::None;
	std::vector<GameplayModifier> modifiers_;
	DamagePayload damage_payload_{};
	_bool apply_damage_on_start_ = false;
	_bool apply_damage_on_tick_ = false;
	_bool refresh_existing_ = false;
};

struct GameplayEffectApplicationParams
{
	GameObjectBase* source_ = nullptr;
	_Vector3 knockback_direction_ = _Vector3::Zero();
};

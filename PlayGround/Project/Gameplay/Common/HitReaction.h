#pragma once

#include <algorithm>
#include <cmath>

#include <Base/Bases.h>
#include "Core/Math/MathFunctions.h"

enum class KnockbackCurve
{
	Linear = 0,
	OutQuad,
	OutCubic,
	OutExpo,
};

struct HitReactionProfile
{
	_float base_impact_ = 0.f;
	_float knockback_distance_world_px_ = 0.f;
	_float knockback_duration_sec_ = 0.f;
	KnockbackCurve knockback_curve_ = KnockbackCurve::OutCubic;
	_float camera_shake_scale_ = 0.f;
};

struct ResolvedHitReaction
{
	_float impact_score_ = 0.f;
	_float knockback_distance_world_px_ = 0.f;
	_float knockback_duration_sec_ = 0.f;
	_float trauma_gain_ = 0.f;
};

inline HitReactionProfile MakeHitReactionProfile(
	_float _base_impact,
	_float _knockback_distance_world_px,
	_float _knockback_duration_sec,
	KnockbackCurve _knockback_curve,
	_float _camera_shake_scale)
{
	HitReactionProfile profile;
	profile.base_impact_ = _base_impact;
	profile.knockback_distance_world_px_ = _knockback_distance_world_px;
	profile.knockback_duration_sec_ = _knockback_duration_sec;
	profile.knockback_curve_ = _knockback_curve;
	profile.camera_shake_scale_ = _camera_shake_scale;
	return profile;
}

inline _float EvaluateKnockbackCurve(_float _t, KnockbackCurve _curve)
{
	_t = _MathFunc::Clamp(_t, 0.f, 1.f);

	switch (_curve)
	{
	case KnockbackCurve::OutQuad:
		return 1.f - (1.f - _t) * (1.f - _t);

	case KnockbackCurve::OutExpo:
		if (_t >= 1.f)
			return 1.f;

		return 1.f - powf(2.f, -10.f * _t);

	case KnockbackCurve::OutCubic:
		return 1.f - powf(1.f - _t, 3.f);

	case KnockbackCurve::Linear:
	default:
		return _t;
	}
}

inline ResolvedHitReaction ResolveHitReaction(
	const HitReactionProfile& _profile,
	_float _final_damage,
	_float _victim_max_hp,
	_bool _is_dash_attack,
	_bool _is_fatal_hit,
	_bool _victim_is_player,
	_float _target_knockback_resistance = 1.f)
{
	ResolvedHitReaction resolved;

	if (_final_damage <= 0.f)
		return resolved;

	const _float safe_max_hp = std::max(1.f, _victim_max_hp);
	const _float damage_ratio = _MathFunc::Clamp(_final_damage / safe_max_hp, 0.f, 1.f);
	const _float base_impact = _MathFunc::Clamp(_profile.base_impact_, 0.f, 1.f);

	resolved.impact_score_ = _MathFunc::Clamp(
		0.50f * base_impact +
		0.25f * sqrtf(damage_ratio) +
		0.15f * (_is_dash_attack ? 1.f : 0.f) +
		0.10f * (_is_fatal_hit ? 1.f : 0.f),
		0.f,
		1.f);

	if (_profile.knockback_distance_world_px_ > 0.f && _profile.knockback_duration_sec_ > 0.f)
	{
		const _float safe_knockback_resistance = std::max(0.0001f, _target_knockback_resistance);
		resolved.knockback_distance_world_px_ =
			_profile.knockback_distance_world_px_ *
			_MathFunc::Lerp(0.85f, 1.35f, resolved.impact_score_) /
			safe_knockback_resistance;

		resolved.knockback_duration_sec_ =
			_profile.knockback_duration_sec_ *
			_MathFunc::Lerp(0.95f, 1.10f, resolved.impact_score_);
	}

	if (_profile.camera_shake_scale_ > 0.f)
	{
		const _float viewer_scale = _victim_is_player ? 1.25f : 1.f;
		resolved.trauma_gain_ =
			_MathFunc::Lerp(0.18f, 0.75f, resolved.impact_score_) *
			_profile.camera_shake_scale_ *
			viewer_scale;
	}

	return resolved;
}

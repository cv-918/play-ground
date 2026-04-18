#include "framework.h"
#include "GameplayEffectController.h"

#include "Actors/GameObjectBase.h"
#include "Common/HitContext.h"
#include "Components/Movement.h"

GameplayEffectController::~GameplayEffectController()
{
	_ClearSourceTracking();
}

_int GameplayEffectController::Update(_double _delta_time)
{
	_bool requires_rebuild = false;

	for (auto iter = active_effects_.begin(); iter != active_effects_.end();)
	{
		auto& effect = *iter;

		if (effect.spec_.apply_damage_on_tick_ && effect.spec_.tick_interval_sec_ > 0.0)
		{
			effect.tick_accumulator_sec_ += _delta_time;

			while (effect.tick_accumulator_sec_ >= effect.spec_.tick_interval_sec_)
			{
				if (effect.spec_.max_tick_count_ > 0 &&
					effect.applied_tick_count_ >= effect.spec_.max_tick_count_)
				{
					break;
				}

				effect.tick_accumulator_sec_ -= effect.spec_.tick_interval_sec_;
				_ApplyDamagePayload(effect.spec_.damage_payload_, effect.params_);
				++effect.applied_tick_count_;
			}
		}

		if (effect.remaining_duration_sec_ > 0.0)
		{
			effect.remaining_duration_sec_ = std::max(0.0, effect.remaining_duration_sec_ - _delta_time);
		}

		const _bool expired_by_duration =
			effect.spec_.duration_sec_ > 0.0 &&
			effect.remaining_duration_sec_ <= 0.0;

		const _bool expired_by_tick_count =
			effect.spec_.max_tick_count_ > 0 &&
			effect.spec_.apply_damage_on_tick_ &&
			effect.applied_tick_count_ >= effect.spec_.max_tick_count_;

		if (expired_by_duration || expired_by_tick_count)
		{
			const auto source = effect.params_.source_;
			iter = active_effects_.erase(iter);
			_ReleaseTrackedSource(source);
			requires_rebuild = true;
			continue;
		}

		++iter;
	}

	if (requires_rebuild)
	{
		_RebuildAggregates();
	}

	return UPDATE_CONTINUE;
}

void GameplayEffectController::ApplyEffect(const GameplayEffectSpec& _spec, const GameplayEffectApplicationParams& _params)
{
	_bool requires_rebuild = false;

	if (_spec.refresh_existing_ && !_spec.effect_key_.empty())
	{
		const auto old_size = active_effects_.size();
		active_effects_.erase(
			std::remove_if(
				active_effects_.begin(),
				active_effects_.end(),
				[&](const ActiveEffectInstance& _instance)
				{
					return _instance.spec_.effect_key_ == _spec.effect_key_;
				}),
			active_effects_.end());

		requires_rebuild = (old_size != active_effects_.size());
		_ReleaseUnusedTrackedSources();
	}

	if (_spec.apply_damage_on_start_)
	{
		_ApplyDamagePayload(_spec.damage_payload_, _params);
	}

	const _bool has_duration = _spec.duration_sec_ > 0.0;
	const _bool has_tick_runtime = _spec.apply_damage_on_tick_ && _spec.tick_interval_sec_ > 0.0;
	const _bool has_state_runtime = _spec.state_tags_ != GameplayStateTag::None;
	const _bool has_modifier_runtime = !_spec.modifiers_.empty();

	if (!(has_duration || has_tick_runtime || has_state_runtime || has_modifier_runtime))
	{
		if (requires_rebuild)
		{
			_RebuildAggregates();
		}
		return;
	}

	ActiveEffectInstance instance;
	instance.spec_ = _spec;
	instance.params_ = _params;
	instance.params_.source_ = _SanitizeSource(instance.params_.source_);
	instance.remaining_duration_sec_ = _spec.duration_sec_;
	active_effects_.push_back(instance);
	_TrackSource(instance.params_.source_);

	_RebuildAggregates();
}

_bool GameplayEffectController::HasStateTag(GameplayStateTag _tag) const
{
	return HasGameplayStateTag(aggregated_state_tags_, _tag);
}

void GameplayEffectController::_ApplyDamagePayload(const DamagePayload& _payload, const GameplayEffectApplicationParams& _params)
{
	if (!gameobject_ || _payload.amount_ <= 0.f)
		return;

	HitContext hit;
	hit.source_ = _SanitizeSource(_params.source_);
	hit.damage_ = _payload.amount_;
	hit.knockback_direction_ = _params.knockback_direction_;

	if (_payload.has_reaction_)
	{
		hit.reaction_ = _payload.reaction_;
	}

	gameobject_->SendMessageToHandlers(
		HandlerSystemList::Damage,
		[&](IHandler* _handler)
		{
			s_cast(IDamagable*, _handler)->ApplyHit(hit);
		});
}

GameObjectBase* GameplayEffectController::_SanitizeSource(GameObjectBase* _source) const
{
	if (_source == nullptr || _source->IsPendingDestruction())
		return nullptr;

	return _source;
}

void GameplayEffectController::_TrackSource(GameObjectBase* _source)
{
	if (_source == nullptr || tracked_sources_.find(_source) != tracked_sources_.end())
		return;

	const auto callback_id = _source->AddDestructionCallback([this, _source]()
		{
			_HandleSourceDestroyed(_source);
		});

	if (callback_id != IDestroyable::kInvalidDestructionCallbackId)
		tracked_sources_[_source] = callback_id;
}

void GameplayEffectController::_HandleSourceDestroyed(GameObjectBase* _source)
{
	for (auto& effect : active_effects_)
	{
		if (effect.params_.source_ == _source)
			effect.params_.source_ = nullptr;
	}

	tracked_sources_.erase(_source);
}

void GameplayEffectController::_ReleaseTrackedSource(GameObjectBase* _source)
{
	if (_source == nullptr || _HasTrackedSourceReference(_source))
		return;

	const auto iter = tracked_sources_.find(_source);
	if (iter == tracked_sources_.end())
		return;

	if (iter->second != IDestroyable::kInvalidDestructionCallbackId)
		_source->RemoveDestructionCallback(iter->second);

	tracked_sources_.erase(iter);
}

void GameplayEffectController::_ReleaseUnusedTrackedSources()
{
	for (auto iter = tracked_sources_.begin(); iter != tracked_sources_.end();)
	{
		if (_HasTrackedSourceReference(iter->first))
		{
			++iter;
			continue;
		}

		if (iter->first && iter->second != IDestroyable::kInvalidDestructionCallbackId)
			iter->first->RemoveDestructionCallback(iter->second);

		iter = tracked_sources_.erase(iter);
	}
}

_bool GameplayEffectController::_HasTrackedSourceReference(GameObjectBase* _source) const
{
	if (_source == nullptr)
		return false;

	for (const auto& effect : active_effects_)
	{
		if (effect.params_.source_ == _source)
			return true;
	}

	return false;
}

void GameplayEffectController::_ClearSourceTracking()
{
	for (const auto& [source, callback_id] : tracked_sources_)
	{
		if (source && callback_id != IDestroyable::kInvalidDestructionCallbackId)
			source->RemoveDestructionCallback(callback_id);
	}

	tracked_sources_.clear();
	for (auto& effect : active_effects_)
		effect.params_.source_ = nullptr;
}

void GameplayEffectController::_RebuildAggregates()
{
	aggregated_state_tags_ = GameplayStateTag::None;
	aggregated_move_speed_multiplier_ = 1.f;

	for (const auto& effect : active_effects_)
	{
		aggregated_state_tags_ |= effect.spec_.state_tags_;

		for (const auto& modifier : effect.spec_.modifiers_)
		{
			switch (modifier.type_)
			{
			case GameplayModifierType::MoveSpeedMultiplier:
				aggregated_move_speed_multiplier_ *= modifier.magnitude_;
				break;
			}
		}
	}

	auto* movement = _GetMovement();
	if (!movement)
		return;

	movement->SetExternalMoveSpeedMultiplier(aggregated_move_speed_multiplier_);

	MovementControlLock effect_locks = MovementControlLock::None;
	if (HasStateTag(GameplayStateTag::MoveInputLocked))
	{
		effect_locks |= MovementControlLock::MoveInputLock;
	}
	if (HasStateTag(GameplayStateTag::CastLocked))
	{
		effect_locks |= MovementControlLock::CastLock;
	}
	if (HasStateTag(GameplayStateTag::Root))
	{
		effect_locks |= MovementControlLock::Root;
	}

	movement->SetEffectControlLocks(effect_locks);
}

Movement* GameplayEffectController::_GetMovement() const
{
	if (!gameobject_)
		return nullptr;

	return s_cast(Movement*, gameobject_->GetComponent(ComponentType::Movement));
}

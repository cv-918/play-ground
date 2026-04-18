#include "framework.h"
#include "SkillBase.h"

#include "Components/GameplayEffectController.h"
#include "Components/Movement.h"
#include "GamePlaySystems/RunState.h"
#include "Scenes/InGameScene.h"
#include "SkillExecutionActors.h"

namespace
{
	_float ResolveAimAngleDeg(const _Vector3& _direction)
	{
		if (_direction.LengthSq() <= 0.f)
			return 0.f;

		return _MathFunc::ToDegree(std::atan2(_direction.y, _direction.x));
	}
}

SkillBase::SkillBase(const SkillJsonInfo* _info)
	: info_(_info)
{
}

SkillBase::SkillBase(const SkillDefinition* _definition, const SkillJsonInfo* _info)
	: info_(_info)
	, definition_(_definition)
{
}

SkillBase::~SkillBase()
{
	_DetachActiveOwner();
}

_int SkillBase::Update(_double _delta_time)
{
	switch (runtime_.phase_)
	{
	case SkillRuntimePhase::Casting:
		runtime_.cast_remaining_sec_ = std::max(0.0, runtime_.cast_remaining_sec_ - _delta_time);
		if (runtime_.cast_remaining_sec_ <= 0.0)
		{
			runtime_.phase_ = SkillRuntimePhase::Idle;
			_ProcessGraphEvent(SkillGraphEvent::OnCastCompleted);
			_ClearActiveInstance();
			_BeginCooldown();
		}
		break;

	case SkillRuntimePhase::Cooldown:
		runtime_.cooldown_remaining_sec_ = std::max(0.0, runtime_.cooldown_remaining_sec_ - _delta_time);
		if (runtime_.cooldown_remaining_sec_ <= 0.0)
		{
			runtime_.phase_ = SkillRuntimePhase::Idle;
		}
		break;

	case SkillRuntimePhase::Idle:
	case SkillRuntimePhase::Disabled:
	default:
		break;
	}

	return UPDATE_CONTINUE;
}

_bool SkillBase::IsReady() const
{
	return runtime_.phase_ == SkillRuntimePhase::Idle &&
		runtime_.cooldown_remaining_sec_ <= 0.0;
}

_float SkillBase::GetCooldownRatio() const
{
	if (!info_ || info_->cooldown_ <= 0.0)
		return 0.f;

	return s_float(runtime_.cooldown_remaining_sec_ / info_->cooldown_);
}

_double SkillBase::GetCurrentCooldown() const
{
	return runtime_.cooldown_remaining_sec_;
}

void SkillBase::ResetRuntimeToReady()
{
	_ClearActiveInstance();
	runtime_.phase_ = SkillRuntimePhase::Idle;
	runtime_.cooldown_remaining_sec_ = 0.0;
	runtime_.cast_remaining_sec_ = 0.0;
}

_bool SkillBase::Execute(GameObjectBase* _owner, const _Vector3& _direction)
{
	if (!definition_ || !info_ || !_owner || _owner->IsPendingDestruction() || !_owner->GetTransform() || !IsReady())
		return false;

	_ClearActiveInstance();
	runtime_.active_instance_.definition_ = definition_;
	_BindActiveOwner(_owner);
	runtime_.active_instance_.context_.aim_direction_ = _ResolveAimDirection(_owner, _direction);

	const _bool did_dispatch = _ProcessGraphEvent(SkillGraphEvent::OnUseRequested);
	if (did_dispatch && runtime_.phase_ != SkillRuntimePhase::Casting)
	{
		_ClearActiveInstance();
		_BeginCooldown();
	}
	else if (!did_dispatch)
	{
		_ClearActiveInstance();
	}

	return did_dispatch;
}

void SkillBase::_ResetCoolTime()
{
	runtime_.cooldown_remaining_sec_ = GetMaxCooldown();
	runtime_.phase_ = runtime_.cooldown_remaining_sec_ > 0.0
		? SkillRuntimePhase::Cooldown
		: SkillRuntimePhase::Idle;
}

void SkillBase::_BeginCooldown()
{
	_ResetCoolTime();
}

_bool SkillBase::_ProcessGraphEvent(SkillGraphEvent _event)
{
	if (!definition_)
		return false;

	const auto entry_iter = definition_->graph_entry_points_.find(_event);
	if (entry_iter == definition_->graph_entry_points_.end())
		return false;

	auto node_id = entry_iter->second;
	while (node_id >= 0)
	{
		const auto* node = FindSkillGraphNode(*definition_, node_id);
		if (!node)
			break;

		if (node->kind_ == SkillNodeKind::TimedCast)
		{
			runtime_.phase_ = SkillRuntimePhase::Casting;
			runtime_.cast_remaining_sec_ = std::max(0.0, node->duration_sec_);

			auto* owner = runtime_.active_instance_.context_.owner_;
			if (owner && !owner->IsPendingDestruction() && runtime_.cast_remaining_sec_ > 0.0)
			{
				auto* controller = s_cast(
					GameplayEffectController*,
					owner->GetComponent(ComponentType::GameplayEffectController));

				if (controller)
				{
					GameplayEffectSpec cast_lock_effect;
					cast_lock_effect.effect_key_ = "skill_cast_lock";
					cast_lock_effect.duration_sec_ = runtime_.cast_remaining_sec_;
					cast_lock_effect.state_tags_ =
						GameplayStateTag::MoveInputLocked |
						GameplayStateTag::CastLocked;
					cast_lock_effect.refresh_existing_ = true;

					GameplayEffectApplicationParams params;
					params.source_ = owner;
					controller->ApplyEffect(cast_lock_effect, params);
				}
			}

			return true;
		}

		_ExecuteNode(*node);

		if (node->kind_ == SkillNodeKind::EndSkill)
			return true;

		node_id = node->next_node_id_;
	}

	return true;
}

void SkillBase::_ExecuteNode(const SkillGraphNode& _node)
{
	auto* owner = runtime_.active_instance_.context_.owner_;
	if (!owner || owner->IsPendingDestruction() || !owner->GetTransform())
		return;

	switch (_node.kind_)
	{
	case SkillNodeKind::InstantCast:
		break;

	case SkillNodeKind::SpawnProjectile:
	case SkillNodeKind::SpawnAreaField:
	case SkillNodeKind::SpawnOrbiters:
		_SpawnExecution(_node.execution_spec_);
		break;

	case SkillNodeKind::ApplyEffect:
	{
		auto* controller = s_cast(
			GameplayEffectController*,
			owner->GetComponent(ComponentType::GameplayEffectController));

		if (controller)
		{
			GameplayEffectApplicationParams params;
			params.source_ = owner;
			controller->ApplyEffect(_node.effect_spec_, params);
		}
		break;
	}

	case SkillNodeKind::ApplyVelocityBoost:
	{
		auto* movement = s_cast(Movement*, owner->GetComponent(ComponentType::Movement));
		if (movement)
		{
			movement->ApplyImmediateMoveSpeedBoost();
		}
		break;
	}

	case SkillNodeKind::EndSkill:
	case SkillNodeKind::TimedCast:
	default:
		break;
	}
}

void SkillBase::_SpawnExecution(const ExecutionEntitySpec& _spec)
{
	const auto* scene = _RunState.GetInGameScene();
	if (!scene)
		return;

	auto* object_manager = scene->GetObjectManager();
	auto* owner = runtime_.active_instance_.context_.owner_;
	if (!object_manager || !owner || owner->IsPendingDestruction() || !owner->GetTransform())
		return;

	const auto spawn_position = owner->GetTransform()->Position();
	const auto aim_direction = runtime_.active_instance_.context_.aim_direction_;

	switch (_spec.kind_)
	{
	case ExecutionEntityKind::Projectile:
		object_manager->CreateActor<ProjectileExecutionActor>(
			owner,
			_spec,
			spawn_position,
			aim_direction);
		break;

	case ExecutionEntityKind::AreaField:
		object_manager->CreateActor<AreaFieldExecutionActor>(
			owner,
			_spec,
			spawn_position);
		break;

	case ExecutionEntityKind::Orbiting:
	{
		const _uint orbiter_count = std::max(1u, _spec.count_);
		const _float base_angle_deg = ResolveAimAngleDeg(aim_direction);
		for (_uint index = 0; index < orbiter_count; ++index)
		{
			const _float angle_offset = 360.f * s_float(index) / s_float(orbiter_count);
			object_manager->CreateActor<OrbitExecutionActor>(
				owner,
				_spec,
				base_angle_deg + angle_offset);
		}
		break;
	}

	case ExecutionEntityKind::None:
	default:
		break;
	}
}

_Vector3 SkillBase::_ResolveAimDirection(GameObjectBase* _owner, const _Vector3& _direction) const
{
	if (_direction.LengthSq() > 0.f)
		return _direction.Normalized();

	if (_owner && !_owner->IsPendingDestruction() && _owner->GetTransform())
		return _owner->GetTransform()->Forward2D();

	return _Vector3(1.f, 0.f);
}

void SkillBase::_BindActiveOwner(GameObjectBase* _owner)
{
	_DetachActiveOwner();
	runtime_.active_instance_.context_.owner_ = _owner;
	if (!_owner)
		return;

	active_owner_destruction_callback_id_ = _owner->AddDestructionCallback(
		[this]()
	{
		_HandleActiveOwnerDestroyed();
	});
}

void SkillBase::_DetachActiveOwner()
{
	auto* owner = runtime_.active_instance_.context_.owner_;
	if (!owner || active_owner_destruction_callback_id_ == IDestroyable::kInvalidDestructionCallbackId)
	{
		runtime_.active_instance_.context_.owner_ = nullptr;
		active_owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
		return;
	}

	owner->RemoveDestructionCallback(active_owner_destruction_callback_id_);
	runtime_.active_instance_.context_.owner_ = nullptr;
	active_owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

void SkillBase::_HandleActiveOwnerDestroyed()
{
	runtime_.active_instance_.definition_ = nullptr;
	runtime_.active_instance_.context_.owner_ = nullptr;
	runtime_.active_instance_.context_.aim_direction_ = _Vector3::Zero();
	active_owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;

	if (runtime_.phase_ == SkillRuntimePhase::Casting)
	{
		runtime_.phase_ = SkillRuntimePhase::Idle;
		runtime_.cast_remaining_sec_ = 0.0;
	}
}

void SkillBase::_ClearActiveInstance()
{
	_DetachActiveOwner();
	runtime_.active_instance_ = {};
}

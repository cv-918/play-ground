#include "framework.h"
#include "SkillExecutionActors.h"

#include "Components/EllipseCollider.h"
#include "Components/GameplayEffectController.h"
#include "Components/SphereCollider.h"
#include "EngineSystems/Physics/CollisionManager.h"

namespace
{
	_bool CanUseObjectTransform(GameObjectBase* _object)
	{
		return _object && !_object->IsPendingDestruction() && _object->GetTransform();
	}

	GameplayEffectController* GetEffectController(GameObjectBase* _target)
	{
		if (!CanUseObjectTransform(_target))
			return nullptr;

		return s_cast(
			GameplayEffectController*,
			_target->GetComponent(ComponentType::GameplayEffectController));
	}

	GameplayEffectApplicationParams MakeApplicationParams(
		GameObjectBase* _source_owner,
		const _Vector3& _origin,
		GameObjectBase* _target)
	{
		GameplayEffectApplicationParams params;
		params.source_ = (_source_owner && !_source_owner->IsPendingDestruction())
			? _source_owner
			: nullptr;

		if (CanUseObjectTransform(_target))
		{
			const auto target_position = _target->GetTransform()->Position();
			params.knockback_direction_ = (target_position - _origin).Normalized();
		}

		return params;
	}
}

HitPolicyRuntime::~HitPolicyRuntime()
{
	Clear();
}

void HitPolicyRuntime::Update(_double _delta_time)
{
	for (auto iter = target_timers_.begin(); iter != target_timers_.end();)
	{
		iter->second = std::max(0.0, iter->second - _delta_time);
		if (iter->second <= 0.0)
		{
			iter = target_timers_.erase(iter);
			continue;
		}

		++iter;
	}
}

_bool HitPolicyRuntime::TryConsumeTarget(GameObjectBase* _target)
{
	if (!CanUseObjectTransform(_target))
		return false;

	_TrackTarget(_target);

	switch (kind_)
	{
	case SkillHitPolicyKind::SinglePerTargetLifetime:
	case SkillHitPolicyKind::EnterOnlyCapture:
		return lifetime_targets_.insert(_target).second;

	case SkillHitPolicyKind::PerTargetInterval:
	{
		auto iter = target_timers_.find(_target);
		if (iter != target_timers_.end() && iter->second > 0.0)
			return false;

		target_timers_[_target] = interval_sec_;
		return true;
	}

	case SkillHitPolicyKind::None:
	default:
		return true;
	}
}

void HitPolicyRuntime::Clear()
{
	const auto tracked_targets = target_callback_ids_;
	for (const auto& [target, callback_id] : tracked_targets)
	{
		if (target && callback_id != IDestroyable::kInvalidDestructionCallbackId)
			target->RemoveDestructionCallback(callback_id);
	}

	lifetime_targets_.clear();
	target_timers_.clear();
	target_callback_ids_.clear();
}

void HitPolicyRuntime::_TrackTarget(GameObjectBase* _target)
{
	if (!_target || target_callback_ids_.find(_target) != target_callback_ids_.end())
		return;

	const auto callback_id = _target->AddDestructionCallback(
		[this, _target]()
		{
			_ForgetTarget(_target, false);
		});

	if (callback_id != IDestroyable::kInvalidDestructionCallbackId)
		target_callback_ids_[_target] = callback_id;
}

void HitPolicyRuntime::_ForgetTarget(GameObjectBase* _target, const _bool _detach_callback)
{
	if (!_target)
		return;

	if (_detach_callback)
	{
		const auto callback_iter = target_callback_ids_.find(_target);
		if (callback_iter != target_callback_ids_.end())
		{
			if (callback_iter->second != IDestroyable::kInvalidDestructionCallbackId)
				_target->RemoveDestructionCallback(callback_iter->second);

			target_callback_ids_.erase(callback_iter);
		}
	}
	else
	{
		target_callback_ids_.erase(_target);
	}

	lifetime_targets_.erase(_target);
	target_timers_.erase(_target);
}

ProjectileExecutionActor::ProjectileExecutionActor(
	GameObjectBase* _owner,
	const ExecutionEntitySpec& _spec,
	const _Vector3& _spawn_position,
	const _Vector3& _direction)
	: owner_(_owner)
	, spec_(_spec)
	, spawn_position_(_spawn_position)
	, direction_(_direction)
	, hit_policy_runtime_(_spec)
	, remaining_lifetime_sec_(_spec.lifetime_sec_)
{
}

ProjectileExecutionActor::~ProjectileExecutionActor()
{
	_DetachOwner();
}

_bool ProjectileExecutionActor::Initialize()
{
	if (!__super::Initialize())
		return false;

	_BindOwner(owner_);
	transform_->Position(spawn_position_);

	if (direction_.LengthSq() <= 0.f && CanUseObjectTransform(owner_))
		direction_ = owner_->GetTransform()->Forward2D();

	if (direction_.LengthSq() <= 0.f)
		direction_ = _Vector3(1.f, 0.f);

	transform_->LookAt(spawn_position_ + direction_);
	transform_->Scale(spec_.size_);
	color_ = Palette::Gold;

	collider_ = new SphereCollider(spec_.size_ * 0.5f);
	collider_->SetDrawAlways(true);
	RegisterComponent(collider_);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, collider_);

	Finalize();
	return true;
}

_int ProjectileExecutionActor::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	hit_policy_runtime_.Update(_delta_time);

	transform_->Position(transform_->Position() + direction_.Normalized() * spec_.speed_ * s_float(_delta_time));

	remaining_lifetime_sec_ -= _delta_time;
	if (remaining_lifetime_sec_ <= 0.0)
	{
		ReserveDestruction();
	}

	return UPDATE_CONTINUE;
}

void ProjectileExecutionActor::OnCollisionEnter(Collider* _this, Collider* _other)
{
	(void)_this;
	_TryApplyHit(_other);
}

void ProjectileExecutionActor::OnCollisionStay(Collider* _this, Collider* _other)
{
	(void)_this;
	_TryApplyHit(_other);
}

void ProjectileExecutionActor::_TryApplyHit(Collider* _other)
{
	if (!_other || _other->GetLayer() != CollisionLayer::EnemyBody)
		return;

	auto* target = _other->GameObject();
	if (!CanUseObjectTransform(target))
		return;

	if (!hit_policy_runtime_.TryConsumeTarget(target))
		return;

	auto* controller = GetEffectController(target);
	if (!controller)
		return;

	controller->ApplyEffect(
		spec_.on_hit_effect_,
		MakeApplicationParams(owner_, transform_->Position(), target));

	if (spec_.destroy_on_hit_)
	{
		ReserveDestruction();
	}
}

void ProjectileExecutionActor::_BindOwner(GameObjectBase* _owner)
{
	_DetachOwner();
	owner_ = _owner;
	if (!owner_)
		return;

	owner_destruction_callback_id_ = owner_->AddDestructionCallback(
		[this]()
		{
			_HandleOwnerDestroyed();
		});
}

void ProjectileExecutionActor::_DetachOwner()
{
	if (!owner_ || owner_destruction_callback_id_ == IDestroyable::kInvalidDestructionCallbackId)
	{
		owner_ = nullptr;
		owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
		return;
	}

	owner_->RemoveDestructionCallback(owner_destruction_callback_id_);
	owner_ = nullptr;
	owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

void ProjectileExecutionActor::_HandleOwnerDestroyed()
{
	owner_ = nullptr;
	owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

AreaFieldExecutionActor::AreaFieldExecutionActor(
	GameObjectBase* _owner,
	const ExecutionEntitySpec& _spec,
	const _Vector3& _spawn_position)
	: owner_(_owner)
	, spec_(_spec)
	, spawn_position_(_spawn_position)
	, hit_policy_runtime_(_spec)
	, remaining_lifetime_sec_(_spec.lifetime_sec_)
{
}

AreaFieldExecutionActor::~AreaFieldExecutionActor()
{
	_DetachOwner();
}

_bool AreaFieldExecutionActor::Initialize()
{
	if (!__super::Initialize())
		return false;

	_BindOwner(owner_);
	transform_->Position(spawn_position_);
	transform_->Scale(spec_.size_);
	color_ = Palette::Rust;
	SetAlpha(0.35f);

	collider_ = new EllipseCollider(0.f, 0.6f);
	collider_->SetDrawAlways(true);
	RegisterComponent(collider_);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, collider_);

	Finalize();
	return true;
}

_int AreaFieldExecutionActor::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	hit_policy_runtime_.Update(_delta_time);
	elapsed_sec_ += _delta_time;

	const _double grow_duration = std::max(0.0001, spec_.grow_duration_sec_);
	const _float grow_ratio = std::clamp(s_float(elapsed_sec_ / grow_duration), 0.f, 1.f);
	collider_->SetRadius(spec_.size_ * grow_ratio, 0.6f);

	remaining_lifetime_sec_ -= _delta_time;
	if (remaining_lifetime_sec_ <= 0.0)
	{
		ReserveDestruction();
	}

	return UPDATE_CONTINUE;
}

void AreaFieldExecutionActor::OnCollisionEnter(Collider* _this, Collider* _other)
{
	(void)_this;
	_TryCapture(_other);
}

void AreaFieldExecutionActor::_TryCapture(Collider* _other)
{
	if (!_other || _other->GetLayer() != CollisionLayer::EnemyBody)
		return;

	if (elapsed_sec_ > spec_.grow_duration_sec_)
		return;

	auto* target = _other->GameObject();
	if (!CanUseObjectTransform(target))
		return;

	if (!hit_policy_runtime_.TryConsumeTarget(target))
		return;

	auto* controller = GetEffectController(target);
	if (!controller)
		return;

	GameplayEffectApplicationParams params;
	params.source_ = (owner_ && !owner_->IsPendingDestruction()) ? owner_ : nullptr;
	controller->ApplyEffect(spec_.on_capture_effect_, params);
}

void AreaFieldExecutionActor::_BindOwner(GameObjectBase* _owner)
{
	_DetachOwner();
	owner_ = _owner;
	if (!owner_)
		return;

	owner_destruction_callback_id_ = owner_->AddDestructionCallback(
		[this]()
		{
			_HandleOwnerDestroyed();
		});
}

void AreaFieldExecutionActor::_DetachOwner()
{
	if (!owner_ || owner_destruction_callback_id_ == IDestroyable::kInvalidDestructionCallbackId)
	{
		owner_ = nullptr;
		owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
		return;
	}

	owner_->RemoveDestructionCallback(owner_destruction_callback_id_);
	owner_ = nullptr;
	owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

void AreaFieldExecutionActor::_HandleOwnerDestroyed()
{
	owner_ = nullptr;
	owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

OrbitExecutionActor::OrbitExecutionActor(
	GameObjectBase* _owner,
	const ExecutionEntitySpec& _spec,
	_float _initial_angle_deg)
	: owner_(_owner)
	, spec_(_spec)
	, angle_deg_(_initial_angle_deg)
	, hit_policy_runtime_(_spec)
	, remaining_lifetime_sec_(_spec.lifetime_sec_)
{
}

OrbitExecutionActor::~OrbitExecutionActor()
{
	_DetachOwner();
}

_bool OrbitExecutionActor::Initialize()
{
	if (!__super::Initialize())
		return false;

	_BindOwner(owner_);
	transform_->Scale(spec_.size_);
	color_ = Palette::AshGray;
	SetAlpha(0.5f);

	collider_ = new SphereCollider(spec_.size_ * 0.5f);
	collider_->SetDrawAlways(true);
	RegisterComponent(collider_);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, collider_);

	_UpdateOrbitPosition();
	Finalize();
	return true;
}

_int OrbitExecutionActor::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	if (!owner_ || owner_->IsPendingDestruction())
	{
		ReserveDestruction();
		return UPDATE_CONTINUE;
	}

	hit_policy_runtime_.Update(_delta_time);

	angle_deg_ += spec_.angular_speed_deg_per_sec_ * s_float(_delta_time);
	_UpdateOrbitPosition();

	remaining_lifetime_sec_ -= _delta_time;
	if (remaining_lifetime_sec_ <= 0.0)
	{
		ReserveDestruction();
	}

	return UPDATE_CONTINUE;
}

void OrbitExecutionActor::OnCollisionEnter(Collider* _this, Collider* _other)
{
	(void)_this;
	_TryApplyHit(_other);
}

void OrbitExecutionActor::OnCollisionStay(Collider* _this, Collider* _other)
{
	(void)_this;
	_TryApplyHit(_other);
}

void OrbitExecutionActor::_TryApplyHit(Collider* _other)
{
	if (!_other || _other->GetLayer() != CollisionLayer::EnemyBody)
		return;

	auto* target = _other->GameObject();
	if (!CanUseObjectTransform(target))
		return;

	if (!hit_policy_runtime_.TryConsumeTarget(target))
		return;

	auto* controller = GetEffectController(target);
	if (!controller)
		return;

	controller->ApplyEffect(
		spec_.on_hit_effect_,
		MakeApplicationParams(owner_, transform_->Position(), target));
}

void OrbitExecutionActor::_UpdateOrbitPosition() const
{
	if (!CanUseObjectTransform(owner_))
		return;

	const auto owner_position = owner_->GetTransform()->Position();
	const auto angle_rad = _MathFunc::ToRadian(angle_deg_);

	_Vector3 position = owner_position;
	position.x += cosf(angle_rad) * spec_.orbit_radius_;
	position.y += sinf(angle_rad) * spec_.orbit_radius_;

	transform_->Position(position);
}

void OrbitExecutionActor::_BindOwner(GameObjectBase* _owner)
{
	_DetachOwner();
	owner_ = _owner;
	if (!owner_)
		return;

	owner_destruction_callback_id_ = owner_->AddDestructionCallback(
		[this]()
		{
			_HandleOwnerDestroyed();
		});
}

void OrbitExecutionActor::_DetachOwner()
{
	if (!owner_ || owner_destruction_callback_id_ == IDestroyable::kInvalidDestructionCallbackId)
	{
		owner_ = nullptr;
		owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
		return;
	}

	owner_->RemoveDestructionCallback(owner_destruction_callback_id_);
	owner_ = nullptr;
	owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

void OrbitExecutionActor::_HandleOwnerDestroyed()
{
	owner_ = nullptr;
	owner_destruction_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

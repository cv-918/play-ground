#include "framework.h"
#include "SkillExecutionActors.h"

#include "Components/GameplayEffectController.h"
#include "Components/SphereCollider.h"
#include "EngineSystems/Physics/CollisionManager.h"

namespace
{
	GameplayEffectController* GetEffectController(GameObjectBase* _target)
	{
		if (!_target)
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
		params.source_ = _source_owner;

		if (_target)
		{
			const auto target_position = _target->GetTransform()->Position();
			params.knockback_direction_ = (target_position - _origin).Normalized();
		}

		return params;
	}
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
	if (!_target)
		return false;

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

_bool ProjectileExecutionActor::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Position(spawn_position_);

	if (direction_.LengthSq() <= 0.f && owner_)
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

_bool AreaFieldExecutionActor::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Position(spawn_position_);
	transform_->Scale(spec_.size_);
	color_ = Palette::Rust;
	SetAlpha(0.45f);

	collider_ = new SphereCollider(0.f);
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
	collider_->SetRadius((spec_.size_ * 0.5f) * grow_ratio);

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
	if (!hit_policy_runtime_.TryConsumeTarget(target))
		return;

	auto* controller = GetEffectController(target);
	if (!controller)
		return;

	GameplayEffectApplicationParams params;
	params.source_ = owner_;
	controller->ApplyEffect(spec_.on_capture_effect_, params);
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

_bool OrbitExecutionActor::Initialize()
{
	if (!__super::Initialize())
		return false;

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
	if (!owner_)
		return;

	const auto owner_position = owner_->GetTransform()->Position();
	const auto angle_rad = _MathFunc::ToRadian(angle_deg_);

	_Vector3 position = owner_position;
	position.x += cosf(angle_rad) * spec_.orbit_radius_;
	position.y += sinf(angle_rad) * spec_.orbit_radius_;

	transform_->Position(position);
}

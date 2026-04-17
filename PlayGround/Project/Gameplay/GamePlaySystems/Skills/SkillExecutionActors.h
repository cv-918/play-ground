#pragma once

#include <map>
#include <unordered_set>

#include "Actors/GameObjectBase.h"
#include "SkillRuntimeTypes.h"

class Collider;
class SphereCollider;

class HitPolicyRuntime final
{
public:
	explicit HitPolicyRuntime(const ExecutionEntitySpec& _spec)
		: kind_(_spec.hit_policy_)
		, interval_sec_(_spec.per_target_interval_sec_)
	{
	}

public:
	void Update(_double _delta_time);
	_bool TryConsumeTarget(GameObjectBase* _target);

private:
	SkillHitPolicyKind kind_ = SkillHitPolicyKind::None;
	_double interval_sec_ = 0.0;
	std::unordered_set<GameObjectBase*> lifetime_targets_;
	std::map<GameObjectBase*, _double> target_timers_;
};

class ProjectileExecutionActor final
	: public GameObjectBase
	, public ICollidable
{
public:
	ProjectileExecutionActor(
		GameObjectBase* _owner,
		const ExecutionEntitySpec& _spec,
		const _Vector3& _spawn_position,
		const _Vector3& _direction);

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

private:
	void _TryApplyHit(Collider* _other);

private:
	GameObjectBase* owner_ = nullptr;
	ExecutionEntitySpec spec_{};
	_Vector3 spawn_position_ = _Vector3::Zero();
	_Vector3 direction_ = _Vector3::Zero();
	SphereCollider* collider_ = nullptr;
	HitPolicyRuntime hit_policy_runtime_;
	_double remaining_lifetime_sec_ = 0.0;
};

class AreaFieldExecutionActor final
	: public GameObjectBase
	, public ICollidable
{
public:
	AreaFieldExecutionActor(
		GameObjectBase* _owner,
		const ExecutionEntitySpec& _spec,
		const _Vector3& _spawn_position);

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

	void OnCollisionEnter(Collider* _this, Collider* _other) override;

private:
	void _TryCapture(Collider* _other);

private:
	GameObjectBase* owner_ = nullptr;
	ExecutionEntitySpec spec_{};
	_Vector3 spawn_position_ = _Vector3::Zero();
	SphereCollider* collider_ = nullptr;
	HitPolicyRuntime hit_policy_runtime_;
	_double remaining_lifetime_sec_ = 0.0;
	_double elapsed_sec_ = 0.0;
};

class OrbitExecutionActor final
	: public GameObjectBase
	, public ICollidable
{
public:
	OrbitExecutionActor(
		GameObjectBase* _owner,
		const ExecutionEntitySpec& _spec,
		_float _initial_angle_deg);

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionStay(Collider* _this, Collider* _other) override;

private:
	void _TryApplyHit(Collider* _other);
	void _UpdateOrbitPosition() const;

private:
	GameObjectBase* owner_ = nullptr;
	ExecutionEntitySpec spec_{};
	_float angle_deg_ = 0.f;
	SphereCollider* collider_ = nullptr;
	HitPolicyRuntime hit_policy_runtime_;
	_double remaining_lifetime_sec_ = 0.0;
};

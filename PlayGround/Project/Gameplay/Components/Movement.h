#pragma once
#include "ComponentBase.h"

#include "Gameplay/Actors/GameObjectBase.h"
#include "Gameplay/Components/Transform.h"

enum class MovementControlMode
{
	Normal,
	Dash,
};

enum class DashImpulsePolicy
{
	Additive,           // 대시 중에도 넉백 가산
	IgnoreImpulse,      // 대시 중에는 넉백 무시
	CancelDashOnImpulse // 넉백이 들어오면 대시 종료
};

class Movement abstract : public ComponentBase
{
protected:
	explicit Movement()
		: ComponentBase(ComponentType::Movement)
		, move_pattern_(MovementPattern::Undefined)
		, acceleration_(0.f), friction_(0.f)
		, move_spd_(1.f), move_spd_max_(1.f)
		, rotate_spd_(1.f), rotate_spd_max_(1.f)
		, move_func_(nullptr)
       , use_nav_mesh_(false)
		, transform_(nullptr)
		, control_mode_(MovementControlMode::Normal)
		, dash_direction_(_Vector3::Zero())
		, dash_speed_(0.f)
		, dash_duration_(0.0)
		, dash_elapsed_(0.0)
		, impulse_friction_(8.f)
		, dash_impulse_policy_(DashImpulsePolicy::Additive)
	{
	}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	void SetAsMaxSpeed();
	void StopImmediately();

	MovementPattern GetPattern() const { return move_pattern_; }
	void SetPattern(MovementPattern _pattern) { move_pattern_ = _pattern; }

	_Vector3 GetMoveDir() const { return move_direction_; }
	void SetMoveDir(_Vector3 _dir) { move_direction_ = _dir; }

	_Vector3 GetMoveVelocity() const { return move_velocity_; }
	void SetMoveVelocity(_Vector3 _velocity) { move_velocity_ = _velocity; }

	_Vector3 GetImpulseVelocity() const { return impulse_velocity_; }
	void SetImpulseVelocity(const _Vector3& _velocity) { impulse_velocity_ = _velocity; }

	_float GetAcceleration() const { return acceleration_; }
	void SetAcceleration(_float _acc) { acceleration_ = _acc; }

	_float GetFriction() const { return friction_; }
	void SetFriction(_float _fric) { friction_ = _fric; }

	_float GetImpulseFriction() const { return impulse_friction_; }
	void SetImpulseFriction(_float _fric) { impulse_friction_ = _fric; }

	_float GetMoveSpd() const { return move_spd_; }
	void SetMoveSpd(const _float _spd) { move_spd_ = _spd; }

	_float GetMoveSpdMax() const { return move_spd_max_; }
	void SetMoveSpdMax(const _float _spd) { move_spd_max_ = _spd; }

	_float GetRotateSpd() const { return rotate_spd_; }
	void SetRotateSpd(const _float _spd) { rotate_spd_ = _spd; }

	_float GetRotateSpdMax() const { return rotate_spd_max_; }
	void SetRotateSpdMax(const _float _spd) { rotate_spd_max_ = _spd; }

  void SetNavMesh(const _Rect& _rt) { nav_mesh_ = _rt; use_nav_mesh_ = true; }

	MovementControlMode GetControlMode() const { return control_mode_; }
	_bool IsDashing() const { return control_mode_ == MovementControlMode::Dash; }

	void StartDash(const _Vector3& _direction, _float _speed, _double _duration);
	void EndDash();

	void AddImpulse(const _Vector3& _impulse);
	void ClearImpulse();

	void StartDashByInputDir(_float _speed, _double _duration);
	void ApplyKnockback(const _Vector3& _direction, _float _power);

protected:
	void _ClampMoveVelocity();
	void _ApplyFrictionToMoveVelocity(_double _delta_time);
	void _ApplyFrictionToImpulseVelocity(_double _delta_time);

	void _UpdateDash(_double _delta_time);
	void _UpdateImpulse(_double _delta_time);
	void _ApplyFinalMovement(_double _delta_time);

protected:
	MovementPattern move_pattern_;

	_Vector3 move_direction_;

	// s, [ 가속도 로직을 이용한 움직임에 사용되는 변수 ]
	_Vector3 move_velocity_;
	_Vector3 impulse_velocity_;
	_float acceleration_; // 가속도 (픽셀/초^2)
	_float friction_; // 이동 마찰 계수
	_float impulse_friction_; // 외력 감쇠 계수
	// e, [ 가속도 로직을 이용한 움직임에 사용되는 변수 ]

	_float move_spd_;
	_float move_spd_max_;

	_float rotate_spd_;
	_float rotate_spd_max_;

	// 적용된 이동 함수 포인터
	std::function<void(_double)> move_func_;

	_Rect nav_mesh_;
	_bool use_nav_mesh_;

	class Transform* transform_;

	// s, [ 대시 ]
	MovementControlMode control_mode_;
	_Vector3 dash_direction_;
	_float dash_speed_;
	_double dash_duration_;
	_double dash_elapsed_;
	DashImpulsePolicy dash_impulse_policy_;
	// e, [ 대시 ]
};
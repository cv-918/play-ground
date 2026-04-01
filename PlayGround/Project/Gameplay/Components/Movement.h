#pragma once
#include "ComponentBase.h"

#include "Gameplay/Actors/GameObjectBase.h"
#include "Gameplay/Components/Transform.h"

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
		, use_nav_mesh_(true)
		, transform_(nullptr)
	{}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

public:
	void SetAsMaxSpeed();

	MovementPattern GetPattern() const { return move_pattern_; }
	void SetPattern(MovementPattern _pattern) { move_pattern_ = _pattern; }

	_Vector3 GetMoveDir() const { return move_direction_; }
	void SetMoveDir(_Vector3 _dir) { move_direction_ = _dir; }

	_Vector3 GetMoveVelocity() const { return move_velocity_; }
	void SetMoveVelocity(_Vector3 _velocity) { move_velocity_ = _velocity; }

	_float GetAcceleration() const { return acceleration_; }
	void SetAcceleration(_float _acc) { acceleration_ = _acc; }

	_float GetFriction() const { return friction_; }
	void SetFriction(_float _fric) { friction_ = _fric; }

	_float GetMoveSpd() const { return move_spd_; }
	void SetMoveSpd(const _float _spd) { move_spd_ = _spd; }

	_float GetMoveSpdMax() const { return move_spd_max_; }
	void SetMoveSpdMax(const _float _spd) { move_spd_max_ = _spd; }

	_float GetRotateSpd() const { return rotate_spd_; }
	void SetRotateSpd(const _float _spd) { rotate_spd_ = _spd; }

	_float GetRotateSpdMax() const { return rotate_spd_max_; }
	void SetRotateSpdMax(const _float _spd) { rotate_spd_max_ = _spd; }

	void SetNavMesh(const _Rect& _rt) { nav_mesh_ = _rt; }

protected:
	MovementPattern move_pattern_;

	_Vector3 move_direction_;

	// s, [ 가속도 로직을 이용한 움직임에 사용되는 변수 ]
	_Vector3 move_velocity_;
	_float acceleration_; // 가속도 (픽셀/초^2)
	_float friction_; // 마찰 계수 (높을수록 빨리 멈춤)
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
};


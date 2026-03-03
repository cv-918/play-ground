#pragma once
#include "ComponentBase.h"

#include "Gameplay/Actors/GameObjectBase.h"
#include "Gameplay/Components/Transform.h"

enum class MovementPattern
{
	Undefined,		// 초기화 값
	Playable,		// 직접 조작
	Stopped,		// 정지 (이동 없음)
	Directional,	// 직선 이동
	Target,			// 타겟 추적 이동
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
		, use_nav_mesh_(true)
		, transform_(nullptr)
	{}

public:
	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual _int LateUpdate(_double _delta_time) override;

public:
	MovementPattern Pattern() const { return move_pattern_; }
	void Pattern(MovementPattern _pattern) { move_pattern_ = _pattern; }

	_Vector3 MoveDir() const { return move_direction_; }
	void MoveDir(_Vector3 _dir) { move_direction_ = _dir; }
	_Vector3& MoveDir() { return move_direction_; }

	_Vector3 MoveVelocity() const { return move_velocity_; }
	void MoveVelocity(_Vector3 _velocity) { move_velocity_ = _velocity; }
	_Vector3& MoveVelocity() { return move_velocity_; }

	_float Acceleration() const { return acceleration_; }
	void Acceleration(_float _acc) { acceleration_ = _acc; }
	_float& Acceleration() { return acceleration_; }

	_float Friction() const { return friction_; }
	void Friction(_float _fric) { friction_ = _fric; }
	_float& Friction() { return friction_; }

	_float MoveSpd() const { return move_spd_; }
	void MoveSpd(const _float _spd) { move_spd_ = _spd; }
	_float& MoveSpd() { return move_spd_; }

	_float MoveSpdMax() const { return move_spd_max_; }
	void MoveSpdMax(const _float _spd) { move_spd_max_ = _spd; }
	_float& MoveSpdMax() { return move_spd_max_; }

	_float RotateSpd() const { return rotate_spd_; }
	void RotateSpd(const _float _spd) { rotate_spd_ = _spd; }
	_float& RotateSpd() { return rotate_spd_; }

	_float RotateSpdMax() const { return rotate_spd_max_; }
	void RotateSpdMax(const _float _spd) { rotate_spd_max_ = _spd; }
	_float& RotateSpdMax() { return rotate_spd_max_; }

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

	/*	추가 구현 아이디어 : 목적지 설정 이동방식(클릭한 위치까지 이동하는 것과 같은 로직)
		- 컨트롤 타입을 추가해서 구현
		- 목적지까지 남은 거리가 프레임당 이동거리보다 작을 경우 목적지로 포지션 고정
	*/
};


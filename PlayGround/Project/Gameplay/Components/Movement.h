#pragma once
#include "Component.h"

class Movement : public Component
{
public:
	explicit Movement()
		: Component(ComponentType::Movement)
		, move_spd_(1.f)
		, move_spd_max_(1.f)
		, rotate_spd_(1.f)
	{}

public:
	_float MoveSpd() const { return move_spd_; }
	void MoveSpd(const _float _spd) { move_spd_ = _spd; }

	_float MoveSpdMax() const { return move_spd_max_; }
	void MoveSpdMax(const _float _spd) { move_spd_max_ = _spd; }

	_float RotateSpd() const { return rotate_spd_; }
	void RotateSpd(const _float _spd) { rotate_spd_ = _spd; }

private:
	_float move_spd_;
	_float move_spd_max_;
	_float rotate_spd_;

	// 목적지까지 남은 거리가 프레임당 이동거리보다 작을 경우 목적지로 포지션 고정
	// 목적지까지 이동하는 조작방식은 컨트롤 타입을 추가해서 구현
};


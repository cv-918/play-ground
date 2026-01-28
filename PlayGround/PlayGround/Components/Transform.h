#pragma once

#include "Component.h"

enum class Direction
{
	Forward,
	Right,
	Back,
	Left,
};

class Transform : public Component
{
public:
	explicit Transform() DEFAULT;
	virtual ~Transform() DEFAULT;

public:
	void Translate(const _Vector3& _delta) { position_ += _delta; }
	void Rotate2D(const _float _delta) { rotation_.z += _delta; }

	_Vector3 Forward2D() const;
	_Vector3 Back2D() const;
	_Vector3 Right2D() const;
	_Vector3 Left2D() const;
	_Vector3 GetDirection(const Direction _dir);

	_Vector3 Position() const { return position_; }
	void Position(const _Vector3 _pos) { position_ = _pos; }
	void Position(const int _x, const int _y) { position_.x = s_float(_x), position_.y = s_float(_y); }

	_Vector3 Rotation() const { return rotation_; }
	void Rotation(const _Vector3 _pos) { rotation_ = _pos; }
	void Rotation(const int _x, const int _y) { rotation_.x = s_float(_x), rotation_.y = s_float(_y); }

	_Vector3 Scale() const { return scale_; }
	void Scale(const _Vector3 _pos) { scale_ = _pos; }
	void Scale(const int _x, const int _y) { scale_.x = s_float(_x), scale_.y = s_float(_y); }

protected:
	_Vector3 position_;
	_Vector3 rotation_;
	_Vector3 scale_;

	//_bool update_required_;
	//Vector3 update_position_;
	//Vector3 update_rotation_;
	//Vector3 update_scale_;
};

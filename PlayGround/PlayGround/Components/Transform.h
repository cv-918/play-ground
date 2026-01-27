#pragma once

#include "Component.h"

class Transform : public Component
{
public:
	explicit Transform() DEFAULT;
	virtual ~Transform() DEFAULT;

public:
	Vector3 Position() const { return position_; }
	void Position(const Vector3 _pos) { position_ = _pos; }
	void Position(const int _x, const int _y) { position_.x = s_float(_x), position_.y = s_float(_y); }

	Vector3 Rotation() const { return rotation_; }
	void Rotation(const Vector3 _pos) { rotation_ = _pos; }
	void Rotation(const int _x, const int _y) { rotation_.x = s_float(_x), rotation_.y = s_float(_y); }

	Vector3 Scale() const { return scale_; }
	void Scale(const Vector3 _pos) { scale_ = _pos; }
	void Scale(const int _x, const int _y) { scale_.x = s_float(_x), scale_.y = s_float(_y); }

protected:
	Vector3 position_;
	Vector3 rotation_;
	Vector3 scale_;
};

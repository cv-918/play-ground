#pragma once

#include "ComponentBase.h"

enum class Direction
{
	Forward,
	Right,
	Back,
	Left,
};

class Transform : public ComponentBase
{
public:
	explicit Transform()
		: ComponentBase(ComponentType::Transform)
		, position_(_Vector3::Zero())
		, rotation_(_Vector3::Zero())
		, scale_(_Vector3::One())
	{
	}
	virtual ~Transform() DEFAULT;

public:
	void Translate(const _Vector3& _delta);
	void TranslateToForward(const _float _delta);
	void Rotate2D(const _float _delta);
	void LookAt(const _Vector3& _target);

	_Vector3 Forward2D() const;
	_Vector3 Back2D() const;
	_Vector3 Right2D() const;
	_Vector3 Left2D() const;
	_Vector3 GetDirection(const Direction _dir);

	_Vector3 Position() const { return position_; }
	void Position(const _Vector3 _pos);
	void Position(const _int _x, const _int _y) { Position(_Vector3{ s_float(_x), s_float(_y), position_.z }); }
	void Position(const _float _x, const _float _y) { Position(_Vector3{ _x, _y, position_.z }); }

	_Vector3 GetToePosition() const { return position_ + _Vector3(0.f, scale_.y, 0.f); }
	_Vector2 GetLeftTopPosition() const { return _Vector2(position_.x - scale_.x * 0.5f, position_.y - scale_.x * 0.6f * 0.5f); }

	_Vector3 Rotation() const { return rotation_; }
	void Rotation(const _Vector3 _pos) { rotation_ = _pos; }
	void Rotation(const _int _x, const _int _y) { Rotation(_Vector3{ s_float(_x), s_float(_y), rotation_.z }); }
	void Rotation(const _float _x, const _float _y) { Rotation(_Vector3{ _x, _y, rotation_.z }); }

	_Vector3 Scale() const { return scale_; }
	void Scale(const _Vector3 _pos) { scale_ = _pos; }
	void Scale(const _int _val) { Scale(_Vector3{ s_float(_val), s_float(_val), scale_.z }); }
	void Scale(const _float _val) { Scale(_Vector3{ _val, _val, scale_.z }); }
	void Scale(const _int _x, const _int _y) { Scale(_Vector3{ s_float(_x), s_float(_y), scale_.z }); }
	void Scale(const _float _x, const _float _y) { Scale(_Vector3{ _x, _y, scale_.z }); }

protected:
	_Vector3 position_;
	_Vector3 rotation_;
	_Vector3 scale_;
};

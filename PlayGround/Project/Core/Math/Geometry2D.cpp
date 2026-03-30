#include "framework.h"
#include "Geometry2D.h"
#include "Vector2.h"
#include "Vector3.h"

// _Point 구현
_Point::_Point(const _Vector2& _vec)
	: x(s_int(std::round(_vec.x))), y(s_int(std::round(_vec.y))) {
}

_Point::_Point(const _Vector3& _vec)
	: x(s_int(std::round(_vec.x))), y(s_int(std::round(_vec.y))) {
}

_Vector2 _Point::ToVector2() const {
	return { s_float(x), s_float(y) };
}

// _Size 구현
_Size::_Size(const _Vector2& _vec)
	: x(s_int(std::round(_vec.x))), y(s_int(std::round(_vec.y))) {
}

// _Rect 구현
_bool _Rect::PtInRect(const _Point& _pt) const {
	return (_pt.x >= Left() && _pt.x < Right() && _pt.y >= Top() && _pt.y < Bottom());
}

_bool _Rect::PtInRect(const _Vector2& _vec) const {
	// 실수 기반 체크로 정밀도 유지
	return (_vec.x >= Left_f() && _vec.x < s_float(Right()) &&
		_vec.y >= Top_f() && _vec.y < s_float(Bottom()));
}

void _Rect::MoveLtTo(const _Point& _lt)
{
	_Size size = Size();
	points_[0] = _lt;
	points_[1] = { _lt.x + size.x, _lt.y + size.y };
}

void _Rect::MoveCenterTo(const _Point& _newCenter) {
	_int halfW = Width() / 2;
	_int halfH = Height() / 2;
	points_[0] = { _newCenter.x - halfW, _newCenter.y - halfH };
	points_[1] = { points_[0].x + halfW * 2, points_[0].y + halfH * 2 };
}

void _Rect::ScaleFromLt(const _Size& _newSize)
{
	points_[1] = { points_[0].x + _newSize.x, points_[0].y + _newSize.y };
}

void _Rect::ScaleFromCenter(_float _scale) {
	_Point center = Center();
	const auto newHalfW = s_int(std::round((Width() * _scale) / 2.0f));
	const auto newHalfH = s_int(std::round((Height() * _scale) / 2.0f));

	points_[0] = { center.x - newHalfW, center.y - newHalfH };
	points_[1] = { center.x + newHalfW, center.y + newHalfH };
}
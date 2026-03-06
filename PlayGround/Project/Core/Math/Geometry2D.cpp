#include "framework.h"
#include "Geometry2D.h"

#include "Vector3.h"

_Point::_Point(const _Vector3& _vec) : x(_vec.x), y(_vec.y) {}

_Point _Point::operator+(const _Point& _pt) const
{
	return { x + _pt.x, y + _pt.y };
}

_Point _Point::operator+(const _Vector3& _vec) const
{
	return { x + s_int(_vec.x), y + s_int(_vec.y) };
}

_Point _Point::operator-(const _Point& _pt) const
{
	return { x - _pt.x, y - _pt.y };
}

_Point _Point::operator-(const _Vector3& _vec) const
{
	return { x - s_int(_vec.x), y - s_int(_vec.y) };
}

_Point& _Point::operator+=(const _Vector3& _vec)
{
	x += s_int(_vec.x);
	y += s_int(_vec.y);
	return *this;
}

_Point& _Point::operator-=(const _Vector3& _vec)
{
	x -= s_int(_vec.x);
	y -= s_int(_vec.y);
	return *this;
}

void _Rect::MoveLtTo(const _Point& _lt)
{
	// 새로운 Lt 좌표 설정
	_Point newLt = _lt;

	// 멤버 변수 갱신 (생성자 로직 활용)
	*this = _Rect(newLt, GetSize());
}

void _Rect::MoveCenterTo(const _Point& _center)
{
	// 현재 크기의 절반 계산
	const auto size = GetSize();
	_int halfW = size.x / 2;
	_int halfH = size.y / 2;

	// 새로운 Lt 좌표 설정 (중심점에서 절반만큼 뒤로 이동)
	_Point newLt = { _center.x - halfW, _center.y - halfH };

	// 멤버 변수 갱신 (생성자 로직 활용)
	*this = _Rect(newLt, size);
}

void _Rect::ScaleFromLt(const _Size& _new_size)
{
	// Lt 좌표는 유지하고 크기만 변경
	points_[1] = { points_[0].x + _new_size.x, points_[0].y + _new_size.y };
}

void _Rect::ScaleFromCenter(const _Size& _new_size)
{
	// 1. 현재 중심점 구하기
	_float centerX = Left_f() + (Width() / 2.0f);
	_float centerY = Top_f() + (Height() / 2.0f);

	// 2. 새로운 크기의 절반만큼 중심에서 빼서 새로운 Lt 계산
	_int newLeft = s_int(centerX - (_new_size.x / 2.0f));
	_int newTop = s_int(centerY - (_new_size.y / 2.0f));

	// 3. 데이터 갱신
	points_[0] = { newLeft, newTop };
	points_[1] = { newLeft + _new_size.x, newTop + _new_size.y };
}

_bool _Rect::PtInRect(const _Point& _pt) const
{
	return (_pt.x >= Left() && _pt.x < Right() &&
		_pt.y >= Top() && _pt.y < Bottom());
}

_bool _Rect::PtInRect(const _Vector3& _vec) const
{
	return (_vec.x >= Left_f() && _vec.x < Right_f() &&
		_vec.y >= Top_f() && _vec.y < Bottom_f());
}

_Rect& _Rect::operator*=(const _float _scale)
{
	// 1. 현재 중심점 구하기
	_float centerX = Left_f() + (Width() / 2.0f);
	_float centerY = Top_f() + (Height() / 2.0f);

	// 2. 새로운 크기 계산
	_int newW = s_int(Width() * _scale);
	_int newH = s_int(Height() * _scale);

	// 3. 새로운 크기의 절반만큼 중심에서 빼서 새로운 Lt 계산
	_int newLeft = s_int(centerX - (newW / 2.0f));
	_int newTop = s_int(centerY - (newH / 2.0f));

	// 4. 데이터 갱신
	points_[0] = { newLeft, newTop };
	points_[1] = { newLeft + newW, newTop + newH };

	return *this;
}

_Rect _Rect::operator*(const _float _scale) const
{
	_Rect temp = *this;
	temp *= _scale;
	return temp;
}

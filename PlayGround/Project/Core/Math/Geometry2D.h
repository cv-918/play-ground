#pragma once

struct _Point
{
	constexpr _Point() : x(IV_ZERO), y(IV_ZERO) {}
	constexpr _Point(const _int _value) : x(_value), y(_value) {}
	constexpr _Point(const _int _x, const _int _y) : x(_x), y(_y) {}

	static constexpr _Point Zero() { return _Point{}; }

	_int x;
	_int y;
};

struct _Size
{
	constexpr _Size() : x(IV_ZERO), y(IV_ZERO) {}
	constexpr _Size(const _int _value) : x(_value), y(_value) {}
	constexpr _Size(const _int _x, const _int _y) : x(_x), y(_y) {}

	static constexpr _Size Zero() { return _Size{}; }

	_int x;
	_int y;
};

struct _Vector3;
struct _Rect
{
	constexpr _Rect() : points_{ _Point::Zero(), _Point::Zero() }, size_{ _Size::Zero() } {}
	constexpr _Rect(const _Point& _lt, const _Point& _rb) : points_{ _lt, _rb }, size_{ _rb.x - _lt.x, _rb.y - _lt.y } {}
	constexpr _Rect(const _Point& _lt, const _Size& _size) : points_{ _lt, _Point{ _lt.x + _size.x, _lt.y + _size.y } }, size_{ _size } {}
	constexpr _Rect(const _int _left, const _int _top, const _int _right, const _int _bottom) : points_{ _Point(_left, _top), _Point(_right, _bottom) }, size_{ _right - _left, _bottom - _top } {}

	static constexpr _Rect Zero() { return _Rect{}; }

	_Point& Lt() { return points_[0]; }
	_Point& Rb() { return points_[1]; }

	_int Left() const { return points_[0].x; }
	_int Top() const { return points_[0].y; }
	_int Right() const { return points_[1].x; }
	_int Bottom() const { return points_[1].y; }

	_float Left_f() const { return s_float(points_[0].x); }
	_float Top_f() const { return s_float(points_[0].y); }
	_float Right_f() const { return s_float(points_[1].x); }
	_float Bottom_f() const { return s_float(points_[1].y); }

	_int Width() const { return size_.x; }
	_int Height() const { return size_.y; }
	_Size Size() const { return size_; }

	const RECT ToRECT() const { return RECT{ points_[0].x, points_[0].y, points_[1].x, points_[1].y }; }

	_bool PtInRect(const _Point& _pt) const;
	_bool PtInRect(const _Vector3& _vec) const;

	void MoveToCenter(const _Point& _center);

public:
	_Rect& operator*=(const _float _scale);
	_Rect operator*(const _float _scale) const;

private:
	_Point points_[2]; // lt, rb
	_Size size_;
};
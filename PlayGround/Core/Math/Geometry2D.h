#pragma once

struct _Point
{
	constexpr _Point() : x(IV_ZERO), y(IV_ZERO) {}
	static constexpr _Point Zero() { return _Point{}; }

	_int x;
	_int y;
};

struct _Size
{
	constexpr _Size() : x(IV_ZERO), y(IV_ZERO) {}
	static constexpr _Size Zero() { return _Size{}; }

	_int x;
	_int y;
};

struct _Rect
{
	static constexpr _Rect Zero() { return _Rect{}; }

	_Point points_[2]; // lt, rb
	_Size size_;
};
#pragma once

#include "Core/Math/Geometry2D.h"

struct _Vector3; // 전방 선언
struct _Vector2
{
public:
	_float x = 0.0f;
	_float y = 0.0f;

public:
	// 생성자
	constexpr _Vector2() : x(0.0f), y(0.0f) {}
	constexpr _Vector2(_float _x, _float _y) : x(_x), y(_y) {}
	constexpr _Vector2(_int _x, _int _y) : x(s_float(_x)), y(s_float(_y)) {}
	constexpr _Vector2(const _Point& _pt) : x(s_float(_pt.x)), y(s_float(_pt.y)) {}
	_Vector2(const _Vector3& _vec);

	// 정적 유틸리티 (자주 쓰이는 방향)
	static constexpr _Vector2 Zero() { return { 0.0f, 0.0f }; }
	static constexpr _Vector2 One() { return { 1.0f, 1.0f }; }
	static constexpr _Vector2 Up() { return { 0.0f, -1.0f }; } // WinAPI 좌표계 기준
	static constexpr _Vector2 Down() { return { 0.0f, 1.0f }; }
	static constexpr _Vector2 Left() { return { -1.0f, 0.0f }; }
	static constexpr _Vector2 Right() { return { 1.0f, 0.0f }; }

	// 물리 연산
	_float LengthSq() const { return x * x + y * y; }
	_float Length() const { return std::sqrt(LengthSq()); }
	_float Magnitude() const { return Length(); }

	_Vector2 Normalized() const
	{
		_float len = Length();
		if (len < 1e-5f) return _Vector2::Zero();
		return (*this) / len;
	}

	// 내적과 외적 (2D 외적은 스칼라 값을 반환하며 회전 방향 판별에 사용됨)
	static _float Dot(const _Vector2& _a, const _Vector2& _b) { return _a.x * _b.x + _a.y * _b.y; }
	static _float Cross(const _Vector2& _a, const _Vector2& _b) { return _a.x * _b.y - _a.y * _b.x; }
	static _float Distance(const _Vector2& _a, const _Vector2& _b) { return (_a - _b).Length(); }

	// 연산자 오버로딩
	_Vector2 operator+(const _Vector2& _rhs) const { return { x + _rhs.x, y + _rhs.y }; }
	_Vector2 operator-(const _Vector2& _rhs) const { return { x - _rhs.x, y - _rhs.y }; }
	_Vector2 operator*(const _float _s) const { return { x * _s, y * _s }; }
	_Vector2 operator/(const _float _s) const
	{
		if (std::fabs(_s) < 1e-5f) return _Vector2::Zero();
		return { x / _s, y / _s };
	}

	_Vector2& operator+=(const _Vector2& _rhs) { x += _rhs.x; y += _rhs.y; return *this; }
	_Vector2& operator-=(const _Vector2& _rhs) { x -= _rhs.x; y -= _rhs.y; return *this; }
	_Vector2& operator*=(const _float _s) { x *= _s; y *= _s; return *this; }

	_bool operator==(const _Vector2& _rhs) const { return x == _rhs.x && y == _rhs.y; }
	_bool operator!=(const _Vector2& _rhs) const { return !(*this == _rhs); }
};

// 스칼라 * 벡터
inline _Vector2 operator*(const _float _s, const _Vector2& _v) { return _v * _s; }
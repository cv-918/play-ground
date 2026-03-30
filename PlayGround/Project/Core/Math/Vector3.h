#pragma once

#include "Core/Math/Geometry2D.h"
#include "Vector2.h" // _Vector2와의 변환을 위해 포함

struct _Vector3
{
public:
	_float x = 0.0f;
	_float y = 0.0f;
	_float z = 0.0f;

public:
	// 생성자
	constexpr _Vector3() : x(0.0f), y(0.0f), z(0.0f) {}
	constexpr _Vector3(_float _x, _float _y, _float _z) : x(_x), y(_y), z(_z) {}
	constexpr _Vector3(_float _x, _float _y) : x(_x), y(_y), z(0.0f) {}
	constexpr _Vector3(const _Vector2& _v2, _float _z = 0.0f) : x(_v2.x), y(_v2.y), z(_z) {}
	constexpr _Vector3(const _Point& _pt) : x(s_float(_pt.x)), y(s_float(_pt.y)), z(0.0f) {}

	// 정적 유틸리티 (방향 벡터)
	static constexpr _Vector3 Zero() { return { 0.0f, 0.0f, 0.0f }; }
	static constexpr _Vector3 One() { return { 1.0f, 1.0f, 1.0f }; }
	static constexpr _Vector3 Up() { return { 0.0f, -1.0f, 0.0f }; } // WinAPI 기준
	static constexpr _Vector3 Down() { return { 0.0f, 1.0f, 0.0f }; }
	static constexpr _Vector3 Left() { return { -1.0f, 0.0f, 0.0f }; }
	static constexpr _Vector3 Right() { return { 1.0f, 0.0f, 0.0f }; }
	static constexpr _Vector3 Forward() { return { 0.0f, 0.0f, 1.0f }; }
	static constexpr _Vector3 Backward() { return { 0.0f, 0.0f, -1.0f }; }

	// 물리 연산
	_float LengthSq() const { return x * x + y * y + z * z; }
	_float Length() const { return std::sqrt(LengthSq()); }
	_float Magnitude() const { return Length(); }

	_Vector3 Normalized() const
	{
		_float len = Length();
		if (len < 1e-5f) return _Vector3::Zero();
		return (*this) / len;
	}

	// 내적과 외적
	static _float Dot(const _Vector3& _a, const _Vector3& _b) { return _a.x * _b.x + _a.y * _b.y + _a.z * _b.z; }
	static _Vector3 Cross(const _Vector3& _a, const _Vector3& _b)
	{
		return {
			_a.y * _b.z - _a.z * _b.y,
			_a.z * _b.x - _a.x * _b.z,
			_a.x * _b.y - _a.y * _b.x
		};
	}

	static _float Distance(const _Vector3& _a, const _Vector3& _b) { return (_a - _b).Length(); }

	// 연산자 오버로딩
	_Vector3 operator+(const _Vector3& _rhs) const { return { x + _rhs.x, y + _rhs.y, z + _rhs.z }; }
	_Vector3 operator-(const _Vector3& _rhs) const { return { x - _rhs.x, y - _rhs.y, z - _rhs.z }; }
	_Vector3 operator*(const _float _s) const { return { x * _s, y * _s, z * _s }; }
	_Vector3 operator/(const _float _s) const
	{
		if (std::fabs(_s) < 1e-5f) return _Vector3::Zero();
		return { x / _s, y / _s, z / _s };
	}

	_Vector3& operator+=(const _Vector3& _rhs) { x += _rhs.x; y += _rhs.y; z += _rhs.z; return *this; }
	_Vector3& operator-=(const _Vector3& _rhs) { x -= _rhs.x; y -= _rhs.y; z -= _rhs.z; return *this; }
	_Vector3& operator*=(const _float _s) { x *= _s; y *= _s; z *= _s; return *this; }

	_bool operator==(const _Vector3& _rhs) const { return x == _rhs.x && y == _rhs.y && z == _rhs.z; }
	_bool operator!=(const _Vector3& _rhs) const { return !(*this == _rhs); }

	// 형변환 연산자 (Vector2로 쉽게 변환)
	explicit operator _Vector2() const { return { x, y }; }
};

inline _Vector3 operator*(const _float _s, const _Vector3& _v) { return _v * _s; }
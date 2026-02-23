#pragma once

#include "Core/Math/Geometry2D.h"

struct _Vector3
{
public:
	// 생성자
	constexpr _Vector3() : x(IV_ZERO), y(IV_ZERO), z(IV_ZERO) {}
	constexpr _Vector3(_float _x, _float _y, _float _z) : x(_x), y(_y), z(_z) {}
	constexpr _Vector3(_float _x, _float _y) : x(_x), y(_y), z(IV_ZERO) {}
	constexpr _Vector3(_int _x, _int _y) : x(s_float(_x)), y(s_float(_y)), z(IV_ZERO) {}
	constexpr _Vector3(const _Point& _pt) : x(s_float(_pt.x)), y(s_float(_pt.y)), z(IV_ZERO) {}

	// 영벡터
	static constexpr _Vector3 Zero() { return _Vector3{}; }
	// 단위벡터
	static constexpr _Vector3 One() { return _Vector3{ 1.0f, 1.0f, 1.0f }; }

	// 길이
	_float LengthSq() const { return x * x + y * y + z * z; }
	_float Length() const { return s_float(std::sqrt(LengthSq())); }
	_float Magnitude() const { return Length(); } // Length랑 똑같은 함수인데 이름만 다르게 호출(편의용)

	// 정규화(길이가 0이면 영벡터 반환)
	_Vector3 Normalized() const
	{
		const _float len = Length();
		if (len <= 0.0f)
			return _Vector3::Zero();

		return (*this) / len;
	}

	// 제자리 정규화(길이가 0이면 변화 없음)
	void Normalize()
	{
		const _float len = Length();
		if (len <= 0.0f)
			return;

		x /= len;
		y /= len;
		z /= len;
	}

	// 내적
	static _float Dot(const _Vector3& _a, const _Vector3& _b) { return _a.x * _b.x + _a.y * _b.y + _a.z * _b.z; }

	// 외적(3D용, 2D에서는 거의 안 씀)
	static _Vector3 Cross(const _Vector3& _a, const _Vector3& _b)
	{
		return _Vector3(
			_a.y * _b.z - _a.z * _b.y,
			_a.z * _b.x - _a.x * _b.z,
			_a.x * _b.y - _a.y * _b.x
		);
	}

	// 거리
	static _float Distance(const _Vector3& _a, const _Vector3& _b) { return (_a - _b).Length(); }

	// 선형 보간
	static _Vector3 Lerp(const _Vector3& _a, const _Vector3& _b, _float _t) { return _a + (_b - _a) * _t; }

	// 근사 비교(부동소수점용)
	bool NearEquals(const _Vector3& _rhs, _float _epsilon = 1e-5f) const
	{
		return (std::fabs(x - _rhs.x) <= _epsilon) &&
			(std::fabs(y - _rhs.y) <= _epsilon) &&
			(std::fabs(z - _rhs.z) <= _epsilon);
	}

	// 연산자 오버로드
	_Vector3& operator=(const _float _s) { x = y = z = _s; return *this; }
	_Vector3& operator=(const _int _i) { x = y = z = s_float(_i); return *this; }

	_Vector3 operator+(const _Vector3& _rhs) const { return _Vector3(x + _rhs.x, y + _rhs.y, z + _rhs.z); }
	_Vector3 operator+(const _float _s) const { return _Vector3(x + _s, y + _s, z + _s); }

	_Vector3 operator-(const _Vector3& _rhs) const { return _Vector3(x - _rhs.x, y - _rhs.y, z - _rhs.z); }
	_Vector3 operator-(const _float _s) const { return _Vector3(x - _s, y - _s, z - _s); }

	_Vector3 operator*(const _float _s) const { return _Vector3(x * _s, y * _s, z * _s); }
	_Vector3 operator/(const _float _s) const
	{
		// 0 나눗셈 방지(샌드박스라 assert로 바꿔도 됨)
		if (_s == 0.0f)
			return _Vector3::Zero();
		return _Vector3(x / _s, y / _s, z / _s);
	}

	_Vector3& operator+=(const _Vector3& _rhs) { x += _rhs.x; y += _rhs.y; z += _rhs.z; return *this; }
	_Vector3& operator+=(const _float _s) { x += _s; y += _s; z += _s; return *this; }
	_Vector3& operator+=(const _int _i) { const _float _s = s_float(_i); x += _s; y += _s; z += _s; return *this; }

	_Vector3& operator-=(const _Vector3& _rhs) { x -= _rhs.x; y -= _rhs.y; z -= _rhs.z; return *this; }
	_Vector3& operator-=(const _float _s) { x -= _s; y -= _s; z -= _s; return *this; }
	_Vector3& operator-=(const _int _i) { const _float _s = s_float(_i); x -= _s; y -= _s; z -= _s; return *this; }

	_Vector3& operator*=(const _float _s) { x *= _s; y *= _s; z *= _s; return *this; }
	_Vector3& operator/=(const _float _s)
	{
		if (_s == 0.0f)
		{
			x = y = z = 0.0f;
			return *this;
		}
		x /= _s; y /= _s; z /= _s;
		return *this;
	}

	bool operator==(const _Vector3& _rhs) const { return x == _rhs.x && y == _rhs.y && z == _rhs.z; }
	bool operator!=(const _Vector3& _rhs) const { return !(*this == _rhs); }

public:
	_float x = IV_ZERO;
	_float y = IV_ZERO;
	_float z = IV_ZERO;
};

// 스칼라 * 벡터
inline _Vector3 operator*(const _float _s, const _Vector3& _v)
{
	return _v * _s;
}
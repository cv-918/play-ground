#pragma once

#define _MathFunc MathFunctions
namespace MathFunctions
{
    template<typename T>
    T Clamp(T _value, T _min, T _max)
    {
        if (_value < _min) return _min;
        if (_value > _max) return _max;
        return _value;
    }

	// 선형 보간(Linear Interpolation) | (1 - t) * start + t * end
	// t가 0이면 start, t가 1이면 end, t가 0.5면 start와 end의 중간값을 반환합니다. t는 일반적으로 0과 1 사이의 값으로 표현됩니다.
	template<typename T>
    T Lerp(T _start, T _end, _float _t)
    {
        if (_t < 0.0f) _t = 0.0f;
        if (_t > 1.0f) _t = 1.0f;
        return _start + (_end - _start) * _t;
	}

    // Ease - in Ease - out | 3차 에르미트 보간(Cubic Hermite Interpolation) | t^2(3 - 2t)
	template<typename T>
    T SmoothStep(T _edge0, T _edge1, _float _t)
    {
        if (_t < 0.0f) _t = 0.0f;
        if (_t > 1.0f) _t = 1.0f;
        _t = _t * _t * (3 - 2 * _t);
        return _edge0 + (_edge1 - _edge0) * _t;
	}
}
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

	// Degree -> Radian 변환 함수
	inline _float ToRadian(_float _degree) {
		return _degree * (PI / 180.f);
	}

	// Radian -> Degree 변환 함수
	inline _float ToDegree(_float _radian) {
		return _radian * (180.f / PI);
	}

	/** 애니메이션의 가속/감속 패턴을 정의하는 열거형 */
	enum class EaseType {
		Linear,       // 일정한 속도로 변화
		InQuad,       // 초기에 천천히 가속 (제곱)
		OutQuad,      // 마지막에 천천히 감속 (제곱)
		InOutQuad,    // 처음과 끝은 느리고 중간은 빠른 가속/감속
		InCubic,      // 초기에 아주 천천히 가속 (세제곱)
		OutCubic,     // 마지막에 아주 천천히 감속 (세제곱)
		InBack,       // 시작할 때 살짝 뒤로 물러났다가 출발
		OutBack,      // 목표치보다 살짝 더 갔다가 돌아오며 멈춤 (탄성 느낌)
		InElastic,    // 시작 부분에서 강하게 진동하며 가속
		OutElastic    // 끝 부분에서 강하게 진동하며 감속
	};

	/** 수치 t(0.0 ~ 1.0)를 Easing 곡선에 따라 변형하여 반환 */
	inline _float GetEasing(_float _t, EaseType _type)
	{
		_t = (_t < 0.0f) ? 0.0f : (_t > 1.0f ? 1.0f : _t); // Clamp 0~1

		switch (_type)
		{
		case EaseType::InQuad:    return _t * _t;
		case EaseType::OutQuad:   return 1.0f - (1.0f - _t) * (1.0f - _t);
		case EaseType::InOutQuad: return _t < 0.5f ? 2.0f * _t * _t : 1.0f - powf(-2.0f * _t + 2.0f, 2.0f) / 2.0f;

		case EaseType::InCubic:   return _t * _t * _t;
		case EaseType::OutCubic:  return 1.0f - powf(1.0f - _t, 3.0f);

		case EaseType::InBack: {
			const _float c1 = 1.70158f;
			const _float c3 = c1 + 1.0f;
			return c3 * _t * _t * _t - c1 * _t * _t;
		}
		case EaseType::OutBack: {
			const _float c1 = 1.70158f;
			const _float c3 = c1 + 1.0f;
			return 1.0f + c3 * powf(_t - 1.0f, 3.0f) + c1 * powf(_t - 1.0f, 2.0f);
		}
		case EaseType::OutElastic: {
			const _float c4 = (2.0f * PI) / 3.0f;
			return _t == 0.0f ? 0.0f : (_t == 1.0f ? 1.0f :
				powf(2.0f, -10.0f * _t) * sinf((_t * 10.0f - 0.75f) * c4) + 1.0f);
		}
		default: return _t; // Linear
		}
	}

	/** Easing이 적용된 선형 보간 템플릿 */
	template<typename T>
	T LerpWithEase(T _start, T _end, _float _t, EaseType _type)
	{
		_float easedT = GetEasing(_t, _type);
		return _start + (_end - _start) * easedT;
	}
}
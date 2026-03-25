#pragma once

#include <random>

/*
	사용 예시:
	Random::Init(); // 초기화 (한 번만 호출)
	int randInt = Random::Range(1, 10); // 1부터 10까지의 정수 난수
	float randFloat = Random::Range(0.0f, 1.0f); // 0.0부터 1.0까지의 실수 난수
*/

#define _Random Random::Get()

class Random
	: public ISingleton<Random>
	, public IInitializable
{
public:
	Random() : engine(std::random_device{}()) {}

public:
	_bool Initialize() override;

public:
	static _int Range(_int min, _int max)
	{
		std::uniform_int_distribution<_int> dist(min, max);
		return dist(_Random.engine);
	}

	static _float Range(_float min, _float max)
	{
		std::uniform_real_distribution<_float> dist(min, max);
		return dist(_Random.engine);
	}

	template<typename>
	struct always_false : std::false_type {};

	template<typename T>
	static T Range(T min, T max)
	{
		if constexpr (std::is_integral<T>::value)
		{
			std::uniform_int_distribution<T> dist(min, max);
			return dist(_Random.engine);
		}
		else if constexpr (std::is_floating_point<T>::value)
		{
			std::uniform_real_distribution<T> dist(min, max);
			return dist(_Random.engine);
		}
		else if constexpr (std::is_enum<T>::value)
		{
			using UnderlyingType = typename std::underlying_type<T>::type;

			std::uniform_int_distribution<UnderlyingType> dist(
				s_cast(UnderlyingType, min),
				s_cast(UnderlyingType, max)
			);

			return s_cast(T, dist(_Random.engine));
		}
		else
		{
			static_assert(always_false<T>::value, "Unsupported type for Random::Range");
		}
	}

private:
	std::mt19937 engine;
};

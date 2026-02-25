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
	virtual _bool Initialize() override;

public:
	static int Range(int min, int max)
	{
		std::uniform_int_distribution<int> dist(min, max);
		return dist(_Random.engine);
	}

	static float Range(float min, float max)
	{
		std::uniform_real_distribution<float> dist(min, max);
		return dist(_Random.engine);
	}

private:
	std::mt19937 engine;
};

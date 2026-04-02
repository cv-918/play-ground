#pragma once

#define _Timer Timer::Get()

class Timer
	: public ISingleton<Timer>
	, public IInitializable
{
public:
	_bool Initialize() override;
	void Update();

public:
	_double DeltaTime() const { return delta_time_; }
	_double TotalTime() const { return total_time_; }
	_uint FPS() const { return fps_; }

private:
	LARGE_INTEGER frequency_;      // 초당 카운트 횟수
	LARGE_INTEGER prev_count_;     // 이전 프레임 카운트

	_double delta_time_ = 0.0;     // 프레임 간 시간
	_double total_time_ = 0.0;     // 게임 시작 후 총 시간

	// FPS 계산용
	_double fps_timer_ = 0.0;
	_uint   fps_count_ = 0;
	_uint   fps_ = 0;
};


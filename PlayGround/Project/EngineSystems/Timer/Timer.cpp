#include "framework.h"
#include "Timer.h"

_bool Timer::Initialize()
{
	// 하드웨어가 고해상도 카운터를 지원하는지 확인 및 빈도수 취득
	if (!QueryPerformanceFrequency(&frequency_))
		return false;

	QueryPerformanceCounter(&prev_count_);
	return true;
}

void Timer::Update()
{
	LARGE_INTEGER curr_count;
	QueryPerformanceCounter(&curr_count);

	// 델타 타임 계산 (현재 카운트 - 이전 카운트) / 빈도수
	delta_time_ = s_cast(_double, curr_count.QuadPart - prev_count_.QuadPart) / s_cast(_double, frequency_.QuadPart);

	// 비정상적으로 큰 값 방지 (디버깅 브레이크 포인트 등 대응)
	if (delta_time_ > 0.1) delta_time_ = 0.016;

	prev_count_ = curr_count;
	total_time_ += delta_time_;

	// FPS 계산
	fps_timer_ += delta_time_;
	fps_count_++;
	if (fps_timer_ >= 1.0)
	{
		fps_ = fps_count_;
		fps_count_ = 0;
		fps_timer_ = 0.0;
	}
}

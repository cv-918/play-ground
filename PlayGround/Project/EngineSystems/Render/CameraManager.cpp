#include "framework.h"
#include "CameraManager.h"

void CameraManager::Update(_double _delta_time)
{
	if (shake_duration_ > 0.f)
	{
		shake_duration_ -= (_float)_delta_time;

		// 랜덤하게 흔들기 (Math/Random.h의 _Random 활용)
		camera_offset_.x = _Random.Range(-shake_intensity_, shake_intensity_);
		camera_offset_.y = _Random.Range(-shake_intensity_, shake_intensity_);

		// 서서히 약해지게 하고 싶다면 아래 주석 해제
		// shake_intensity_ *= 0.95f; 
	}
	else
	{
		// 지속 시간이 다 되면 원위치
		camera_offset_ = { 0, 0 };
		shake_intensity_ = 0.f;
	}
}

void CameraManager::Shake(_float _intensity, _float _duration)
{
	// 이미 흔들리고 있다면 더 강한 쪽을 선택하거나 중첩 가능
	shake_intensity_ = _intensity;
	shake_duration_ = _duration;
}

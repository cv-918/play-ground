#pragma once

#define _CameraMgr CameraManager::Get()

class CameraManager final
	: public ISingleton<CameraManager>
{
public:
	// 매 프레임 업데이트 (흔들림 계산)
	void Update(_double _delta_time);

	// 흔들림 시작 명령 (강도, 지속 시간)
	void Shake(_float _intensity, _float _duration);

	// 현재 계산된 오프셋 값 반환
	_Point GetOffset() const { return camera_offset_; }

private:
	_float shake_intensity_ = 0.f;
	_float shake_duration_ = 0.f;
	_Point camera_offset_ = { 0, 0 };
};


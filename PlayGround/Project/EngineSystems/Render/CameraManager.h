#pragma once

#define _CameraMgr CameraManager::Get()

class Transform;

class CameraManager final
	: public ISingleton<CameraManager>
{
public:
	void Initialize(_int _viewport_width, _int _viewport_height);
	void Update(_double _delta_time);

	void SetPosition(const _Vector2& _position);
	const _Vector2& GetPosition() const { return camera_position_; }

	void SetFollowTarget(Transform* _target);
	void ClearFollowTarget();

	void SetFollowOffset(const _Vector2& _offset);
	void SetSmoothing(_float _speed);
	void EnableSmoothing(bool _enable);

	void SetWorldBounds(const RECT& _world_bounds);
	void EnableClamp(bool _enable);

	void Shake(_float _intensity, _float _duration);

	_Point WorldToScreen(const _Vector2& _world_position) const;
	_Vector2 ScreenToWorld(const _Point& _screen_position) const;

	RECT GetCameraWorldRect() const;
	bool IsInView(const RECT& _world_rect) const;

	_Point GetShakeOffset() const { return camera_offset_; }

private:
	void UpdateFollow(_double _delta_time);
	void ApplyClamp();
	_Vector2 GetTargetCameraPosition() const;

private:
	_Vector2 camera_position_ = { 0.f, 0.f };
	_Point camera_offset_ = { 0, 0 };

	Transform* follow_target_ = nullptr;
	_Vector2 follow_offset_ = { 0.f, 0.f };

	_float smoothing_speed_ = 10.f;
	bool use_smoothing_ = false;

	bool use_clamp_ = false;
	RECT world_bounds_ = { 0, 0, 0, 0 };

	_int viewport_width_ = 0;
	_int viewport_height_ = 0;

	_float shake_intensity_ = 0.f;
	_float shake_duration_ = 0.f;
};
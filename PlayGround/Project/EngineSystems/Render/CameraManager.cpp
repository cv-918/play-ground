#include "framework.h"
#include "CameraManager.h"

#include "GamePlay/Components/Transform.h"

void CameraManager::Initialize(_int _viewport_width, _int _viewport_height)
{
	viewport_width_ = _viewport_width;
	viewport_height_ = _viewport_height;
}

void CameraManager::Update(_double _delta_time)
{
	UpdateFollow(_delta_time);

	if (shake_duration_ > 0.f)
	{
		shake_duration_ -= (_float)_delta_time;

		camera_offset_.x = _Random.Range(-shake_intensity_, shake_intensity_);
		camera_offset_.y = _Random.Range(-shake_intensity_, shake_intensity_);
	}
	else
	{
		camera_offset_ = { 0, 0 };
		shake_intensity_ = 0.f;
	}
}

void CameraManager::SetPosition(const _Vector2& _position)
{
	camera_position_ = _position;
	ApplyClamp();
}

void CameraManager::SetFollowTarget(Transform* _target)
{
	follow_target_ = _target;
}

void CameraManager::ClearFollowTarget()
{
	follow_target_ = nullptr;
}

void CameraManager::SetFollowOffset(const _Vector2& _offset)
{
	follow_offset_ = _offset;
}

void CameraManager::SetSmoothing(_float _speed)
{
	smoothing_speed_ = _speed;
}

void CameraManager::EnableSmoothing(bool _enable)
{
	use_smoothing_ = _enable;
}

void CameraManager::SetWorldBounds(const RECT& _world_bounds)
{
	world_bounds_ = _world_bounds;
}

void CameraManager::EnableClamp(bool _enable)
{
	use_clamp_ = _enable;
}

void CameraManager::Shake(_float _intensity, _float _duration)
{
	shake_intensity_ = _intensity;
	shake_duration_ = _duration;
}

_Point CameraManager::WorldToScreen(const _Vector2& _world_position) const
{
  const _float screen_x = _world_position.x - camera_position_.x;
	const _float screen_y = _world_position.y - camera_position_.y;

	return { (_int)screen_x, (_int)screen_y };
}

_Vector2 CameraManager::ScreenToWorld(const _Point& _screen_position) const
{
	return
	{
     (_float)_screen_position.x + camera_position_.x,
		(_float)_screen_position.y + camera_position_.y
	};
}

RECT CameraManager::GetCameraWorldRect() const
{
	const LONG left = (LONG)camera_position_.x;
	const LONG top = (LONG)camera_position_.y;
	const LONG right = left + viewport_width_;
	const LONG bottom = top + viewport_height_;

	return { left, top, right, bottom };
}

bool CameraManager::IsInView(const RECT& _world_rect) const
{
	RECT camera_rect = GetCameraWorldRect();
	RECT intersect_rect = {};

	return IntersectRect(&intersect_rect, &camera_rect, &_world_rect) == TRUE;
}

void CameraManager::UpdateFollow(_double _delta_time)
{
	if (follow_target_ == nullptr)
		return;

	const _Vector2 target_camera_position = GetTargetCameraPosition();

	if (use_smoothing_ == false)
	{
		camera_position_ = target_camera_position;
		ApplyClamp();
		return;
	}

	const _float t = (_float)_delta_time * smoothing_speed_;

	camera_position_.x += (target_camera_position.x - camera_position_.x) * t;
	camera_position_.y += (target_camera_position.y - camera_position_.y) * t;

	ApplyClamp();
}

_Vector2 CameraManager::GetTargetCameraPosition() const
{
	const _Vector2 target_world_position = follow_target_->Position();

	return
	{
		target_world_position.x - (viewport_width_ * 0.5f) + follow_offset_.x,
		target_world_position.y - (viewport_height_ * 0.5f) + follow_offset_.y
	};
}

void CameraManager::ApplyClamp()
{
	if (use_clamp_ == false)
		return;

	const _float world_width = (_float)(world_bounds_.right - world_bounds_.left);
	const _float world_height = (_float)(world_bounds_.bottom - world_bounds_.top);

	const _float max_x = std::max((_float)world_bounds_.left, (_float)world_bounds_.left + world_width - viewport_width_);
	const _float max_y = std::max((_float)world_bounds_.top, (_float)world_bounds_.top + world_height - viewport_height_);

	if (camera_position_.x < (_float)world_bounds_.left)
		camera_position_.x = (_float)world_bounds_.left;
	if (camera_position_.y < (_float)world_bounds_.top)
		camera_position_.y = (_float)world_bounds_.top;

	if (camera_position_.x > max_x)
		camera_position_.x = max_x;
	if (camera_position_.y > max_y)
		camera_position_.y = max_y;
}
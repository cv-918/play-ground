#include "framework.h"
#include "Movement.h"

_bool Movement::Initialize()
{
	transform_ = s_cast(Transform*, gameobject_->GetComponent(ComponentType::Transform));

	if (!transform_)
		return false;

	return true;
}

_int Movement::Update(_double _delta_time)
{
	if (allow_normal_move_ && move_func_)
		move_func_(_delta_time);

	_UpdateDash(_delta_time);
	_UpdateImpulse(_delta_time);
	_ApplyFinalMovement(_delta_time);

	return UPDATE_CONTINUE;
}

void Movement::Render(_double _delta_time)
{
	if (!_GameState.debug_mode_)
		return;

	if (impulse_velocity_.Magnitude() > 3.f)
	{
		const float line_length = 75.f;

		const auto position = transform_->Position();
		const auto line_to = position + impulse_velocity_.Normalized() * line_length;

		_DrawFunc::DrawLine(_Point{ position.x, position.y }, _Point{ line_to.x, line_to.y }, Palette::Crimson);
	}

	if (use_nav_mesh_ && nav_boundary_mode_ != NavBoundaryMode::None && nav_footprint_radius_ > 0.f)
	{
		const auto sample = _GetNavSamplePoint();
		const auto screen_sample = _CameraMgr.WorldToScreen(sample);
		const _float diameter = nav_footprint_radius_ * 2.f;
		const _Point lt = { s_int(screen_sample.x - nav_footprint_radius_), s_int(screen_sample.y - nav_footprint_radius_) };
		_DrawFunc::DrawEllipse({ lt, _Size{ diameter, diameter } }, Palette::Gold, 1.25f);
	}
}

void Movement::SetAsMaxSpeed()
{
	const auto velocity = GetMoveVelocity();

	if (velocity.LengthSq() <= 0.f)
		return;

	SetMoveVelocity(velocity.Normalized() * move_spd_max_);
}

void Movement::StopImmediately()
{
	move_velocity_ = _Vector3::Zero();
	impulse_velocity_ = _Vector3::Zero();
}

void Movement::StartDash(const _Vector3& _direction, _float _speed, _double _duration)
{
	if (_direction.LengthSq() <= 0.f)
		return;

	control_mode_ = MovementControlMode::Dash;
	dash_direction_ = _direction.Normalized();
	dash_speed_ = _speed;
	dash_duration_ = _duration;
	dash_elapsed_ = 0.0;

	// 대시 시작 시 기존 입력 이동은 끊는다.
	move_velocity_ = _Vector3::Zero();
}

void Movement::EndDash()
{
	control_mode_ = MovementControlMode::Normal;
	dash_direction_ = _Vector3::Zero();
	dash_speed_ = 0.f;
	dash_duration_ = 0.0;
	dash_elapsed_ = 0.0;
}

void Movement::AddImpulse(const _Vector3& _impulse)
{
	if (_impulse.LengthSq() <= 0.f)
		return;

	if (IsDashing() && dash_impulse_policy_ == DashImpulsePolicy::CancelDashOnImpulse)
		EndDash();

	if (IsDashing() && dash_impulse_policy_ == DashImpulsePolicy::IgnoreImpulse)
		return;

	impulse_velocity_ += _impulse;
}

void Movement::ClearImpulse()
{
	impulse_velocity_ = _Vector3::Zero();
}

void Movement::StartDashByInputDir(_float _speed, _double _duration)
{
	_Vector3 dash_dir = move_direction_;

	// 현재 입력 방향이 없으면 현재 이동 속도 방향을 사용
	if (dash_dir.LengthSq() <= 0.f && move_velocity_.LengthSq() > 0.f)
		dash_dir = move_velocity_.Normalized();

	// 그래도 없으면 전방 대시
	if (dash_dir.LengthSq() <= 0.f)
		dash_dir = transform_->Forward2D();

	StartDash(dash_dir, _speed, _duration);
}

void Movement::ApplyKnockback(const _Vector3& _direction, _float _power)
{
	if (_direction.LengthSq() <= 0.f || _power <= 0.f)
		return;

	AddImpulse(_direction.Normalized() * _power);
}

void Movement::_ClampMoveVelocity()
{
	const _float max_speed_sq = move_spd_max_ * move_spd_max_;
	if (move_velocity_.LengthSq() > max_speed_sq)
		move_velocity_ = move_velocity_.Normalized() * move_spd_max_;
}

void Movement::_ApplyFrictionToMoveVelocity(_double _delta_time)
{
	const _float dt = s_cast(_float, _delta_time);
	const _float decay = std::max(0.f, 1.f - friction_ * dt);

	move_velocity_ *= decay;

	if (move_velocity_.LengthSq() < 0.0001f)
		move_velocity_ = _Vector3::Zero();
}

void Movement::_ApplyFrictionToImpulseVelocity(_double _delta_time)
{
	const _float dt = s_cast(_float, _delta_time);
	const _float decay = std::max(0.f, 1.f - impulse_friction_ * dt);

	impulse_velocity_ *= decay;

	if (impulse_velocity_.LengthSq() < 0.0001f)
		impulse_velocity_ = _Vector3::Zero();
}

void Movement::_UpdateDash(_double _delta_time)
{
	if (!IsDashing())
		return;

	dash_elapsed_ += _delta_time;

	if (dash_elapsed_ >= dash_duration_)
		EndDash();
}

void Movement::_UpdateImpulse(_double _delta_time)
{
	_ApplyFrictionToImpulseVelocity(_delta_time);
}

void Movement::_ApplyFinalMovement(_double _delta_time)
{
	_Vector3 final_velocity = _Vector3::Zero();

	if (IsDashing())
		final_velocity = dash_direction_ * dash_speed_;
	else
		final_velocity = move_velocity_;

	final_velocity += impulse_velocity_;

	if (final_velocity.LengthSq() <= 0.f)
	{
		_ClampToNavMesh();
		return;
	}

	const _Vector3 delta = final_velocity * s_cast(_float, _delta_time);
	transform_->Translate(delta);
	_ClampToNavMesh();
}

_Vector2 Movement::_GetNavSamplePoint() const
{
	if (!transform_)
		return _Vector2::Zero();

	const auto position = transform_->Position();
	return _Vector2{ position.x, position.y + nav_footprint_offset_y_ };
}

void Movement::_ClampToNavMesh()
{
	if (!use_nav_mesh_ || !transform_)
		return;

	if (nav_boundary_mode_ == NavBoundaryMode::None)
		return;

	if (nav_mesh_.Width() <= 0 || nav_mesh_.Height() <= 0)
		return;

	const auto footprint_radius = std::max(0.f, nav_footprint_radius_);
	_float margin_x = footprint_radius;
	_float margin_y = footprint_radius;

	if (nav_boundary_mode_ == NavBoundaryMode::ContainVisualBounds)
	{
		margin_x += nav_visual_margin_x_;
		margin_y += nav_visual_margin_y_;
	}

	auto sample = _GetNavSamplePoint();

	const auto min_x = nav_mesh_.Left_f() + margin_x;
	const auto max_x = nav_mesh_.Right_f() - margin_x;
	const auto min_y = nav_mesh_.Top_f() + margin_y;
	const auto max_y = nav_mesh_.Bottom_f() - margin_y;

	if (min_x <= max_x)
		sample.x = std::clamp(sample.x, min_x, max_x);
	else
		sample.x = (min_x + max_x) * 0.5f;

	if (min_y <= max_y)
		sample.y = std::clamp(sample.y, min_y, max_y);
	else
		sample.y = (min_y + max_y) * 0.5f;

	auto position = transform_->Position();
	position.x = sample.x;
	position.y = sample.y - nav_footprint_offset_y_;
	transform_->Position(position);
}

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
	const _bool is_rooted = HasMovementLock(MovementControlLock::Root);
	const _bool is_input_locked =
		HasMovementLock(MovementControlLock::MoveInputLock) ||
		HasMovementLock(MovementControlLock::CastLock);
	const _bool is_knockback_active = IsKnockbackActive();
	const _bool can_process_normal_move = allow_normal_move_ && !is_rooted && !is_input_locked && !is_knockback_active;

	if (can_process_normal_move && move_func_)
	{
		move_func_(_delta_time);
	}
	else if (is_rooted)
	{
		move_velocity_ = _Vector3::Zero();
	}
	else if (is_input_locked)
	{
		_ApplyFrictionToMoveVelocity(_delta_time);
	}

	_UpdateDash(_delta_time);
	_UpdateImpulse(_delta_time);
	_UpdateKnockback(_delta_time);
	_ApplyFinalMovement(_delta_time);

	return UPDATE_CONTINUE;
}

void Movement::Render(_double _delta_time)
{
	if (!_GameState.debug_mode_)
		return;

	(void)_delta_time;

	if (impulse_velocity_.Magnitude() > 3.f)
	{
		const float line_length = 75.f;

		const auto position = transform_->Position();
		const auto line_to = position + impulse_velocity_.Normalized() * line_length;

		_DrawFunc::DrawLine(_Point{ position.x, position.y }, _Point{ line_to.x, line_to.y }, Palette::Crimson);
	}

	if (use_nav_mesh_ && nav_boundary_mode_ != NavBoundaryMode::None)
	{
		const auto sample = _GetNavSamplePoint();
		const auto screen_sample = _CameraMgr.WorldToScreen(sample);

		const _float footprint_radius = std::max(0.f, nav_footprint_radius_);
		if (footprint_radius > 0.f)
		{
			const _float diameter = footprint_radius * 2.f;
			const _Point lt = { s_int(screen_sample.x - footprint_radius), s_int(screen_sample.y - footprint_radius) };
			_DrawFunc::DrawEllipse({ lt, _Size{ diameter, diameter } }, Palette::Gold, 1.25f);
		}

		_float margin_x = footprint_radius;
		_float margin_y = footprint_radius;
		if (nav_boundary_mode_ == NavBoundaryMode::ContainVisualBounds)
		{
			margin_x += nav_visual_margin_x_;
			margin_y += nav_visual_margin_y_;

			const _Rect visual_bounds = _Rect::FromCenter(
				screen_sample,
				s_int(std::round(margin_x)),
				s_int(std::round(margin_y)));
			_DrawFunc::DrawRectangle(visual_bounds, Palette::Orange, 1.25f);
		}

		if (nav_mesh_.Width() > 0 && nav_mesh_.Height() > 0)
		{
			const _Rect nav_mesh_screen = {
				_CameraMgr.WorldToScreen(_Vector2{ nav_mesh_.Left_f(), nav_mesh_.Top_f() }),
				_CameraMgr.WorldToScreen(_Vector2{ nav_mesh_.Right_f(), nav_mesh_.Bottom_f() })
			};
			_DrawFunc::DrawRectangle(nav_mesh_screen, Palette::SlateGray, 1.f);

			const _float min_x = nav_mesh_.Left_f() + margin_x;
			const _float max_x = nav_mesh_.Right_f() - margin_x;
			const _float min_y = nav_mesh_.Top_f() + margin_y;
			const _float max_y = nav_mesh_.Bottom_f() - margin_y;

			if (min_x <= max_x && min_y <= max_y)
			{
				const _Rect movable_sample_rect = {
					_CameraMgr.WorldToScreen(_Vector2{ min_x, min_y }),
					_CameraMgr.WorldToScreen(_Vector2{ max_x, max_y })
				};
				_DrawFunc::DrawRectangle(movable_sample_rect, Palette::Aqua, 1.f);
			}
		}
	}
}

void Movement::SetAsMaxSpeed()
{
	const auto velocity = GetMoveVelocity();

	if (velocity.LengthSq() <= 0.f)
		return;

	SetMoveVelocity(velocity.Normalized() * GetEffectiveMoveSpdMax());
}

void Movement::ApplyImmediateMoveSpeedBoost()
{
	_Vector3 boost_direction = move_direction_;

	if (boost_direction.LengthSq() <= 0.f && move_velocity_.LengthSq() > 0.f)
		boost_direction = move_velocity_.Normalized();

	if (boost_direction.LengthSq() <= 0.f && transform_)
		boost_direction = transform_->Forward2D();

	if (boost_direction.LengthSq() <= 0.f)
		return;

	move_velocity_ = boost_direction.Normalized() * GetEffectiveMoveSpdMax();
}

void Movement::StopImmediately()
{
	move_velocity_ = _Vector3::Zero();
	impulse_velocity_ = _Vector3::Zero();
	ClearKnockback();
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

void Movement::ClearKnockback()
{
	knockback_direction_ = _Vector3::Zero();
	knockback_velocity_ = _Vector3::Zero();
	knockback_total_distance_ = 0.f;
	knockback_duration_ = 0.0;
	knockback_elapsed_ = 0.0;
	knockback_curve_ = KnockbackCurve::OutCubic;
}

void Movement::ApplyExternalDisplacement(const _Vector3& _displacement)
{
	if (!transform_ || _displacement.LengthSq() <= 0.f)
		return;

	transform_->Translate(_displacement);
	_ClampToNavMesh();
}

_bool Movement::IsKnockbackActive() const
{
	return knockback_total_distance_ > 0.f &&
		knockback_duration_ > 0.0 &&
		knockback_elapsed_ < knockback_duration_;
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

void Movement::StartKnockback(const _Vector3& _direction, _float _distance_world_px, _float _duration_sec, KnockbackCurve _curve)
{
	if (_direction.LengthSq() <= 0.f || _distance_world_px <= 0.f || _duration_sec <= 0.f)
		return;

	if (IsDashing() && dash_impulse_policy_ == DashImpulsePolicy::CancelDashOnImpulse)
		EndDash();

	if (IsDashing() && dash_impulse_policy_ == DashImpulsePolicy::IgnoreImpulse)
		return;

	if (_GetRemainingKnockbackDistance() >= _distance_world_px)
		return;

	knockback_direction_ = _direction.Normalized();
	knockback_total_distance_ = _distance_world_px;
	knockback_duration_ = _duration_sec;
	knockback_elapsed_ = 0.0;
	knockback_velocity_ = _Vector3::Zero();
	knockback_curve_ = _curve;
	move_velocity_ = _Vector3::Zero();
}

void Movement::ApplyKnockback(const _Vector3& _direction, _float _power)
{
	if (_direction.LengthSq() <= 0.f || _power <= 0.f)
		return;

	const _float normalized_power = _MathFunc::Clamp(_power / 900.f, 0.f, 1.f);
	const _float legacy_distance = _power / 7.5f;
	const _float legacy_duration = _MathFunc::Lerp(0.10f, 0.20f, normalized_power);

	StartKnockback(_direction, legacy_distance, legacy_duration, KnockbackCurve::OutCubic);
}

MovementState Movement::_GetMovementState() const
{
	if (IsDashing())
		return MovementState::Dash;

	if (IsKnockbackActive())
		return MovementState::Knockback;

	return MovementState::Normal;
}

_float Movement::_GetRemainingKnockbackDistance() const
{
	if (knockback_total_distance_ <= 0.f || knockback_duration_ <= 0.0)
		return 0.f;

	const _float progress = _MathFunc::Clamp(
		s_cast(_float, knockback_elapsed_ / knockback_duration_),
		0.f,
		1.f);

	const _float eased_progress = EvaluateKnockbackCurve(progress, knockback_curve_);
	return knockback_total_distance_ * (1.f - eased_progress);
}

void Movement::_ClampMoveVelocity()
{
	const _float effective_max_speed = GetEffectiveMoveSpdMax();
	const _float max_speed_sq = effective_max_speed * effective_max_speed;
	if (move_velocity_.LengthSq() > max_speed_sq)
		move_velocity_ = move_velocity_.Normalized() * effective_max_speed;
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

void Movement::_UpdateKnockback(_double _delta_time)
{
	knockback_velocity_ = _Vector3::Zero();

	if (knockback_total_distance_ <= 0.f || knockback_duration_ <= 0.0)
		return;

	if (_delta_time <= 0.0)
		return;

	if (knockback_elapsed_ >= knockback_duration_)
		return;

	const _double next_elapsed = std::min(knockback_elapsed_ + _delta_time, knockback_duration_);
	const _float prev_progress = _MathFunc::Clamp(s_cast(_float, knockback_elapsed_ / knockback_duration_), 0.f, 1.f);
	const _float next_progress = _MathFunc::Clamp(s_cast(_float, next_elapsed / knockback_duration_), 0.f, 1.f);

	const _float prev_eased = EvaluateKnockbackCurve(prev_progress, knockback_curve_);
	const _float next_eased = EvaluateKnockbackCurve(next_progress, knockback_curve_);
	const _float eased_delta = std::max(0.f, next_eased - prev_eased);

	knockback_elapsed_ = next_elapsed;

	if (eased_delta <= 0.f)
		return;

	const _float frame_distance = knockback_total_distance_ * eased_delta;
	const _float dt = s_cast(_float, _delta_time);
	knockback_velocity_ = knockback_direction_ * (frame_distance / dt);
}

void Movement::_ApplyFinalMovement(_double _delta_time)
{
	_Vector3 final_velocity = _Vector3::Zero();

	switch (_GetMovementState())
	{
	case MovementState::Dash:
		final_velocity = dash_direction_ * dash_speed_;
		break;

	case MovementState::Knockback:
		break;

	case MovementState::Normal:
	default:
		final_velocity = move_velocity_;
		break;
	}

	final_velocity += impulse_velocity_;
	final_velocity += knockback_velocity_;

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

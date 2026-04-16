#include "framework.h"
#include "NonPlayableMovement.h"

_bool NonPlayableMovement::Initialize()
{
	if (!__super::Initialize())
		return false;

	switch (move_pattern_)
	{
	case MovementPattern::Directional:
		move_func_ = [this](_double _delta_time) { _ProcessOnDirectional(_delta_time); };
		break;
	case MovementPattern::Target:
		move_func_ = [this](_double _delta_time) { _ProcessOnToTarget(_delta_time); };
		break;
	}

	MAKE_INITIALIZED;
	return true;
}
void NonPlayableMovement::_ProcessOnDirectional(_double _delta_time)
{
	// 정해진 방향으로만 직선 이동
	if (move_direction_.LengthSq() <= 0.f)
	{
		SetMoveVelocity(_Vector3::Zero());
		return;
	}

	SetMoveVelocity(move_direction_.Normalized() * move_spd_);
}

void NonPlayableMovement::_ProcessOnToTarget(_double _delta_time)
{
	if (nullptr == target_)
	{
		SetMoveVelocity(_Vector3::Zero());
		return;
	}

	enum class MoveMethod
	{
		Steering,
		Immediate
	};

	static MoveMethod move_method = MoveMethod::Immediate;

	switch (move_method)
	{
	case MoveMethod::Steering:
	{
		const auto target_transform = target_->GetTransform();
		const auto target_position = target_transform->Position();

		const auto position = transform_->Position();
		auto direction_to_target = target_position - position;

		const auto distance = direction_to_target.Length();
		if (distance < 1.0f)
		{
			SetMoveVelocity(_Vector3::Zero());
			return;
		}

		direction_to_target = direction_to_target.Normalized();

		const auto old_look = transform_->Forward2D();
		_Vector3 new_look;

		if (rotate_spd_ > 0.f)
		{
			new_look = _MathFunc::Lerp(
				old_look,
				direction_to_target,
				s_cast(_float, rotate_spd_ * _delta_time)).Normalized();
		}
		else
		{
			new_look = direction_to_target;
		}

		const auto look_point = position + new_look * 5.f;
		transform_->LookAt(look_point);

		SetMoveVelocity(new_look * move_spd_);
	}
	break;

	case MoveMethod::Immediate:
	{
		const auto target_transform = target_->GetTransform();
		const auto target_position = target_transform->Position();

		const auto position = transform_->Position();
		auto direction_to_target = target_position - position;

		const auto distance = direction_to_target.Length();
		if (distance < 1.0f)
		{
			SetMoveVelocity(_Vector3::Zero());
			return;
		}

		direction_to_target = direction_to_target.Normalized();

		transform_->LookAt(target_position);
		SetMoveVelocity(direction_to_target * move_spd_);
	}
	break;
	}
}
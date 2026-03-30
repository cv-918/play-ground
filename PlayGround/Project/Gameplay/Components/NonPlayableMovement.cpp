#include "framework.h"
#include "NonPlayableMovement.h"

_bool NonPlayableMovement::Initialize()
{
	if (!__super::Initialize())
		return false;

	switch (move_pattern_)
	{
	case MovementPattern::Stopped:
		move_func_ = [this](_double _delta_time) { _ProcessOnstopped(_delta_time); };
		break;
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

void NonPlayableMovement::_ProcessOnstopped(_double _delta_time)
{
	// 자체적인 이동 외에 '밀림' 같은 내용이 필요하다면 여기에서 구현
}

void NonPlayableMovement::_ProcessOnDirectional(_double _delta_time)
{
	// 정해진 방향으로만 직선 이동
	transform_->Translate(move_direction_ * move_spd_ * _delta_time);
}

void NonPlayableMovement::_ProcessOnToTarget(_double _delta_time)
{
	if (nullptr == target_)
		return;

	enum class MoveMethod
	{
		Steering,		// 회전 속도에 의해 제한된 회전
		Immediate		// 제한이 없는 즉시 회전
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

		// 거리가 아주 가까우면 진동 방지를 위해 리턴
		const auto distance = direction_to_target.Length();
		if (distance < 1.0f) return;

		direction_to_target = direction_to_target.Normalized();

		const auto old_look = transform_->Forward2D();
		_Vector3 new_look;

		if (rotate_spd_ > 0.f)
		{
			// 현재 이동 방향(move_direction_)을 타겟 방향으로 부드럽게 회전
			new_look = _MathFunc::Lerp(old_look, direction_to_target, s_cast(_float, rotate_spd_ * _delta_time)).Normalized();
		}
		else
		{
			// 회전 속도가 0이면 즉각적으로 타겟을 바라봄
			new_look = direction_to_target;
		}

		const auto look_point = new_look * 5.f; // 5.f 앞의 임의의 지점을 선정
		transform_->LookAt(position + look_point);
		transform_->TranslateToForward(move_spd_ * s_cast(_float, _delta_time));
	}
	break;

	case MoveMethod::Immediate:
	{
		const auto target_transform = target_->GetTransform();
		const auto target_position = target_transform->Position();
		transform_->LookAt(target_position);
		transform_->TranslateToForward(move_spd_ * s_cast(_float, _delta_time));
	}
	break;
	}
}
#include "framework.h"
#include "NonPlayableMovement.h"

#include "Actors/GameObjectBase.h"

NonPlayableMovement::~NonPlayableMovement()
{
	_DetachTarget();
}

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

void NonPlayableMovement::Target(GameObjectBase* _object)
{
	if (target_ == _object)
		return;

	_DetachTarget();

	target_ = _object;
	if (target_ == nullptr)
		return;

	target_callback_id_ = target_->AddDestructionCallback([this]() {
		_HandleTargetDestroyed();
	});
}

void NonPlayableMovement::_ProcessOnDirectional(_double _delta_time)
{
	// 정해진 방향으로만 직선 이동
	if (move_direction_.LengthSq() <= 0.f)
	{
		SetMoveVelocity(_Vector3::Zero());
		return;
	}

	SetMoveVelocity(move_direction_.Normalized() * GetEffectiveMoveSpd());
}

void NonPlayableMovement::_ProcessOnToTarget(_double _delta_time)
{
	if (target_ == nullptr || target_->IsPendingDestruction())
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
		if (target_transform == nullptr)
		{
			SetMoveVelocity(_Vector3::Zero());
			return;
		}

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

		SetMoveVelocity(new_look * GetEffectiveMoveSpd());
	}
	break;

	case MoveMethod::Immediate:
	{
		const auto target_transform = target_->GetTransform();
		if (target_transform == nullptr)
		{
			SetMoveVelocity(_Vector3::Zero());
			return;
		}

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
		SetMoveVelocity(direction_to_target * GetEffectiveMoveSpd());
	}
	break;
	}
}

void NonPlayableMovement::_HandleTargetDestroyed()
{
	target_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
	target_ = nullptr;
}

void NonPlayableMovement::_DetachTarget()
{
	if (target_ && target_callback_id_ != IDestroyable::kInvalidDestructionCallbackId)
		target_->RemoveDestructionCallback(target_callback_id_);

	target_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
	target_ = nullptr;
}

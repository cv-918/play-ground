#include "framework.h"
#include "PlayerMovement.h"

#include "Actors/Stage/StagePlayer.h"
#include "EngineSystems/Render/CameraManager.h"

#include <cmath>

PlayerMovement::PlayerMovement(const PlayableCharacterJsonInfo* _info)
	: input_manager_(nullptr)
{
	move_func_ = [this](_double _delta_time) { _ProcessOnPlayerControl(_delta_time); };

	input_manager_ = &_InputMgr.Get();

	move_spd_max_ = _info->move_speed_max_;
	acceleration_ = _info->acceleration_;
	friction_ = _info->friction_;
}

_bool PlayerMovement::Initialize()
{
	if (!__super::Initialize())
		return false;

	MAKE_INITIALIZED;
	return true;
}

void PlayerMovement::_ProcessOnPlayerControl(_double _delta_time)
{
	if (input_manager_ && transform_ && input_manager_->GetCurrentPreset() == ControllerPreset::MouseOnly)
	{
		const _Vector3 player_pos = transform_->Position();
		const _Point player_screen = _CameraMgr.WorldToScreen(_Vector2{ player_pos.x, player_pos.y });
		input_manager_->SetMouseMoveReferencePoint(player_screen);
		input_manager_->SyncActionStates();
	}

	switch (controller_type_)
	{
	case PlayerMovementType::Town:
		_OnImmediate(_delta_time);
		break;
	case PlayerMovementType::Direction:
		_OnDirection(_delta_time);
		break;
	case PlayerMovementType::Axis:
		_OnAxis(_delta_time);
		break;
	}
}

void PlayerMovement::_OnImmediate(_double _delta_time)
{
	const auto dt = s_cast(_float, _delta_time);

	_Vector3 input_dir = _Vector3::Zero();

	// raw 키 대신 액션 축값으로 이동 입력을 계산한다.
	input_dir.x = input_manager_->ActionValue(InputAction::MoveX);
	input_dir.y = input_manager_->ActionValue(InputAction::MoveY);

	if (input_manager_->GetCurrentPreset() != ControllerPreset::MouseOnly && input_dir.LengthSq() > 0.f)
		input_dir = input_dir.Normalized();

	move_direction_ = input_dir;
	move_velocity_ = input_dir * GetEffectiveMoveSpdMax();

	// 진행 방향을 바라보도록 회전
	if (input_dir.LengthSq() > 0.f)
		transform_->LookAt(transform_->Position() + input_dir);
}

void PlayerMovement::_OnDirection(_double _delta_time)
{
	// 기존 Direction 방식은 필요 시 별도 유지
}

void PlayerMovement::_OnAxis(_double _delta_time)
{
	// 대시 중에는 입력 이동 로직 스킵
	if (IsDashing())
		return;

	const _float dt = s_cast(_float, _delta_time);

	_Vector3 input_dir = _Vector3::Zero();

	// preset/리맵 결과가 반영된 액션 축값을 사용한다.
	input_dir.x = input_manager_->ActionValue(InputAction::MoveX);
	input_dir.y = input_manager_->ActionValue(InputAction::MoveY);

	if (input_manager_->GetCurrentPreset() != ControllerPreset::MouseOnly && input_dir.LengthSq() > 0.f)
		input_dir = input_dir.Normalized();

	move_direction_ = input_dir;

	// 대시는 액션 에지 입력으로 시작한다.
	if (input_manager_->ActionPressed(InputAction::Dash))
		StartDashByInputDir(1200.f, 0.075);

	// 입력이 있으면 목표 속도까지 가속
	if (input_dir.LengthSq() > 0.f)
	{
		const _Vector3 desired_velocity = input_dir * GetEffectiveMoveSpdMax();
		_Vector3 delta_velocity = desired_velocity - move_velocity_;

		_float accel = acceleration_;

		// 반대 방향 전환 시 가속 보정
		if (move_velocity_.LengthSq() > 0.f)
		{
			const _Vector3 curr_dir = move_velocity_.Normalized();
			const _float dot = curr_dir.Dot(curr_dir, input_dir);

			if (dot < 0.f)
				accel *= 1.5f;
		}

		const _float max_accel_step = accel * dt;
		const _float delta_length = delta_velocity.Length();

		if (delta_length > max_accel_step && delta_length > 0.f)
			delta_velocity = delta_velocity.Normalized() * max_accel_step;

		move_velocity_ += delta_velocity;
		_ClampMoveVelocity();
	}
	else
	{
		// 입력이 없으면 마찰로 감쇠
		_ApplyFrictionToMoveVelocity(_delta_time);
	}

	// 마우스 바라보기
	transform_->LookAt(input_manager_->MousePoint());
}

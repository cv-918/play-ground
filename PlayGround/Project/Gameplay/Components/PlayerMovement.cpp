#include "framework.h"
#include "PlayerMovement.h"


#include "Core/Math/MathFunctions.h"
#include "Gameplay/Actors/GameObject.h"
#include "Gameplay/Components/Transform.h"

PlayerMovement::PlayerMovement()
	: input_manager_(nullptr)
	, transform_(nullptr)
{
	move_pattern_ = MovePattern::PlayerControl;
	move_func_ = [this](_double _delta_time) { _ProcessOnPlayerControl(_delta_time); };

	input_manager_ = &_InputMgr.Get();
	controller_type_ = input_manager_->ControllerType();
}

_bool PlayerMovement::Initialize()
{
	transform_ = s_cast(Transform*, gameobject_->GetComponent(ComponentType::Transform));

	move_spd_ = 400.f;
	move_spd_max_ = 1200.f;

	acceleration_ = 1500.f;
	friction_ = 2.f;

	MAKE_INITIALIZED;
	return true;
}

void PlayerMovement::_ProcessOnPlayerControl(_double _delta_time)
{
	switch (controller_type_)
	{
	case KeyBoardControlType::Direction:
	{
		//auto mov_spd = MoveSpd();
		//auto mov_dir = _Vector3::Zero();
		//if (input_manager_->Pressed('W'))
		//{
		//	// 예비 포지션을 구해서 배경 영역을 벗어나는지 검사
		//	auto next_pos = transform_->Forward2D() * mov_spd * delta_time;
		//	const auto next_pos_copy = next_pos;

		//	next_pos.x = MathFunctions::Clamp(s_int(next_pos.x), background_rect_.Left(), background_rect_.Right());
		//	next_pos.y = MathFunctions::Clamp(s_int(next_pos.y), background_rect_.Top(), background_rect_.Bottom());

		//	// 클램프 됐을 경우, 벽에 부딪힌 것으로 간주, 속도 0으로
		//	if (next_pos_copy != next_pos) move_velocity_ = _Vector3::Zero();
		//	transform_->Translate(next_pos);
		//}
		//else if (input_manager_->Pressed('S'))
		//{
		//	transform_->Translate(transform_->Back2D() * mov_spd * delta_time);
		//}

		//bool rotate = false;
		//auto rot_spd = RotateSpd();
		//if (input_manager_->Pressed('A'))
		//{
		//	rotate = true;
		//}
		//else if (input_manager_->Pressed('D'))
		//{
		//	rotate = true;
		//	rot_spd *= -1.f;
		//}

		//if (rotate)
		//{
		//	transform_->Rotate2D(rot_spd * delta_time);
		//}

		//return rotate || mov_dir == _Vector3::Zero();
		break;
	}
	case KeyBoardControlType::Axis:
		break;
	default:
		break;
	}
	_Vector3 move;
	if (input_manager_->Pressed('W'))
		move.y -= 1.f;
	else if (input_manager_->Pressed('S'))
		move.y += 1.f;
	if (input_manager_->Pressed('A'))
		move.x -= 1.f;
	else if (input_manager_->Pressed('D'))
		move.x += 1.f;

	// 정규화 수행
	if (move.LengthSq() > 0.f)
		move.Normalize();

	// 가속도 연산
	const auto increase = move * acceleration_ * _delta_time;
	move_velocity_ += increase;

	const auto decrease = move_velocity_ * friction_ * _delta_time;
	move_velocity_ -= decrease;

	// 최대 속도 범위 안으로 클램핑
	if (move_velocity_.Length() > move_spd_max_)
	{
		move_velocity_.Normalize();
		move_velocity_ *= move_spd_max_;
	}

	// 속도가 매우 작으면 0으로 고정 (떨림 현상 방지)
	if (move_velocity_.Length() < 1.f)
		move_velocity_ = _Vector3::Zero();

	if (use_nav_mesh_)
	{
		// 예비 포지션을 구해서 배경 영역을 벗어나는지 검사
		auto next_pos = transform_->Position() + move_velocity_ * _delta_time;
		const auto next_pos_copy = next_pos;

		next_pos.x = MathFunctions::Clamp(next_pos.x, nav_mesh_.Left_f(), nav_mesh_.Right_f());
		next_pos.y = MathFunctions::Clamp(next_pos.y, nav_mesh_.Top_f(), nav_mesh_.Bottom_f());

		// 클램프 됐을 경우
		if (next_pos_copy != next_pos)
		{
			// 벽에 부딪힌 것으로 간주, 속도 0으로
			// 포지션은 벽으로 고정
			move_velocity_ = _Vector3::Zero();
			transform_->Position(next_pos);
		}
		// 아닐 경우 통상 이동로직
		else
		{
			transform_->Translate(move_velocity_ * _delta_time);
		}
	}
	else
	{
		transform_->Translate(move_velocity_ * _delta_time);
	}

	// 마우스 바라보기
	transform_->LookAt(input_manager_->MousePoint());
}

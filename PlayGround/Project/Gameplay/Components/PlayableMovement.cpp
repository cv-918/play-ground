#include "framework.h"
#include "PlayableMovement.h"

PlayableMovement::PlayableMovement(const PlayableCharacterJsonInfo* _info)
	: input_manager_(nullptr)
{
	move_pattern_ = MovementPattern::Playable;
	move_func_ = [this](_double _delta_time) { _ProcessOnPlayerControl(_delta_time); };

	input_manager_ = &_InputMgr.Get();
	controller_type_ = input_manager_->ControllerType();

	// 이동속도도 어트리뷰트 적용해야하는데 아직 이동 수식이 완전치 않아서 적용 보류
	// 현재 공식대로 연산했을 때 최대 속도에 도달하지 못하는 문제가 있음. 공식 수정 후 적용 예정
	move_spd_max_ = _info->move_speed_max_;
	acceleration_ = _info->acceleration_;
	friction_ = _info->friction_;
}

_bool PlayableMovement::Initialize()
{
	if (!__super::Initialize())
		return false;

	MAKE_INITIALIZED;
	return true;
}

void PlayableMovement::_ProcessOnPlayerControl(_double _delta_time)
{
	switch (controller_type_)
	{
	case KeyBoardControlType::Direction:
		_OnDirection(_delta_time);
		break;
	case KeyBoardControlType::Axis:
		_OnAxis(_delta_time);
		break;
	}
}

void PlayableMovement::_OnDirection(_double _delta_time)
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
}

void PlayableMovement::_OnAxis(_double _delta_time)
{
	_Vector3 input_dir;
	input_dir.y += input_manager_->Pressed(VK_DOWN) ? 1.f : 0.f;
	input_dir.y -= input_manager_->Pressed(VK_UP) ? 1.f : 0.f;
	input_dir.x += input_manager_->Pressed(VK_RIGHT) ? 1.f : 0.f;
	input_dir.x -= input_manager_->Pressed(VK_LEFT) ? 1.f : 0.f;

	input_dir.y += input_manager_->Pressed('S') ? 1.f : 0.f;
	input_dir.y -= input_manager_->Pressed('W') ? 1.f : 0.f;
	input_dir.x += input_manager_->Pressed('D') ? 1.f : 0.f;
	input_dir.x -= input_manager_->Pressed('A') ? 1.f : 0.f;

	const _bool has_input = (input_dir.LengthSq() > 0.f);
	if (has_input)
		input_dir.Normalize();

	if (has_input)
	{
		// 입력 중: 가속만 적용
		move_velocity_ += input_dir * acceleration_ * _delta_time;

		// 최대 속도 클램프
		const float velocity_len_sq = move_velocity_.LengthSq();
		const float max_spd_sq = move_spd_max_ * move_spd_max_;
		if (velocity_len_sq > max_spd_sq)
		{
			move_velocity_.Normalize();
			move_velocity_ *= move_spd_max_;
		}
	}
	else
	{
		// 무입력: 감속만 적용
		move_velocity_ -= move_velocity_ * friction_ * _delta_time;

		if (move_velocity_.LengthSq() < 1.f * 1.f)
			move_velocity_ = _Vector3::Zero();
	}

	const auto delta_move = move_velocity_ * _delta_time;
	if (use_nav_mesh_)
	{
		auto next_pos = transform_->Position() + delta_move;
		const auto unclamped_next_pos = next_pos;

		next_pos.x = MathFunctions::Clamp(next_pos.x, nav_mesh_.Left_f(), nav_mesh_.Right_f());
		next_pos.y = MathFunctions::Clamp(next_pos.y, nav_mesh_.Top_f(), nav_mesh_.Bottom_f());

		if (unclamped_next_pos != next_pos)
		{
			move_velocity_ = _Vector3::Zero();
			transform_->Position(next_pos);
		}
		else
		{
			transform_->Translate(delta_move);
		}
	}
	else
	{
		transform_->Translate(delta_move);
	}

	transform_->LookAt(input_manager_->MousePoint());
}

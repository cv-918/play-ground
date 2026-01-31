#include "framework.h"
#include "Player.h"

#include "Components/Transform.h"
#include "Systems/Input/InputManager.h"
#include "Systems/Render/RenderChain.h"

#include "Core/Math/MathFunctions.h"

_bool Player::Initialize()
{
	if (!__super::Initialize())
		return false;

	MoveSpd(400.f);
	MoveSpdMax(1200.f);
	RotateSpd(600.f);
	Name(_T("Player"));
	transform_->Rotation(0, 1);

	input_manager_ = &_InputMgr.Get();

	return true;
}

_int Player::Update(_double _delta_time)
{
	_int ret = 0;

	ret = _ControllRoutine(_delta_time);
	if (0 != ret)
	{
		return ret;
	}

	return 0;
}

_int Player::Render(_double _delta_time)
{
	// 포지션을 중점으로 도형을 그린다
	// 어떤 외형을 갖게할 것인가 -> Shape컴포넌트
	// 회전은 그냥 Rectengle 로는 어차피 표현 못하고 정점 잡아서 라인투로 그려야함
	// 회전 테스트 자체는 LineTo 로 주시 방향만 그려서 완료, 하지만 회전하는 사각형을 그리려면 여전히 RectShape 컴포넌트가 필요함

	const auto pos = transform_->Position();
	const _int rt_size = 50;
	const auto half_size = rt_size >> 1;

	RECT rt = {
		pos.x - half_size,
		pos.y - half_size,
		pos.x + half_size,
		pos.y + half_size
	};

	// s, 플레이어 외형 그리기
	Ellipse(back_dc_, rt.left, rt.top, rt.right, rt.bottom);
	// e, 플레이어 외형 그리기

	// s, 플레이어 이름 그리기
	const auto name = Name();
	DrawText(back_dc_, name.c_str(), name.length(), &rt, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
	// e, 플레이어 이름 그리기

	// s, 방향 그려서 회전이 적용되는지 확인
	auto forward = transform_->Forward2D();
	const float line_length = 50.f;
	forward *= line_length;
	forward += pos;

	MoveToEx(back_dc_, s_int(pos.x), s_int(pos.y), nullptr);
	LineTo(back_dc_, s_int(forward.x), s_int(forward.y));
	// s, 방향 그려서 회전이 적용되는지 확인

	// s, 디버그 정보 찍기
	_ShowDebugInfo();

	return 0;
}

_int Player::_ControllRoutine(_double _delta_time)
{
	if (!transform_)
	{
		return -1;
	}

	const auto delta_time = s_float(_delta_time);

	// 여기 컨트롤러 타입에 따른 다른 이동 처리 코드를
	// 일단 switch 로 구분해놓고 나중에 전략 또는 상태(객체) 패턴으로 변경
	switch (controller_type_)
	{
	case KeyBoardControlType::Direction:
	{
		auto mov_spd = MoveSpd();
		auto mov_dir = _Vector3::Zero();
		if (input_manager_->Pressed('W'))
		{
			// 예비 포지션을 구해서 배경 영역을 벗어나는지 검사
			auto next_pos = transform_->Forward2D() * mov_spd * delta_time;
			const auto next_pos_copy = next_pos;

			next_pos.x = MathFunctions::Clamp(s_int(next_pos.x), background_rect_.Left(), background_rect_.Right());
			next_pos.y = MathFunctions::Clamp(s_int(next_pos.y), background_rect_.Top(), background_rect_.Bottom());

			// 클램프 됐을 경우, 벽에 부딪힌 것으로 간주, 속도 0으로
			if (next_pos_copy != next_pos) move_velocity_ = _Vector3::Zero();
			transform_->Translate(next_pos);
		}
		else if (input_manager_->Pressed('S'))
		{
			transform_->Translate(transform_->Back2D() * mov_spd * delta_time);
		}

		bool rotate = false;
		auto rot_spd = RotateSpd();
		if (input_manager_->Pressed('A'))
		{
			rotate = true;
		}
		else if (input_manager_->Pressed('D'))
		{
			rotate = true;
			rot_spd *= -1.f;
		}

		if (rotate)
		{
			transform_->Rotate2D(rot_spd * delta_time);
		}

		return rotate || mov_dir == _Vector3::Zero();
	}

	case KeyBoardControlType::Axis:
	{
		_Vector3 move;
		if (input_manager_->Pressed('W'))
			move.y -= 1.f;
		else if (input_manager_->Pressed('S'))
			move.y += 1.f;
		if (input_manager_->Pressed('A'))
			move.x -= 1.f;
		else if (input_manager_->Pressed('D'))
			move.x += 1.f;

		bool use_move_acceleration = true;
		if (use_move_acceleration)
		{
			if (move.LengthSq() > 0.f)
			{
				move.Normalize();
			}

			// s, 가속도 적용 구간
			// 가속도 적용
			move_velocity_ += move * acceleration_ * delta_time;

			if (move_velocity_ == _Vector3::Zero())
			{
				transform_->LookAt(input_manager_->MousePoint());
				return 0;
			}

			// 마찰력 적용
			/*
				마찰력 적용을 '방향키 입력이 없을 때' 로 한정하면
				마찰력 계수에 상관없이 이동 자체는 항상 최고속도가 나올 수 있을 것 같다

				'방향키 입력이 없을 때'를 판별하기 위해서 InputManager에 AnyKeyPressed()를 만들었는데
				조금 더 생각해보니 저걸로 판별할 경우 'WASD가 아닌 아무 키'를 눌렀을 때 여전히 마찰력이 적용된다
				move의 Length()를 검사해서 WASD 입력으로 move의 값이 변한 상태인지 아닌지를 기준점으로 사용하는게 더 타당한 것 같다

				if (move == _Vector3::Zero()) 조건으로 하면 '입력'이 없을 때에만 작동하는데 이게 뭔가 일관되지 않았다?
			*/
			if (move == _Vector3::Zero())
			{
				move_velocity_ -= move_velocity_ * friction_ * delta_time;
			}

			// 최대 속도 제한
			if (move_velocity_.Length() > MoveSpdMax())
			{
				move_velocity_.Normalize();
				move_velocity_ *= MoveSpdMax();
			}

			// 속도가 매우 작으면 0으로 고정 (떨림 현상 방지)
			if (move_velocity_.Length() < 1.f)
			{
				move_velocity_ = _Vector3::Zero();
			}
			// e, 가속도 적용 구간

			bool apply_clamp = true;
			if (apply_clamp)
			{
				// 예비 포지션을 구해서 배경 영역을 벗어나는지 검사
				auto next_pos = transform_->Position() + move_velocity_ * delta_time;
				const auto next_pos_copy = next_pos;

				next_pos.x = MathFunctions::Clamp(next_pos.x, background_rect_.Left_f(), background_rect_.Right_f());
				next_pos.y = MathFunctions::Clamp(next_pos.y, background_rect_.Top_f(), background_rect_.Bottom_f());

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
					transform_->Translate(move_velocity_* delta_time);
				}
			}
			else
			{
				transform_->Translate(move_velocity_* delta_time);
			}
		}
		else
		{
			if (move.LengthSq() > 0.f)
			{
				move.Normalize();
				transform_->Translate(move * MoveSpd() * delta_time);
			}
		}

		// 마우스 바라보기
		transform_->LookAt(input_manager_->MousePoint());

		return move.Length() != 0;
	}
	}

	return 0;
}

void Player::_ControlInfoOnDebug()
{
	if (input_manager_->Down(VK_OEM_4))
	{

	}
	else if (input_manager_->Down(VK_OEM_6))
	{

	}
}

void Player::_ShowDebugInfo()
{
	if (_InputMgr.Down(VK_TAB))
	{
		_int val = s_int(debug_type_) + 1;

		if (val >= DrawDebugInfoType::TypeCount)
			val = DrawDebugInfoType::None;

		debug_type_ = s_cast(DrawDebugInfoType, val);
	}

	std::vector<std::wstring> labels =
	{
		L"None",
		L"MouseInfo",
		L"ControlInfo",
		L"TypeCount"
	};

	_tchar buffer[MAX_PATH] = {};

	const _int draw_pos_x = GAME_VIEW_WIDTH + INGAVE_FRAME_THICK;
	_int draw_pos_y = INGAVE_FRAME_THICK_H;
	const _int line_height = IV_ZERO;
	const _int line_gap = 20;

	// 1) 배경 먼저 그리기
	RECT rt = { GAME_VIEW_WIDTH + INGAVE_FRAME_THICK_H, INGAVE_FRAME_THICK_H, WINCX - INGAVE_FRAME_THICK_H, WINCY - INGAVE_FRAME_THICK_H };
	Rectangle(back_dc_, rt.left, rt.top, rt.right, rt.bottom);

	// 2) 텍스트 그리기
	swprintf_s(buffer, L"[ 디버깅 정보 타입 : %ls ]", labels[debug_type_].c_str());
	TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));

	// 3) 상세 정보 그리기
	switch (debug_type_)
	{
	case MouseInfo:
		swprintf_s(buffer, L"MousePoint : %d, %d", input_manager_->MousePoint().x, input_manager_->MousePoint().y);
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));

		swprintf_s(buffer, L"MouseDelta : %d, %d", input_manager_->MouseDelta().x, input_manager_->MouseDelta().y);
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));

		swprintf_s(buffer, L"WheelDelta : %d", input_manager_->WheelDelta());
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));
		break;
	case ControlInfo:
		swprintf_s(buffer, L"Position : %f, %f, %f", transform_->Position().x, transform_->Position().y, transform_->Position().z);
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));

		swprintf_s(buffer, L"가속도 : %f", acceleration_);
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));

		swprintf_s(buffer, L"마찰 계수 : %f", friction_);
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));

		swprintf_s(buffer, L"Move Velocity : %f", move_velocity_.Magnitude());
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, buffer, wcslen(buffer));
		break;
	}
}

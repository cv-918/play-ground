#include "framework.h"
#include "Player.h"

#include "Systems/Input/InputManager.h"
#include "Systems/Render/RenderChain.h"
#include "Systems/Physics/CollisionManager.h"

#include "Core/Math/MathFunctions.h"

#include "Components/Transform.h"
#include "Components/Status.h"
#include "Components/Movement.h"
#include "Components/SphereCollider.h"
#include "Components/Combat.h"

_bool Player::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 플레이어 identifier 설정
	Name(_T("Player"));

	// 플레이어 초기값 설정
	transform_->Rotation(0, 1);
	transform_->Scale(30.f);

	// input manager 캐싱
	input_manager_ = &_InputMgr.Get();

	// 플레이어 컴포넌트 설정
	status_ = new Status();

	movement_ = new Movement();
	movement_->MoveSpd(400.f);
	movement_->MoveSpdMax(1200.f);
	movement_->RotateSpd(600.f);
	RegisterComponent(movement_);

	combat_ = new Combat();
	combat_->HP(5);
	RegisterComponent(combat_);

	player_col_size_[SphereCol_Body] = 30.f;
	player_col_size_[SphereCol_Attack] = 50.f;
	RegisterComponent(new SphereCollider(player_col_size_[SphereCol_Body]));
	RegisterComponent(new SphereCollider(player_col_size_[SphereCol_Attack]));

	_ColMgr.RegisterCollider(CollisionLayer::PlayerBody, s_cast(SphereCollider*, GetComponent(ComponentType::Collider, SphereCol_Body)));
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, s_cast(SphereCollider*, GetComponent(ComponentType::Collider, SphereCol_Attack)));

	return true;
}

_int Player::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;

	ret = _ControllRoutine(_delta_time);
	if (0 != ret) return ret;

	return 0;
}

void Player::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	const auto pos = transform_->Position();
	const _int rt_size = transform_->Scale().x;

	RECT rt = {
		pos.x - rt_size,
		pos.y - rt_size,
		pos.x + rt_size,
		pos.y + rt_size
	};

	// s, 플레이어 외형 그리기
	Ellipse(back_dc_, rt.left, rt.top, rt.right, rt.bottom);
	// e, 플레이어 외형 그리기
}

void Player::DebugRender(_double _delta_time)
{
	__super::DebugRender(_delta_time);

	const auto position = transform_->Position();

	// s, 방향 그려서 회전이 적용되는지 확인
	auto forward = transform_->Forward2D();
	const float line_length = 50.f;
	forward *= line_length;
	forward += position;

	MoveToEx(back_dc_, s_int(position.x), s_int(position.y), nullptr);
	LineTo(back_dc_, s_int(forward.x), s_int(forward.y));
	// s, 방향 그려서 회전이 적용되는지 확인

	// s, 디버그 정보 찍기
	_ShowDebugInfo();
}

void Player::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_this->Layer())
	{
	case CollisionLayer::PlayerBody:
		// 몸통 collider 충돌 처리
		break;
	case CollisionLayer::PlayerAttack:
	{
		// 공격 collider 충돌 처리
		switch (_other->Layer())
		{
		case CollisionLayer::ExpDust:
		{
			// 더스트의 IDamagable 핸들러 시스템에 메시지 보내서 데미지 입히기
			_other->GameObject()->SendHandlerMessage(HandlerSystemList::Damage, [](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(1.f);
				});

			// 공격 쿨타임 동안은 같은 더스트에 대해서는 충돌이 일어나지 않도록 타이머 설정
			// 공격속도 고정값 일단은 여기에 지역변수로 하드코딩
			const _double attack_cooltime = 1.f;
			_this->SetTimerForTarget(_other, attack_cooltime);

			break;
		}
		}

		break;
	}
	}
}

void Player::OnCollisionStay(Collider* _this, Collider* _other)
{
}

void Player::OnCollisionExit(Collider* _this, Collider* _other)
{
}

void Player::GetDamage(_float _damage)
{
	// 플레이어가 데미지를 입었을 때의 처리
	// 이 코드를 Combat에 둘 것인가 Player에 둘 것인가?
	combat_->GetDamage(_damage);
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
		const auto move_spd_max = movement_->MoveSpdMax();
		if (move_velocity_.Length() > move_spd_max)
		{
			move_velocity_.Normalize();
			move_velocity_ *= move_spd_max;
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
				transform_->Translate(move_velocity_ * delta_time);
			}
		}
		else
		{
			transform_->Translate(move_velocity_ * delta_time);
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
	enum DebugControlDataType
	{
		Acceleration,
		Friction,
		MaxSpeed,
		TypeCount,
	};

	std::vector<std::wstring> labels =
	{
		L"[ 컨트롤 정보 : 가속도(1) ]",
		L"[ 컨트롤 정보 : 마찰계수(2) ]",
		L"[ 컨트롤 정보 : 최대속도(3) ]",
	};

	switch (debug_type_)
	{
	case Player::ControlInfo:
		if (input_manager_->Down(VK_UP))
		{
			++debug_control_data_idx_;

			if (debug_control_data_idx_ >= DebugControlDataType::TypeCount)
			{
				debug_control_data_idx_ = DebugControlDataType::Acceleration;
			}
		}
		else if (input_manager_->Down(VK_DOWN))
		{
			--debug_control_data_idx_;

			if (debug_control_data_idx_ < DebugControlDataType::Acceleration)
			{
				debug_control_data_idx_ = DebugControlDataType::TypeCount - 1;
			}
		}

		switch (debug_control_data_idx_)
		{
		case DebugControlDataType::Acceleration:
			if (input_manager_->Down(VK_LEFT))
			{
				if (100.f < acceleration_)
					acceleration_ -= 100.f;
			}
			else if (input_manager_->Down(VK_RIGHT))
			{
				acceleration_ += 100.f;
			}
			break;
		case DebugControlDataType::Friction:
			if (input_manager_->Down(VK_LEFT))
			{
				if (1 < friction_)
					--friction_;
			}
			else if (input_manager_->Down(VK_RIGHT))
			{
				++friction_;
			}
			break;
		case DebugControlDataType::MaxSpeed:
			if (input_manager_->Down(VK_LEFT))
			{
				auto move_spd_max = movement_->MoveSpdMax();
				if (100.f < move_spd_max)
				{
					move_spd_max -= 100.f;
					movement_->MoveSpdMax(move_spd_max);
				}
			}
			else if (input_manager_->Down(VK_RIGHT))
			{
				auto move_spd_max = movement_->MoveSpdMax();
				movement_->MoveSpdMax(move_spd_max + 100.f);
			}
			break;
		}
		break;
	default:
		debug_info_lines_.insert(debug_info_lines_.begin() + 1, L"[ 컨트롤 정보 : None ]");
		return;
	}

	debug_info_lines_.insert(debug_info_lines_.begin() + 1, labels[debug_control_data_idx_]);
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

	debug_info_lines_.clear();

	std::vector<std::wstring> labels =
	{
		L"None",
		L"MouseInfo",
		L"ControlInfo",
		L"TypeCount"
	};

	_tchar buffer[MAX_PATH] = {};

	const _int line_gap = 20;
	const _int draw_pos_x = GAME_VIEW_WIDTH + INGAVE_FRAME_THICK;
	_int draw_pos_y = INGAVE_FRAME_THICK_H - line_gap + 5;

	// 1) 배경 먼저 그리기
	RECT rt = { GAME_VIEW_WIDTH + INGAVE_FRAME_THICK_H, INGAVE_FRAME_THICK_H, WINCX - INGAVE_FRAME_THICK_H, WINCY - INGAVE_FRAME_THICK_H };
	Rectangle(back_dc_, rt.left, rt.top, rt.right, rt.bottom);

	// 2) 텍스트 그리기
	swprintf_s(buffer, L"[ 디버깅 정보 타입 : %ls ]", labels[debug_type_].c_str());
	debug_info_lines_.push_back(buffer);

	_ControlInfoOnDebug();

	// 3) 상세 정보 그리기
	switch (debug_type_)
	{
	case MouseInfo:
		swprintf_s(buffer, L"MousePoint : %d, %d", input_manager_->MousePoint().x, input_manager_->MousePoint().y);
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"MouseDelta : %d, %d", input_manager_->MouseDelta().x, input_manager_->MouseDelta().y);
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"WheelDelta : %d", input_manager_->WheelDelta());
		debug_info_lines_.push_back(buffer);
		break;
	case ControlInfo:
		swprintf_s(buffer, L"위치 정보 ( x : %.2f | y : %.2f )", transform_->Position().x, transform_->Position().y);
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"이동량 : %.2f", move_velocity_.Magnitude());
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"가속도 : %.f", acceleration_);
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"마찰 계수 : %.f", friction_);
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"최대 속도 : %.f", movement_->MoveSpdMax());
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"HP : %d", combat_->HP());
		debug_info_lines_.push_back(buffer);
		break;
	}

	for (const auto& line : debug_info_lines_)
	{
		TextOut(back_dc_, draw_pos_x, draw_pos_y += line_gap, line.c_str(), line.length());
	}
}

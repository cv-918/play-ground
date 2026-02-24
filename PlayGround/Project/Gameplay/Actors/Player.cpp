#include "framework.h"
#include "Player.h"

#include "EngineSystems/Input/InputManager.h"
#include "EngineSystems/Render/RenderChain.h"
#include "EngineSystems/Physics/CollisionManager.h"

#include "Core/Math/MathFunctions.h"

#include "Components/Transform.h"
#include "Components/Status.h"
#include "Components/PlayableMovement.h"
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
	RegisterComponent(status_);

	movement_ = new PlayableMovement();
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

	Finalize();

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
	if (!IsVisible())
		return;

	__super::Render(_delta_time);

	// s, 플레이어 외형 그리기
	const auto pos = transform_->Position();
	const _int rt_size = transform_->Scale().x;

	RECT rt = {
		pos.x - rt_size,
		pos.y - rt_size,
		pos.x + rt_size,
		pos.y + rt_size
	};

	Ellipse(g_back_dc, rt.left, rt.top, rt.right, rt.bottom);
	// e, 플레이어 외형 그리기
}

void Player::DebugRender(_double _delta_time)
{
	__super::DebugRender(_delta_time);

	// s, 방향 그려서 회전이 적용되는지 확인
	const auto position = transform_->Position();

	auto forward = transform_->Forward2D();
	const float line_length = 75.f;
	forward *= line_length;
	forward += position;

	MoveToEx(g_back_dc, s_int(position.x), s_int(position.y), nullptr);
	LineTo(g_back_dc, s_int(forward.x), s_int(forward.y));
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

void Player::GetDamage(_float _damage)
{
	// 플레이어가 데미지를 입었을 때의 처리
	// 이 코드를 Combat에 둘 것인가 Player에 둘 것인가?
	combat_->GetDamage(_damage);
}

_int Player::_ControllRoutine(_double _delta_time)
{
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
				auto acceleration = movement_->Acceleration();
				if (100.f < acceleration)
					movement_->Acceleration() -= 100.f;
			}
			else if (input_manager_->Down(VK_RIGHT))
			{
				movement_->Acceleration() += 100.f;
			}
			break;
		case DebugControlDataType::Friction:
			if (input_manager_->Down(VK_LEFT))
			{
				auto friction = movement_->Friction();
				if (1 < friction)
					--movement_->Friction();
			}
			else if (input_manager_->Down(VK_RIGHT))
			{
				++movement_->Friction();
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
	const _int draw_pos_x = GAME_VIEW_WIDTH + INGAVE_FRAME_THICKNESS;
	_int draw_pos_y = INGAVE_FRAME_THICKNESS_HALF - line_gap + 5;

	// 1) 배경 먼저 그리기
	RECT rt = { GAME_VIEW_WIDTH + INGAVE_FRAME_THICKNESS_HALF, INGAVE_FRAME_THICKNESS_HALF, WINCX - INGAVE_FRAME_THICKNESS_HALF, WINCY - INGAVE_FRAME_THICKNESS_HALF };
	//Rectangle(g_back_dc, rt.left, rt.top, rt.right, rt.bottom);

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

		swprintf_s(buffer, L"이동량 : %.2f", movement_->MoveVelocity().Magnitude());
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"가속도 : %.f", movement_->Acceleration());
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"마찰 계수 : %.f", movement_->Friction());
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"최대 속도 : %.f", movement_->MoveSpdMax());
		debug_info_lines_.push_back(buffer);

		swprintf_s(buffer, L"HP : %d", combat_->HP());
		debug_info_lines_.push_back(buffer);
		break;
	}

	for (const auto& line : debug_info_lines_)
	{
		TextOut(g_back_dc, draw_pos_x, draw_pos_y += line_gap, line.c_str(), line.length());
	}
}

void Player::SetNavMesh(const _Rect& _rt)
{
	if (movement_)
		movement_->SetNavMesh(_rt);
}

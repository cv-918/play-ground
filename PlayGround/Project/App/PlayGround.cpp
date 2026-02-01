#include "framework.h"
#include "PlayGround.h"

#include "Systems/Input/InputManager.h"
#include "Systems/Render/RenderChain.h"
#include "Systems/Physics/CollisionManager.h"
#include "Core/Math/Random.h"

#include "Actors/Player.h"
#include "Actors/ExpDust.h"
#include "Components/Transform.h"
#include "GamePlay/World/Background.h"

PlayGround::~PlayGround()
{
	for (auto& game_object : game_objects_)
	{
		SAFE_DELETE(game_object);
	}
}

_bool PlayGround::Initialize()
{
	_RenderChain.Initialize();
	_Random.Initialize();
	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerBody, CollisionLayer::ExpDust, true);
	_ColMgr.SetCollisionLayer(CollisionLayer::PlayerAttack, CollisionLayer::ExpDust, true);
	
	game_objects_.push_back(new Background());

	// 여기서 다른 유닛들 추가

	game_objects_.push_back(new Player());
	for (auto& game_object : game_objects_)
	{
		game_object->Initialize();
	}

	s_cast(Player*, game_objects_.back())->SetBackgroundRect(s_cast(Background*, game_objects_.front())->BackgroundRect());

	return true;
}

_int PlayGround::Update(_double _delta_time)
{
	if (_InputMgr.Down(VK_SPACE))
	{
		auto mouse_point = _InputMgr.MousePoint();

		// 여기서 ExpDust 생성
		GameObject* new_dust = new ExpDust();
		new_dust->Initialize();

		const auto transform = new_dust->GetTransform();
		transform->Position(mouse_point.x, mouse_point.y);

		const auto radius = _Random.Range(15.f, 50.f);
		transform->Scale(radius, radius);
		s_cast(ExpDust*, new_dust)->AdjustColliderRadius();

		game_objects_.push_back(new_dust);
	}

	for (auto& game_object : game_objects_)
	{
		game_object->Update(_delta_time);
		game_object->LateUpdate(_delta_time);
	}

	_ColMgr.Update();

	// Update 루프의 마지막에 처리할 애들을 모아두는 클래스를 만들고
	// 등록된 애들은 일괄 처리

	return 0;
}

void PlayGround::Render(_double _delta_time)
{
	// 1) Clear (단색)
	_RenderChain.Clear();

	// 2) Render
	for (auto& game_object : game_objects_)
	{
		game_object->Render(_delta_time);
		game_object->DebugRender(_delta_time);
	}

	// 3) Present
	_RenderChain.Present();
}

LRESULT PlayGround::WndProc(HWND _hwnd, UINT _msg, WPARAM _wparam, LPARAM _lparam)
{
	switch (_msg)
	{
	case WM_MOUSEMOVE:
		_InputMgr.OnMouseMove(_wparam, _lparam);
		break;

	case WM_MOUSEWHEEL:
		_InputMgr.OnMouseWheel(_wparam, _lparam);
		break;

	case WM_LBUTTONDOWN: _InputMgr.OnMouseButtonDown(VK_LBUTTON, _lparam); break;
	case WM_LBUTTONUP:   _InputMgr.OnMouseButtonUp(VK_LBUTTON, _lparam); break;

	case WM_RBUTTONDOWN: _InputMgr.OnMouseButtonDown(VK_RBUTTON, _lparam); break;
	case WM_RBUTTONUP:   _InputMgr.OnMouseButtonUp(VK_RBUTTON, _lparam); break;

	case WM_MBUTTONDOWN: _InputMgr.OnMouseButtonDown(VK_MBUTTON, _lparam); break;
	case WM_MBUTTONUP:   _InputMgr.OnMouseButtonUp(VK_MBUTTON, _lparam); break;

		// X 버튼(4/5번 버튼)
	case WM_XBUTTONDOWN:
	{
		const _int xbtn = GET_XBUTTON_WPARAM(_wparam);
		const WPARAM vk = (xbtn == XBUTTON1) ? VK_XBUTTON1 : VK_XBUTTON2;
		_InputMgr.OnMouseButtonDown(vk, _lparam);
		break;
	}
	case WM_XBUTTONUP:
	{
		const _int xbtn = GET_XBUTTON_WPARAM(_wparam);
		const WPARAM vk = (xbtn == XBUTTON1) ? VK_XBUTTON1 : VK_XBUTTON2;
		_InputMgr.OnMouseButtonUp(vk, _lparam);
		break;
	}

	case WM_KEYDOWN:
	case WM_SYSKEYDOWN:
		// 1. F4 키가 눌렸는지 확인
		if (_wparam == VK_F4)
		{
			// 2. Alt 키가 함께 눌렸는지 확인 (LPARAM의 29번째 비트가 1이면 Alt가 눌린 상태)
			if (_lparam & (1 << 29))
			{
				// 게임 종료 메시지 발송
				PostQuitMessage(0);
				return 0;
			}
		}

		_InputMgr.OnKeyDown(_wparam, _lparam);
		break;

	case WM_KEYUP:
	case WM_SYSKEYUP:
		_InputMgr.OnKeyUp(_wparam, _lparam);
		break;

	case WM_CHAR:
		_InputMgr.OnChar(static_cast<_tchar>(_wparam));
		break;

	case WM_KILLFOCUS:
		_InputMgr.ResetAll();
		break;
	}

	return 0;
}

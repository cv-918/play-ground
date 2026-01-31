#include "framework.h"
#include "PlayGround.h"

#include "Systems/Input/InputManager.h"
#include "Systems/Render/RenderChain.h"

#include "Actors/Player.h"
#include "GamePlay/World/Background.h"

PlayGround::~PlayGround()
{
	SAFE_DELETE(player_);
	SAFE_DELETE(background_);
}

_bool PlayGround::Initialize()
{
	_RenderChain.Initialize();

	background_ = new Background();
	background_->Initialize();

	player_ = new Player();
	player_->Initialize();
	s_cast(Player*, player_)->SetBackgroundRect(s_cast(Background*, background_)->BackgroundRect());

	return true;
}

_int PlayGround::Update(_double _delta_time)
{
	player_->Update(_delta_time);
	background_->Update(_delta_time);

	return 0;
}

_int PlayGround::Render(_double _delta_time)
{
	// 1) Clear (단색)
	_RenderChain.Clear();

	// 2) Render
	background_->Render(_delta_time);
	player_->Render(_delta_time);

	// 3) Present
	_RenderChain.Present();
	return 0;
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

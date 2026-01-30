#include "framework.h"
#include "PlayGround.h"

#include "Systems/Input/InputManager.h"
#include "Systems/Render/RenderChain.h"

#include "Actors/Player.h"

PlayGround::~PlayGround()
{
	if (player_)
	{
		delete player_;
		player_ = nullptr;
	}
}

_bool PlayGround::Initialize()
{
	_RenderChain.Initialize();

	player_ = new Player();
	player_->Initialize();

	return true;
}

_int PlayGround::Update(_double _delta_time)
{
	player_->Update(_delta_time);

	return 0;
}

_int PlayGround::Render(_double _delta_time)
{
	// 1) Clear (단색)
	_RenderChain.Clear();

	// s. 배경 클래스 따로 빼야함
	_int frame_width = 10;
	RECT rt = { frame_width, frame_width, WINCX - frame_width, WINCY - frame_width };

	Rectangle(_RenderChain.BackDc(), rt.left, rt.top, rt.right, rt.bottom);
	//FillRect(back_dc_, &rt, (HBRUSH)GetStockObject(WHITE_BRUSH));
	// s. 배경 클래스 따로 빼야함

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

#include "framework.h"
#include "PlayGround.h"

#include "Systems/Input/KeyManager.h"
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
	BeginFrame();

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
	case WM_KEYDOWN:
	case WM_SYSKEYDOWN:
		_KeyMgr.OnKeyDown(_wparam, _lparam);
		break;

	case WM_KEYUP:
	case WM_SYSKEYUP:
		_KeyMgr.OnKeyUp(_wparam, _lparam);
		break;

	case WM_CHAR:
		_KeyMgr.OnChar(static_cast<wchar_t>(_wparam));
		break;

	case WM_KILLFOCUS:
		_KeyMgr.ResetAll();
		break;
	}

	return 0;
}

void PlayGround::BeginFrame()
{
	_KeyMgr.BeginFrame();
}

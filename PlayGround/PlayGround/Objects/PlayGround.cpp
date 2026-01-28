#include "PlayGround.h"

#include "GlobalObjects/KeyManager.h"

#include "Units/Player.h"

PlayGround::~PlayGround()
{
	Release();
}

_bool PlayGround::Initialize()
{
	dc_ = GetDC(g_hWnd);
	CreateBackBuffer(WINCX, WINCY); // 이미지 IO 없이 백버퍼 생성

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
	PatBlt(back_dc_, 0, 0, screen_width_, screen_height_, BLACKNESS);

	_int frame_width = 10;
	RECT rt = { frame_width, frame_width, screen_width_ - frame_width, screen_height_ - frame_width };

	Rectangle(back_dc_, rt.left, rt.top, rt.right, rt.bottom);
	//FillRect(back_dc_, &rt, (HBRUSH)GetStockObject(WHITE_BRUSH));

	player_->Render(_delta_time);

	// 3) Present
	BitBlt(dc_, 0, 0, screen_width_, screen_height_, back_dc_, 0, 0, SRCCOPY);
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

_bool PlayGround::Release()
{
	_DestroyBackBuffer();

	if (dc_)
	{
		ReleaseDC(g_hWnd, dc_);
		dc_ = nullptr;
	}

	if (player_)
	{
		delete player_;
		player_ = nullptr;
	}

	return true;
}

void PlayGround::BeginFrame()
{
	_KeyMgr.BeginFrame();
}

_bool PlayGround::CreateBackBuffer(const _int _width, const _int _height)
{
	// 기존 리소스 정리
	_DestroyBackBuffer();

	screen_width_ = _width;
	screen_height_ = _height;

	back_dc_ = CreateCompatibleDC(dc_);
	back_bmp_ = CreateCompatibleBitmap(dc_, screen_width_, screen_height_);
	old_back_bmp_ = (HBITMAP)SelectObject(back_dc_, back_bmp_);

	// (선택) 초기 클리어
	PatBlt(back_dc_, 0, 0, screen_width_, screen_height_, BLACKNESS);

	return true;
}

_bool PlayGround::_DestroyBackBuffer()
{
	if (!back_dc_)
	{
		return false;
	}

	if (old_back_bmp_)
	{
		SelectObject(back_dc_, old_back_bmp_);
		old_back_bmp_ = nullptr;
	}

	if (back_bmp_)
	{
		DeleteObject(back_bmp_);
		back_bmp_ = nullptr;
	}

	DeleteDC(back_dc_);
	back_dc_ = nullptr;

	return true;
}

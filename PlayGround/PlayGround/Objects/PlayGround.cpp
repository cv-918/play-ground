#include "PlayGround.h"

PlayGround::PlayGround()
	: dc_(nullptr), back_dc_(nullptr)
	, back_bmp_(nullptr), old_back_bmp_(nullptr)
	, screen_width_(WINCX), screen_height_(WINCY)
{
}

PlayGround::~PlayGround()
{
}

bool PlayGround::Initialize()
{
	dc_ = GetDC(g_hWnd);
	CreateBackBuffer(WINCX, WINCY); // 이미지 IO 없이 백버퍼 생성

	return true;
}

int PlayGround::Update(double _delta_time)
{
	return 0;
}

int PlayGround::Render(double _delta_time)
{
	// 1) Clear (단색)
	PatBlt(back_dc_, 0, 0, screen_width_, screen_height_, BLACKNESS);

	int frame_width = 10;
	RECT rt = { frame_width, frame_width, screen_width_ - frame_width, screen_height_ - frame_width };

	Rectangle(back_dc_, rt.left, rt.top, rt.right, rt.bottom);
	//FillRect(back_dc_, &rt, (HBRUSH)GetStockObject(WHITE_BRUSH));

	RECT rc{};
	GetClientRect(g_hWnd, &rc);
	int cw = rc.right - rc.left;
	int ch = rc.bottom - rc.top;

	// 3) Present
	BitBlt(dc_, 0, 0, screen_width_, screen_height_, back_dc_, 0, 0, SRCCOPY);
	return 0;
}

bool PlayGround::Release()
{
	_DestroyBackBuffer();

	if (dc_)
	{
		ReleaseDC(g_hWnd, dc_);
		dc_ = nullptr;
	}

	return true;
}

bool PlayGround::CreateBackBuffer(const int _width, const int _height)
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

bool PlayGround::_DestroyBackBuffer()
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
}

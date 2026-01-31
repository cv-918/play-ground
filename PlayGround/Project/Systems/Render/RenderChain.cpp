#include "framework.h"
#include "RenderChain.h"

#include "Actors/GameObject.h"

RenderChain::~RenderChain()
{
	Release();
}

_bool RenderChain::Initialize()
{
	dc_ = GetDC(hwnd_);
	_CreateBackBuffer(WINCX, WINCY); // 이미지 IO 없이 백버퍼 생성

	GameObject::BackDc(back_dc_);

    return true;
}

_bool RenderChain::Release()
{
	_DestroyBackBuffer();

	if (dc_)
	{
		ReleaseDC(hwnd_, dc_);
		dc_ = nullptr;
	}

	return true;
}

void RenderChain::Clear()
{
	PatBlt(back_dc_, 0, 0, screen_size_.x, screen_size_.y, BLACKNESS);
}

void RenderChain::Present()
{
	BitBlt(dc_, 0, 0, screen_size_.x, screen_size_.y, back_dc_, 0, 0, SRCCOPY);
}

_bool RenderChain::_CreateBackBuffer(const _int _width, const _int _height)
{
	// 기존 리소스 정리
	_DestroyBackBuffer();

	screen_size_.x = _width;
	screen_size_.y = _height;

	back_dc_ = CreateCompatibleDC(dc_);
	back_bmp_ = CreateCompatibleBitmap(dc_, screen_size_.x, screen_size_.y);
	old_back_bmp_ = (HBITMAP)SelectObject(back_dc_, back_bmp_);

	// (선택) 초기 클리어
	PatBlt(back_dc_, 0, 0, screen_size_.x, screen_size_.y, BLACKNESS);

    return true;
}

_bool RenderChain::_DestroyBackBuffer()
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

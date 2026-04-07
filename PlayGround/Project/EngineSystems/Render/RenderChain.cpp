#include "framework.h"
#include "RenderChain.h"

HWND g_hwnd = nullptr;
HDC g_dc = nullptr;
HDC g_back_dc = nullptr;

_Size g_screen_size = {};

RenderChain::~RenderChain()
{
	CoUninitialize();

	if (g_dc)
	{
		ReleaseDC(g_hwnd, g_dc);
		g_dc = nullptr;
	}

	_DestroyBackBuffer();
}

_bool RenderChain::Initialize()
{
	CoInitializeEx(nullptr, COINIT_MULTITHREADED);

	g_dc = GetDC(g_hwnd);
	_CreateBackBuffer(WINCX, WINCY); // 이미지 IO 없이 백버퍼 생성

	return true;
}

void RenderChain::Clear()
{
	PatBlt(g_back_dc, 0, 0, g_screen_size.x, g_screen_size.y, BLACKNESS);
}

void RenderChain::Present()
{
	BitBlt(g_dc, 0, 0, g_screen_size.x, g_screen_size.y, g_back_dc, 0, 0, SRCCOPY);
}

_bool RenderChain::_CreateBackBuffer(const _int _width, const _int _height)
{
	// 기존 리소스 정리
	_DestroyBackBuffer();

	g_screen_size.x = _width;
	g_screen_size.y = _height;

	g_back_dc = CreateCompatibleDC(g_dc);
	back_bmp_ = CreateCompatibleBitmap(g_dc, g_screen_size.x, g_screen_size.y);
	old_back_bmp_ = (HBITMAP)SelectObject(g_back_dc, back_bmp_);

	// (선택) 초기 클리어
	PatBlt(g_back_dc, 0, 0, g_screen_size.x, g_screen_size.y, BLACKNESS);

	return true;
}

_bool RenderChain::_DestroyBackBuffer()
{
	if (!g_back_dc)
	{
		return false;
	}

	if (old_back_bmp_)
	{
		SelectObject(g_back_dc, old_back_bmp_);
		old_back_bmp_ = nullptr;
	}

	if (back_bmp_)
	{
		DeleteObject(back_bmp_);
		back_bmp_ = nullptr;
	}

	DeleteDC(g_back_dc);
	g_back_dc = nullptr;

	return true;
}

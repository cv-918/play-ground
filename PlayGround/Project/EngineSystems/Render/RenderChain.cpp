#include "framework.h"
#include "RenderChain.h"

// GDI+ 관련 생성 오류가 발생하는 파일에서만 매크로를 잠시 끕니다.
#ifdef _DEBUG
#undef new
#endif

HWND g_hwnd		= nullptr;
HDC g_dc		= nullptr;
HDC g_back_dc	= nullptr;

Gdiplus::Graphics* g_graphics = nullptr;

_Size g_screen_size = {};

RenderChain::~RenderChain()
{
	// GDI+ 종료 (반드시 리소스 해제 전에 호출)
	Gdiplus::GdiplusShutdown(m_gdiplusToken);
	if (g_dc)
	{
		ReleaseDC(g_hwnd, g_dc);
		g_dc = nullptr;
	}

	_DestroyBackBuffer();
}

_bool RenderChain::Initialize()
{
	// GDI+ 초기화
	Gdiplus::GdiplusStartupInput gdiplusStartupInput;
	Gdiplus::GdiplusStartup(&m_gdiplusToken, &gdiplusStartupInput, nullptr);

	g_dc = GetDC(g_hwnd);
	_CreateBackBuffer(WINCX, WINCY); // 이미지 IO 없이 백버퍼 생성

    return true;
}

void RenderChain::Clear()
{
	// 1) 화면 클리어(단색)
	PatBlt(g_back_dc, 0, 0, g_screen_size.x, g_screen_size.y, BLACKNESS);

	// 2) 이번 프레임에서 공용으로 쓸 Graphics 객체 생성 (싱글 패턴의 시작)
	if (nullptr == g_graphics)
	{
		g_graphics = new Gdiplus::Graphics(g_back_dc);
		// 안티앨리어싱 같은 전역 설정은 여기서 한 번만!
		g_graphics->SetSmoothingMode(Gdiplus::SmoothingModeAntiAlias);
	}
}

void RenderChain::Present()
{
	// 3) 그리기가 다 끝났으므로 Graphics 객체 삭제 (중요: BitBlt 이전에 삭제 권장)
	SAFE_DELETE(g_graphics);

	// 4) 최종 화면 출력
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

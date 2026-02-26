#include "framework.h"
#include "Background.h"

_bool Background::Initialize()
{
	if (!__super::Initialize())
		return false;

	const auto lt = _Point{ INGAME_FRAME_THICKNESS_HALF, INGAME_FRAME_THICKNESS_HALF };
	const auto size = _Size{ GAME_SCREEN_CX, GAME_SCREEN_CY };

	nav_mesh_ = _Rect(lt, size);
	nav_mesh_draw_rt_ = nav_mesh_.ToRECT();

    return true;
}

_int Background::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;

    return _int();
}

void Background::Render(_double _delta_time)
{
	__super::Render(_delta_time);

    // 배경을 그려야한다
	// 일단은 Rect 로 배경을 채우자
	// 추후에는 이미지로 변경
	HPEN hPen = CreatePen(BS_SOLID, 0, RGB(0, 0, 0));
	HPEN oldPen = (HPEN)SelectObject(g_back_dc, hPen);
	HBRUSH hBrush = CreateSolidBrush(RGB(135, 206, 235)); // 하늘색
	HBRUSH oldBrush = (HBRUSH)SelectObject(g_back_dc, hBrush);
	FillRect(g_back_dc, &nav_mesh_draw_rt_, hBrush);
	SelectObject(g_back_dc, oldBrush);
	SelectObject(g_back_dc, oldPen);
	DeleteObject(hBrush);
	DeleteObject(hPen);
}

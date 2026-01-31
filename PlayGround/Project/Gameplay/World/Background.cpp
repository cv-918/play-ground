#include "framework.h"
#include "Background.h"

_bool Background::Initialize()
{
	// 약간의 여백, 가로는 2/3 지점까지 배경, 나머지 영역은 디버그용
	background_rect_ = _Rect(_Point{ INGAVE_FRAME_THICK_H, INGAVE_FRAME_THICK_H }, _Point{ s_int(WINCX * 0.66f), WINCY - INGAVE_FRAME_THICK_H });
	background_rt_ = background_rect_.ToRECT();

    return true;
}

_int Background::Update(double _delta_time)
{
    return _int();
}

_int Background::Render(double _delta_time)
{
    // 배경을 그려야한다
	// 일단은 Rect 로 배경을 채우자
	// 추후에는 이미지로 변경
	HPEN hPen = CreatePen(BS_SOLID, 0, RGB(0, 0, 0));
	HPEN oldPen = (HPEN)SelectObject(back_dc_, hPen);
	HBRUSH hBrush = CreateSolidBrush(RGB(135, 206, 235)); // 하늘색
	HBRUSH oldBrush = (HBRUSH)SelectObject(back_dc_, hBrush);
	FillRect(back_dc_, &background_rt_, hBrush);
	SelectObject(back_dc_, oldBrush);
	SelectObject(back_dc_, oldPen);
	DeleteObject(hBrush);
	DeleteObject(hPen);

    return _int();
}

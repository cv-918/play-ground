#include "framework.h"
#include "UIProgressBar.h"

void UIProgressBar::Render(_double _delta_time)
{
	const _Rect absRect = GetAbsoluteRect();

	// 1. 배경 그리기 (회색 등)
	_DrawFunc::FillRectangle(absRect, bgColor_);

	// 2. 비율(ratio_)에 따라 게이지가 찰 영역 계산
	// 좌측(Left)은 고정하고 우측(Right) 좌표만 비율만큼 계산해서 설정
	_Rect fillRect = absRect;
	_int fillWidth = s_int(absRect.Width() * ratio_);
	fillRect.Rb().x = fillRect.Lt().x + fillWidth;

	// 3. 게이지 그리기
	_DrawFunc::FillRectangle(fillRect, fillColor_);

	// 4. 테두리 (필요 시)
	_DrawFunc::DrawRectangle(absRect, Colors::Black, 1.0f);
}

#include "framework.h"
#include "ProgressBar.h"

void ProgressBar::Render(_double _delta_time)
{
	const _Rect rt = GetRect();

	// 1. 배경 그리기 (회색 등)
	_DrawFunc::FillRectangle(rt, bgColor_);

	// 2. 비율(ratio_)에 따라 게이지가 찰 영역 계산
	// 좌측(Left)은 고정하고 우측(Right) 좌표만 비율만큼 계산해서 설정
	// fill_rect의 너비를 fill_width로 조절. ScaleX는 현재 너비에서 fill_width로 조절하는 방식이므로, fill_width - rt.Width() 만큼 조절해야 함
	_Rect fill_rt = rt;
	const auto fill_width = s_int(rt.Width() * ratio_);
	fill_rt.ScaleX(fill_width - rt.Width());

	// 3. 게이지 그리기
	_DrawFunc::FillRectangle(fill_rt, fillColor_);

	// 4. 테두리 (필요 시)
	if (is_border_enabled_)
	{
		_DrawFunc::DrawRectangle(rt, borderColor_, thickness_);
	}

	// 5. 텍스트 (예: "체력", "남은 시간" 등)
	if (!text_.empty())
	{
		_DrawFunc::DrawString(rt.Center(), text_, Palette::Black, 12.f, true);
	}
}

void ProgressBar::SetAlpha(_float _alpha)
{
	alpha_ = MathFunctions::Clamp(_alpha, 0.f, 1.f);

	// 알파값이 변경될 때마다 색상의 알파 채널도 업데이트
	bgColor_.SetAlpha(_alpha);
	fillColor_.SetAlpha(_alpha);
	borderColor_.SetAlpha(_alpha);
}

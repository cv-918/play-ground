#pragma once
#include "UIBase.h"

class UIProgressBar final : public UIBase
{
public:
	UIProgressBar() : ratio_(1.f), bgColor_(Colors::Gray), fillColor_(Colors::Red) {}

	void Render(_double _delta_time) override;

	void SetRatio(_float _ratio) { ratio_ = MathFunctions::Clamp(_ratio, 0.f, 1.f); }
	void SetColors(const _Color& _bg, const _Color& _fill) { bgColor_ = _bg; fillColor_ = _fill; }

private:
	_float ratio_;      // 0.0 ~ 1.0
	_Color bgColor_;    // 배경색
	_Color fillColor_;  // 게이지색
};


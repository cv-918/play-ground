#pragma once
#include "UIBase.h"

class UIProgressBar final : public UIBase
{
public:
	UIProgressBar() : ratio_(1.f), bgColor_(Colors::Gray), fillColor_(Colors::Pink) {}

	void Render(_double _delta_time) override;

	void SetRatio(_float _ratio) { ratio_ = MathFunctions::Clamp(_ratio, 0.f, 1.f); }
	void SetColors(const _Color& _bg, const _Color& _fill) { bgColor_ = _bg; fillColor_ = _fill; }

private:
	_float ratio_;      // 0.0 ~ 1.0
	_Color bgColor_;    // 배경색
	_Color fillColor_;  // 게이지색

	// 체력 게이지의 경우 현재 체력 비율에 따라서 실시간으로 fillColor_가 변경되는 것이 좋은데
	// 이런 기능을 ProgressBar에 자체적으로 넣어둘지? 아니면 이 클래스를 갖는 HPBar 같은 클래스를 따로 만들어서 그 클래스에서 fillColor_를 업데이트하는 방식으로 구현할지 고민해볼 필요가 있다
};

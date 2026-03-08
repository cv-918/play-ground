#pragma once
#include "../UIBase.h"

class ProgressBar final : public UIBase
{
public:
	void Render(_double _delta_time) override;

public:
	void SetColors(const _Color& _bg, const _Color& _fill, const _Color& _border) { bgColor_ = _bg; fillColor_ = _fill; borderColor_ = _border; }

	_float Ratio() const { return ratio_; }
	void Ratio(_float _ratio) { ratio_ = MathFunctions::Clamp(_ratio, 0.f, 1.f); }

	_Color BackgroundColor() const { return bgColor_; }
	void BackgroundColor(const _Color& _color) { bgColor_ = _color; }

	_Color FillColor() const { return fillColor_; }
	void FillColor(const _Color& _color) { fillColor_ = _color; }

	_Color BorderColor() const { return borderColor_; }
	void BorderColor(const _Color& _color) { borderColor_ = _color; }

	_float BorderThickness() const { return thickness_; }
	void BorderThickness(_float _thickness) { thickness_ = _thickness; }

	_float GetAlpha() const { return alpha_; }
	void SetAlpha(_float _alpha);

private:
	// 게이지의 채워진 정도를 나타내는 변수. 비율(0.0 ~ 1.0)로 표현.
	// 예를 들어, 체력 게이지의 경우 현재 체력 / 최대 체력으로 계산된 값을 이 변수에 설정할 수 있습니다.
	_float ratio_ = 1.f;

	// 배경색, 채워지는 색, 테두리 색. 필요에 따라 조절 가능
	_Color bgColor_ = Colors::LightGray;
	_Color fillColor_ = Colors::DarkGray;
	_Color borderColor_ = Colors::Black;

	// 테두리 두께. 필요에 따라 조절 가능
	_float thickness_ = 1.f;

	// 자체 알파값
	_float alpha_ = 1.f;
};

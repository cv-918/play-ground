#pragma once
#include "../UIBase.h"

class ProgressBar final : public UIBase
{
public:
	void Render(_double _delta_time) override;

public:
	void SetColors(const _Color& _bg, const _Color& _fill, const _Color& _border) { bgColor_ = _bg; fillColor_ = _fill; borderColor_ = _border; }

	_float GetRatio() const { return ratio_; }
	void SetRatio(_float _ratio) { ratio_ = MathFunctions::Clamp(_ratio, 0.f, 1.f); }

	_Color GetBackgroundColor() const { return bgColor_; }
	void SetBackgroundColor(const _Color& _color) { bgColor_ = _color; }

	_Color GetFillColor() const { return fillColor_; }
	void SetFillColor(const _Color& _color) { fillColor_ = _color; }

	_Color GetBorderColor() const { return borderColor_; }
	void SetBorderColor(const _Color& _color) { borderColor_ = _color; }

	_bool IsBorderEnabled() const { return is_border_enabled_; }
	void SetBorderEnabled(_bool _enabled) { is_border_enabled_ = _enabled; }

	_float GetBorderThickness() const { return thickness_; }
	void SetBorderThickness(_float _thickness) { thickness_ = _thickness; }

	_float GetAlpha() const { return alpha_; }
	void SetAlpha(_float _alpha);

	void SetText(const std::wstring& _text) { text_ = _text; }

private:
	// 게이지의 채워진 정도를 나타내는 변수. 비율(0.0 ~ 1.0)로 표현.
	// 예를 들어, 체력 게이지의 경우 현재 체력 / 최대 체력으로 계산된 값을 이 변수에 설정할 수 있습니다.
	_float ratio_ = 1.f;

	// 배경색, 채워지는 색, 테두리 색. 필요에 따라 조절 가능
	_Color bgColor_ = Colors::LightGray;
	_Color fillColor_ = Colors::DarkGray;
	_Color borderColor_ = Colors::Black;

	// 테두리 두께. 필요에 따라 조절 가능
	_bool is_border_enabled_ = true; // 테두리 표시 여부를 나타내는 변수. 필요에 따라 테두리를 켜거나 끌 수 있습니다.
	_float thickness_ = 1.f;

	// 자체 알파값
	_float alpha_ = 1.f;

	// 게이지 위에 표시될 텍스트 (예: "체력", "남은 시간" 등). 필요에 따라 설정 가능
	std::wstring text_;
};

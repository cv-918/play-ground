#pragma once

#include "DebugWindowElement.h"

class DWE_Button final : public DebugWindowElement
{
public:
	DWE_Button(const std::wstring& _label, std::function<void()> _on_click)
		: DebugWindowElement(DebugWindowElementType::Button)
		, label_(_label)
		, on_click_(std::move(_on_click))
	{
	}

	~DWE_Button() override DEFAULT;

public:
	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_bool IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;

private:
	std::wstring label_;
	std::function<void()> on_click_;

	_float horizontal_padding_ = 10.f;
	_float vertical_padding_ = 6.f;
	_float font_size_ = 12.f;

	_bool is_hovered_ = false;
	_bool is_pressed_ = false;

	_Color border_color_ = _Color(255, 40, 40, 40);
	_Color background_color_ = _Color(255, 240, 240, 240);
	_Color hover_color_ = _Color(255, 225, 225, 225);
	_Color pressed_color_ = _Color(255, 200, 200, 200);
	_Color text_color_ = Palette::Black;
};
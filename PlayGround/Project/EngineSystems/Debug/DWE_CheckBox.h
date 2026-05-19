#pragma once

#include "DebugWindowElement.h"

class DWE_CheckBox final : public DebugWindowElement
{
public:
	DWE_CheckBox(const std::wstring& _label, _bool* _value_ptr)
		: DebugWindowElement(DebugWindowElementType::CheckBox)
		, label_(_label)
		, value_ptr_(_value_ptr)
	{
	}

	explicit DWE_CheckBox(DweCheckBoxData _data)
		: DebugWindowElement(DebugWindowElementType::CheckBox)
		, label_(_data.label_)
		, value_getter_(std::move(_data.value_getter_))
		, value_setter_(std::move(_data.value_setter_))
	{
	}

	~DWE_CheckBox() override DEFAULT;

public:
	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_RectF GetBoxRect() const;
	_RectF GetTextRect() const;
	_bool IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;

private:
	std::wstring label_;
	_bool* value_ptr_ = nullptr;
	std::function<_bool()> value_getter_;
	std::function<void(_bool)> value_setter_;

	_float box_size_ = 14.f;
	_float box_text_spacing_ = 6.f;
	_float font_size_ = 12.f;

	_bool is_hovered_ = false;
	_bool is_pressed_ = false;

	_Color border_color_ = _Color(255, 40, 40, 40);
	_Color background_color_ = _Color(255, 245, 245, 245);
	_Color hover_color_ = _Color(255, 230, 230, 230);
	_Color check_color_ = _Color(255, 60, 140, 60);
	_Color text_color_ = Palette::Black;
};

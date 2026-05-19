#include "framework.h"
#include "DWE_CheckBox.h"

_bool DWE_CheckBox::IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return (_point.x >= _rect.left && _point.x < _rect.right &&
		_point.y >= _rect.top && _point.y < _rect.bottom);
}

_RectF DWE_CheckBox::GetBoxRect() const
{
	const _float box_top = rect_.top + (rect_.Height() - box_size_) * 0.5f;

	return _RectF(
		rect_.left,
		box_top,
		rect_.left + box_size_,
		box_top + box_size_);
}

_RectF DWE_CheckBox::GetTextRect() const
{
	return _RectF(
		rect_.left + box_size_ + box_text_spacing_,
		rect_.top,
		rect_.right,
		rect_.bottom);
}

_int DWE_CheckBox::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const _bool has_bound_value = (value_ptr_ != nullptr) || (value_getter_ && value_setter_);
	if (!has_bound_value)
		return UPDATE_CONTINUE;

	const _Vector2 mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);
	const _bool mouse_released = _InputMgr.Up(VK_LBUTTON);

	is_hovered_ = IsPointInRect(mouse_pos, rect_);

	if (mouse_pressed && is_hovered_)
		is_pressed_ = true;

	if (is_pressed_ && mouse_released)
	{
		if (is_hovered_)
		{
			const _bool current_value = (value_ptr_ != nullptr)
				? *value_ptr_
				: value_getter_();

			if (value_ptr_ != nullptr)
				*value_ptr_ = !current_value;
			else
				value_setter_(!current_value);
		}

		is_pressed_ = false;
	}

	if (is_pressed_ && mouse_down == false && mouse_released == false)
		is_pressed_ = false;

	return UPDATE_CONTINUE;
}

_Vector2 DWE_CheckBox::Measure() const
{
	const _Vector2 text_size = _DrawFunc::MeasureString(
		label_,
		font_size_,
     _DrawFunc::FONT_STYLE_REGULAR);

	const _float width = box_size_ + box_text_spacing_ + text_size.x;
	const _float height = std::max(box_size_, text_size.y);

	return _Vector2(width, height);
}

void DWE_CheckBox::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const _RectF box_rect = GetBoxRect();
	const _RectF text_rect = GetTextRect();

	const _Color fill_color = is_hovered_ ? hover_color_ : background_color_;
	const _bool is_checked = (value_ptr_ != nullptr)
		? *value_ptr_
		: (value_getter_ ? value_getter_() : false);

	_DrawFunc::FillRectangle(box_rect, fill_color);
	_DrawFunc::DrawRectangle(box_rect, border_color_, 1.f);

	if (is_checked)
	{
		const _RectF inner_rect(
			box_rect.left + 3.f,
			box_rect.top + 3.f,
			box_rect.right - 3.f,
			box_rect.bottom - 3.f);

		_DrawFunc::FillRectangle(inner_rect, check_color_);
	}

	_DrawFunc::DrawString(
		text_rect,
		label_,
		text_color_,
		font_size_,
      _DrawFunc::FONT_STYLE_REGULAR,
		_DrawFunc::STRING_ALIGN_NEAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);
}

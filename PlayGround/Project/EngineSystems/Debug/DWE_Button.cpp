#include "framework.h"
#include "DWE_Button.h"

_bool DWE_Button::IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return (_point.x >= _rect.left && _point.x < _rect.right &&
		_point.y >= _rect.top && _point.y < _rect.bottom);
}

_int DWE_Button::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const _Vector2 mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);
	const _bool mouse_released = _InputMgr.Up(VK_LBUTTON);

	is_hovered_ = IsPointInRect(mouse_pos, rect_);

	if (mouse_pressed && is_hovered_)
		is_pressed_ = true;

	if (is_pressed_ && mouse_released)
	{
		if (is_hovered_ && on_click_)
			on_click_();

		is_pressed_ = false;
	}

	if (is_pressed_ && mouse_down == false && mouse_released == false)
		is_pressed_ = false;

	return UPDATE_CONTINUE;
}

_Vector2 DWE_Button::Measure() const
{
	const _Vector2 text_size = _DrawFunc::MeasureString(
		label_,
		font_size_,
     _DrawFunc::FONT_STYLE_REGULAR);

	return _Vector2(
		text_size.x + horizontal_padding_ * 2.f,
		text_size.y + vertical_padding_ * 2.f);
}

void DWE_Button::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	_Color fill_color = background_color_;

	if (is_pressed_)
		fill_color = pressed_color_;
	else if (is_hovered_)
		fill_color = hover_color_;

	_DrawFunc::FillRectangle(rect_, fill_color);
	_DrawFunc::DrawRectangle(rect_, border_color_, 1.f);

	_DrawFunc::DrawString(
		rect_,
		label_,
		text_color_,
		font_size_,
      _DrawFunc::FONT_STYLE_REGULAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);
}
#include "framework.h"
#include "DWE_Controls.h"

#include <iomanip>
#include <sstream>

namespace
{
	constexpr _float kDefaultWidth = 340.f;
	constexpr _float kRowHeight = 22.f;
	constexpr _float kHeaderHeight = 24.f;
	constexpr _float kLabelWidth = 118.f;
	constexpr _float kTrackHeight = 8.f;

	_bool IsPointInRect(const _Vector2& _point, const _RectF& _rect)
	{
		return (_point.x >= _rect.left && _point.x < _rect.right &&
			_point.y >= _rect.top && _point.y < _rect.bottom);
	}

	std::wstring FormatFloat(_float _value, _int _precision)
	{
		std::wstringstream stream;
		stream << std::fixed << std::setprecision(_precision) << _value;
		return stream.str();
	}

	_float QuantizeFloat(_float _value, _float _step)
	{
		if (_step <= 0.f)
			return _value;

		return std::round(_value / _step) * _step;
	}

	_float CalculateTrackRatio(_float _mouse_x, const _RectF& _track_rect)
	{
		if (_track_rect.Width() <= 0.f)
			return 0.f;

		return _MathFunc::Clamp((_mouse_x - _track_rect.left) / _track_rect.Width(), 0.f, 1.f);
	}

	_RectF CenteredTrack(_float _left, _float _right, _float _center_y)
	{
		return _RectF(
			_left,
			_center_y - kTrackHeight * 0.5f,
			_right,
			_center_y + kTrackHeight * 0.5f);
	}
}

_Vector2 DWE_DynamicText::Measure() const
{
	const auto text_data = data_.text_provider_ ? data_.text_provider_() : DweTextData();
	return _DrawFunc::MeasureString(text_data.text_, text_data.font_size_, text_data.style_bitmask_);
}

void DWE_DynamicText::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto text_data = data_.text_provider_ ? data_.text_provider_() : DweTextData();
	_DrawFunc::DrawString(
		rect_,
		text_data.text_,
		text_data.color_,
		text_data.font_size_,
		text_data.style_bitmask_,
		text_data.alignment_horizontal_,
		text_data.alignment_vertical_,
		true);
}

_Vector2 DWE_Separator::Measure() const
{
	if (data_.label_.empty())
		return _Vector2(kDefaultWidth, 8.f);

	const auto text_size = _DrawFunc::MeasureString(
		data_.label_,
		data_.is_header_ ? 14.f : 12.f,
		data_.is_header_ ? _DrawFunc::FONT_STYLE_BOLD : _DrawFunc::FONT_STYLE_REGULAR);

	return _Vector2(std::max(kDefaultWidth, text_size.x), data_.is_header_ ? 24.f : 18.f);
}

void DWE_Separator::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const _float center_y = rect_.top + rect_.Height() * 0.5f;
	const _Color line_color(255, 170, 170, 170);

	if (data_.label_.empty())
	{
		_DrawFunc::DrawLine(_Point(rect_.left, center_y), _Point(rect_.right, center_y), line_color, 1.f);
		return;
	}

	const auto font_size = data_.is_header_ ? 14.f : 12.f;
	const auto style = data_.is_header_ ? _DrawFunc::FONT_STYLE_BOLD : _DrawFunc::FONT_STYLE_REGULAR;
	const auto text_size = _DrawFunc::MeasureString(data_.label_, font_size, style);
	const _RectF text_rect(rect_.left, rect_.top, rect_.left + text_size.x + 6.f, rect_.bottom);

	_DrawFunc::DrawString(
		text_rect,
		data_.label_,
		Palette::Black,
		font_size,
		style,
		_DrawFunc::STRING_ALIGN_NEAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);

	_DrawFunc::DrawLine(
		_Point(text_rect.right + 4.f, center_y),
		_Point(rect_.right, center_y),
		line_color,
		1.f);
}

_RectF DWE_ButtonRow::_GetButtonRect(size_t _index) const
{
	if (data_.buttons_.empty())
		return rect_;

	const _float spacing = 4.f;
	const auto count = s_float(data_.buttons_.size());
	const _float button_width = (rect_.Width() - spacing * (count - 1.f)) / count;
	const _float left = rect_.left + (button_width + spacing) * s_float(_index);
	return _RectF(left, rect_.top, left + button_width, rect_.bottom);
}

_bool DWE_ButtonRow::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

_int DWE_ButtonRow::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const _Vector2 mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);
	const _bool mouse_released = _InputMgr.Up(VK_LBUTTON);

	hovered_index_ = -1;
	for (size_t i = 0; i < data_.buttons_.size(); ++i)
	{
		if (_IsPointInRect(mouse_pos, _GetButtonRect(i)))
		{
			hovered_index_ = s_int(i);
			break;
		}
	}

	if (mouse_pressed && hovered_index_ >= 0)
		pressed_index_ = hovered_index_;

	if (pressed_index_ >= 0 && mouse_released)
	{
		if (hovered_index_ == pressed_index_ &&
			pressed_index_ < s_int(data_.buttons_.size()) &&
			data_.buttons_[pressed_index_].on_click_)
		{
			data_.buttons_[pressed_index_].on_click_();
		}

		pressed_index_ = -1;
	}

	if (pressed_index_ >= 0 && !mouse_down && !mouse_released)
		pressed_index_ = -1;

	return UPDATE_CONTINUE;
}

_Vector2 DWE_ButtonRow::Measure() const
{
	return _Vector2(kDefaultWidth, 28.f);
}

void DWE_ButtonRow::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	for (size_t i = 0; i < data_.buttons_.size(); ++i)
	{
		const auto rect = _GetButtonRect(i);
		_Color fill_color(255, 240, 240, 240);
		if (pressed_index_ == s_int(i))
			fill_color = _Color(255, 205, 205, 205);
		else if (hovered_index_ == s_int(i))
			fill_color = _Color(255, 225, 225, 225);

		_DrawFunc::FillRectangle(rect, fill_color);
		_DrawFunc::DrawRectangle(rect, _Color(255, 50, 50, 50), 1.f);
		_DrawFunc::DrawString(
			rect,
			data_.buttons_[i].label_,
			Palette::Black,
			12.f,
			_DrawFunc::FONT_STYLE_REGULAR,
			_DrawFunc::STRING_ALIGN_CENTER,
			_DrawFunc::STRING_ALIGN_CENTER,
			true);
	}
}

std::vector<std::wstring> DWE_SelectableList::_Items() const
{
	return data_.item_provider_ ? data_.item_provider_() : std::vector<std::wstring>();
}

_RectF DWE_SelectableList::_GetItemRect(_int _index) const
{
	return _RectF(
		rect_.left,
		rect_.top + kHeaderHeight + kRowHeight * _index,
		rect_.right,
		rect_.top + kHeaderHeight + kRowHeight * (_index + 1));
}

_bool DWE_SelectableList::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

_int DWE_SelectableList::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto items = _Items();
	const auto visible_count = std::min(s_int(items.size()), std::max(1, data_.max_visible_items_));
	const _Vector2 mouse_pos = _InputMgr.MousePoint();
	hovered_index_ = -1;

	for (_int i = 0; i < visible_count; ++i)
	{
		if (_IsPointInRect(mouse_pos, _GetItemRect(i)))
		{
			hovered_index_ = i;
			break;
		}
	}

	if (_InputMgr.Down(VK_LBUTTON) && hovered_index_ >= 0 && data_.selected_index_setter_)
		data_.selected_index_setter_(hovered_index_);

	return UPDATE_CONTINUE;
}

_Vector2 DWE_SelectableList::Measure() const
{
	const auto item_count = s_int(_Items().size());
	const auto visible_count = std::min(item_count, std::max(1, data_.max_visible_items_));
	return _Vector2(kDefaultWidth, kHeaderHeight + std::max(1, visible_count) * kRowHeight);
}

void DWE_SelectableList::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto items = _Items();
	const auto visible_count = std::min(s_int(items.size()), std::max(1, data_.max_visible_items_));
	const auto selected_index = data_.selected_index_getter_ ? data_.selected_index_getter_() : -1;

	_DrawFunc::DrawString(
		_RectF(rect_.left, rect_.top, rect_.right, rect_.top + kHeaderHeight),
		data_.label_,
		Palette::Black,
		13.f,
		_DrawFunc::FONT_STYLE_BOLD,
		_DrawFunc::STRING_ALIGN_NEAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);

	if (items.empty())
	{
		_DrawFunc::DrawString(
			_GetItemRect(0),
			L"<empty>",
			Palette::DimGray,
			12.f,
			_DrawFunc::FONT_STYLE_REGULAR,
			_DrawFunc::STRING_ALIGN_NEAR,
			_DrawFunc::STRING_ALIGN_CENTER,
			true);
		return;
	}

	for (_int i = 0; i < visible_count; ++i)
	{
		const auto item_rect = _GetItemRect(i);
		if (i == selected_index)
			_DrawFunc::FillRectangle(item_rect, _Color(255, 210, 235, 210));
		else if (i == hovered_index_)
			_DrawFunc::FillRectangle(item_rect, _Color(255, 232, 232, 232));

		_DrawFunc::DrawRectangle(item_rect, _Color(255, 210, 210, 210), 1.f);
		_DrawFunc::DrawString(
			_RectF(item_rect.left + 4.f, item_rect.top, item_rect.right - 4.f, item_rect.bottom),
			items[i],
			Palette::Black,
			12.f,
			_DrawFunc::FONT_STYLE_REGULAR,
			_DrawFunc::STRING_ALIGN_NEAR,
			_DrawFunc::STRING_ALIGN_CENTER,
			true);
	}
}

_RectF DWE_SliderFloat::_GetTrackRect() const
{
	const _float center_y = rect_.top + rect_.Height() * 0.5f + 5.f;
	return CenteredTrack(rect_.left + kLabelWidth, rect_.right - 8.f, center_y);
}

_bool DWE_SliderFloat::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

_float DWE_SliderFloat::_ReadValue() const
{
	return data_.value_getter_ ? data_.value_getter_() : 0.f;
}

void DWE_SliderFloat::_WriteValueFromMouseX(_float _mouse_x)
{
	if (!data_.value_setter_)
		return;

	const _float min_value = std::min(data_.min_value_, data_.max_value_);
	const _float max_value = std::max(data_.min_value_, data_.max_value_);
	const auto ratio = CalculateTrackRatio(_mouse_x, _GetTrackRect());
	auto value = min_value + (max_value - min_value) * ratio;
	value = QuantizeFloat(value, data_.step_);
	value = _MathFunc::Clamp(value, min_value, max_value);
	data_.value_setter_(value);
}

_int DWE_SliderFloat::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto mouse_pos = _InputMgr.MousePoint();
	const auto track_rect = _GetTrackRect();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);

	if (mouse_pressed && (_IsPointInRect(mouse_pos, rect_) || _IsPointInRect(mouse_pos, track_rect)))
		is_dragging_ = true;

	if (is_dragging_ && mouse_down)
		_WriteValueFromMouseX(s_float(mouse_pos.x));

	if (!mouse_down)
		is_dragging_ = false;

	return UPDATE_CONTINUE;
}

_Vector2 DWE_SliderFloat::Measure() const
{
	return _Vector2(kDefaultWidth, 30.f);
}

void DWE_SliderFloat::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto value = _ReadValue();
	const _float min_value = std::min(data_.min_value_, data_.max_value_);
	const _float max_value = std::max(data_.min_value_, data_.max_value_);
	const _float ratio = (max_value > min_value) ? _MathFunc::Clamp((value - min_value) / (max_value - min_value), 0.f, 1.f) : 0.f;
	const auto track_rect = _GetTrackRect();
	const _float thumb_x = track_rect.left + track_rect.Width() * ratio;

	_DrawFunc::DrawString(
		_RectF(rect_.left, rect_.top, rect_.left + kLabelWidth - 6.f, rect_.bottom),
		data_.label_ + L": " + FormatFloat(value, data_.precision_),
		Palette::Black,
		12.f,
		_DrawFunc::FONT_STYLE_REGULAR,
		_DrawFunc::STRING_ALIGN_NEAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);

	_DrawFunc::FillRectangle(track_rect, _Color(255, 210, 210, 210));
	_DrawFunc::FillRectangle(_RectF(track_rect.left, track_rect.top, thumb_x, track_rect.bottom), _Color(255, 90, 150, 210));
	_DrawFunc::FillRectangle(_RectF(thumb_x - 4.f, track_rect.top - 4.f, thumb_x + 4.f, track_rect.bottom + 4.f), _Color(255, 60, 90, 120));
}

_RectF DWE_SliderInt::_GetTrackRect() const
{
	const _float center_y = rect_.top + rect_.Height() * 0.5f + 5.f;
	return CenteredTrack(rect_.left + kLabelWidth, rect_.right - 8.f, center_y);
}

_bool DWE_SliderInt::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

_int DWE_SliderInt::_ReadValue() const
{
	return data_.value_getter_ ? data_.value_getter_() : 0;
}

void DWE_SliderInt::_WriteValueFromMouseX(_float _mouse_x)
{
	if (!data_.value_setter_)
		return;

	const auto min_value = std::min(data_.min_value_, data_.max_value_);
	const auto max_value = std::max(data_.min_value_, data_.max_value_);
	const auto ratio = CalculateTrackRatio(_mouse_x, _GetTrackRect());
	auto value = s_int(std::round(min_value + (max_value - min_value) * ratio));
	const auto step = std::max(1, data_.step_);
	value = min_value + ((value - min_value) / step) * step;
	value = _MathFunc::Clamp(value, min_value, max_value);
	data_.value_setter_(value);
}

_int DWE_SliderInt::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto mouse_pos = _InputMgr.MousePoint();
	const auto track_rect = _GetTrackRect();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);

	if (mouse_pressed && (_IsPointInRect(mouse_pos, rect_) || _IsPointInRect(mouse_pos, track_rect)))
		is_dragging_ = true;

	if (is_dragging_ && mouse_down)
		_WriteValueFromMouseX(s_float(mouse_pos.x));

	if (!mouse_down)
		is_dragging_ = false;

	return UPDATE_CONTINUE;
}

_Vector2 DWE_SliderInt::Measure() const
{
	return _Vector2(kDefaultWidth, 30.f);
}

void DWE_SliderInt::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto value = _ReadValue();
	const auto min_value = std::min(data_.min_value_, data_.max_value_);
	const auto max_value = std::max(data_.min_value_, data_.max_value_);
	const _float ratio = (max_value > min_value) ? _MathFunc::Clamp(s_float(value - min_value) / s_float(max_value - min_value), 0.f, 1.f) : 0.f;
	const auto track_rect = _GetTrackRect();
	const _float thumb_x = track_rect.left + track_rect.Width() * ratio;

	_DrawFunc::DrawString(
		_RectF(rect_.left, rect_.top, rect_.left + kLabelWidth - 6.f, rect_.bottom),
		data_.label_ + L": " + std::to_wstring(value),
		Palette::Black,
		12.f,
		_DrawFunc::FONT_STYLE_REGULAR,
		_DrawFunc::STRING_ALIGN_NEAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);

	_DrawFunc::FillRectangle(track_rect, _Color(255, 210, 210, 210));
	_DrawFunc::FillRectangle(_RectF(track_rect.left, track_rect.top, thumb_x, track_rect.bottom), _Color(255, 90, 150, 210));
	_DrawFunc::FillRectangle(_RectF(thumb_x - 4.f, track_rect.top - 4.f, thumb_x + 4.f, track_rect.bottom + 4.f), _Color(255, 60, 90, 120));
}

std::vector<std::wstring> DWE_ComboBox::_Options() const
{
	return data_.option_provider_ ? data_.option_provider_() : std::vector<std::wstring>();
}

_RectF DWE_ComboBox::_GetHeaderRect() const
{
	return _RectF(rect_.left, rect_.top, rect_.right, rect_.top + kHeaderHeight);
}

_RectF DWE_ComboBox::_GetOptionRect(_int _index) const
{
	return _RectF(
		rect_.left + kLabelWidth,
		rect_.top + kHeaderHeight + kRowHeight * _index,
		rect_.right,
		rect_.top + kHeaderHeight + kRowHeight * (_index + 1));
}

_bool DWE_ComboBox::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

_int DWE_ComboBox::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto options = _Options();
	const auto visible_count = std::min(s_int(options.size()), std::max(1, data_.max_visible_options_));
	const auto mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);

	hovered_option_index_ = -1;
	if (is_open_)
	{
		for (_int i = 0; i < visible_count; ++i)
		{
			if (_IsPointInRect(mouse_pos, _GetOptionRect(i)))
			{
				hovered_option_index_ = i;
				break;
			}
		}
	}

	if (mouse_pressed)
	{
		if (_IsPointInRect(mouse_pos, _GetHeaderRect()))
		{
			is_open_ = !is_open_;
		}
		else if (is_open_ && hovered_option_index_ >= 0)
		{
			if (data_.selected_index_setter_)
				data_.selected_index_setter_(hovered_option_index_);
			is_open_ = false;
		}
		else if (!_IsPointInRect(mouse_pos, rect_))
		{
			is_open_ = false;
		}
	}

	return UPDATE_CONTINUE;
}

_Vector2 DWE_ComboBox::Measure() const
{
	const auto option_count = s_int(_Options().size());
	const auto visible_count = std::min(option_count, std::max(1, data_.max_visible_options_));
	return _Vector2(kDefaultWidth, kHeaderHeight + (is_open_ ? std::max(1, visible_count) * kRowHeight : 0.f));
}

void DWE_ComboBox::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto options = _Options();
	const auto selected_index = data_.selected_index_getter_ ? data_.selected_index_getter_() : -1;
	const auto selected_label = (selected_index >= 0 && selected_index < s_int(options.size()))
		? options[selected_index]
		: L"<none>";

	const auto header_rect = _GetHeaderRect();
	const _RectF label_rect(header_rect.left, header_rect.top, header_rect.left + kLabelWidth - 6.f, header_rect.bottom);
	const _RectF value_rect(header_rect.left + kLabelWidth, header_rect.top, header_rect.right, header_rect.bottom);

	_DrawFunc::DrawString(label_rect, data_.label_, Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
	_DrawFunc::FillRectangle(value_rect, _Color(255, 245, 245, 245));
	_DrawFunc::DrawRectangle(value_rect, _Color(255, 50, 50, 50), 1.f);
	_DrawFunc::DrawString(_RectF(value_rect.left + 4.f, value_rect.top, value_rect.right - 18.f, value_rect.bottom), selected_label, Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
	_DrawFunc::DrawString(_RectF(value_rect.right - 18.f, value_rect.top, value_rect.right, value_rect.bottom), is_open_ ? L"^" : L"v", Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_CENTER, _DrawFunc::STRING_ALIGN_CENTER, true);

	if (!is_open_)
		return;

	const auto visible_count = std::min(s_int(options.size()), std::max(1, data_.max_visible_options_));
	if (options.empty())
	{
		const auto option_rect = _GetOptionRect(0);
		_DrawFunc::FillRectangle(option_rect, _Color(255, 250, 250, 250));
		_DrawFunc::DrawRectangle(option_rect, _Color(255, 210, 210, 210), 1.f);
		_DrawFunc::DrawString(option_rect, L"<empty>", Palette::DimGray, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_CENTER, _DrawFunc::STRING_ALIGN_CENTER, true);
		return;
	}

	for (_int i = 0; i < visible_count; ++i)
	{
		const auto option_rect = _GetOptionRect(i);
		if (i == selected_index)
			_DrawFunc::FillRectangle(option_rect, _Color(255, 210, 235, 210));
		else if (i == hovered_option_index_)
			_DrawFunc::FillRectangle(option_rect, _Color(255, 232, 232, 232));
		else
			_DrawFunc::FillRectangle(option_rect, _Color(255, 250, 250, 250));

		_DrawFunc::DrawRectangle(option_rect, _Color(255, 210, 210, 210), 1.f);
		_DrawFunc::DrawString(_RectF(option_rect.left + 4.f, option_rect.top, option_rect.right - 4.f, option_rect.bottom), options[i], Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
	}
}

_RectF DWE_InputText::_GetEditRect() const
{
	return _RectF(rect_.left + kLabelWidth, rect_.top, rect_.right, rect_.bottom);
}

_bool DWE_InputText::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

std::wstring DWE_InputText::_ReadValue() const
{
	return data_.value_getter_ ? data_.value_getter_() : L"";
}

DWE_InputText::~DWE_InputText()
{
	_Assist.ReleaseKeyboard(this);
}

void DWE_InputText::_Commit()
{
	if (data_.value_setter_)
		data_.value_setter_(editing_text_);
}

_int DWE_InputText::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto mouse_pos = _InputMgr.MousePoint();
	if (_InputMgr.Down(VK_LBUTTON))
	{
		if (_IsPointInRect(mouse_pos, _GetEditRect()))
		{
			is_focused_ = true;
			_Assist.CaptureKeyboard(this);
			editing_text_ = _ReadValue();
		}
		else if (!_IsPointInRect(mouse_pos, rect_))
		{
			if (is_focused_)
				_Commit();
			is_focused_ = false;
			_Assist.ReleaseKeyboard(this);
		}
	}

	if (!is_focused_)
	{
		editing_text_ = _ReadValue();
		return UPDATE_CONTINUE;
	}

	for (const auto ch : _InputMgr.Chars())
	{
		if (ch < 32)
			continue;

		if (editing_text_.size() < data_.max_length_)
			editing_text_.push_back(ch);
	}

	if (_InputMgr.Down(VK_BACK) && !editing_text_.empty())
		editing_text_.pop_back();

	if (_InputMgr.Down(VK_RETURN))
	{
		_Commit();
		is_focused_ = false;
		_Assist.ReleaseKeyboard(this);
	}

	if (_InputMgr.Down(VK_ESCAPE))
	{
		editing_text_ = _ReadValue();
		is_focused_ = false;
		_Assist.ReleaseKeyboard(this);
	}

	_Commit();
	return UPDATE_CONTINUE;
}

_Vector2 DWE_InputText::Measure() const
{
	return _Vector2(kDefaultWidth, 26.f);
}

void DWE_InputText::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto edit_rect = _GetEditRect();
	const auto fill_color = is_focused_ ? _Color(255, 255, 255, 240) : _Color(255, 245, 245, 245);

	_DrawFunc::DrawString(_RectF(rect_.left, rect_.top, rect_.left + kLabelWidth - 6.f, rect_.bottom), data_.label_, Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
	_DrawFunc::FillRectangle(edit_rect, fill_color);
	_DrawFunc::DrawRectangle(edit_rect, is_focused_ ? _Color(255, 80, 120, 180) : _Color(255, 50, 50, 50), 1.f);
	_DrawFunc::DrawString(_RectF(edit_rect.left + 4.f, edit_rect.top, edit_rect.right - 4.f, edit_rect.bottom), editing_text_ + (is_focused_ ? L"|" : L""), Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
}

_RectF DWE_ColorEdit::_GetChannelTrackRect(_int _channel_index) const
{
	const _float top = rect_.top + kHeaderHeight + kRowHeight * _channel_index;
	return CenteredTrack(rect_.left + kLabelWidth, rect_.right - 48.f, top + kRowHeight * 0.5f);
}

_bool DWE_ColorEdit::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

_Color DWE_ColorEdit::_ReadValue() const
{
	return data_.value_getter_ ? data_.value_getter_() : _Color(255, 255, 255, 255);
}

void DWE_ColorEdit::_WriteChannelFromMouseX(_int _channel_index, _float _mouse_x)
{
	if (!data_.value_setter_)
		return;

	auto color = _ReadValue();
	_int channels[4] = {
		color.GetAlpha(),
		color.GetR(),
		color.GetG(),
		color.GetB()
	};

	const auto ratio = CalculateTrackRatio(_mouse_x, _GetChannelTrackRect(_channel_index));
	channels[_channel_index] = _MathFunc::Clamp(s_int(std::round(ratio * 255.f)), 0, 255);

	data_.value_setter_(_Color(channels[0], channels[1], channels[2], channels[3]));
}

_int DWE_ColorEdit::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);

	if (mouse_pressed)
	{
		for (_int i = 0; i < 4; ++i)
		{
			if (_IsPointInRect(mouse_pos, _GetChannelTrackRect(i)))
			{
				active_channel_index_ = i;
				break;
			}
		}
	}

	if (active_channel_index_ >= 0 && mouse_down)
		_WriteChannelFromMouseX(active_channel_index_, s_float(mouse_pos.x));

	if (!mouse_down)
		active_channel_index_ = -1;

	return UPDATE_CONTINUE;
}

_Vector2 DWE_ColorEdit::Measure() const
{
	return _Vector2(kDefaultWidth, kHeaderHeight + kRowHeight * 4.f);
}

void DWE_ColorEdit::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto color = _ReadValue();
	const _int channels[4] = {
		color.GetAlpha(),
		color.GetR(),
		color.GetG(),
		color.GetB()
	};
	const wchar_t* labels[4] = { L"A", L"R", L"G", L"B" };
	const _Color fills[4] = {
		_Color(255, 90, 90, 90),
		_Color(255, 220, 80, 80),
		_Color(255, 80, 180, 90),
		_Color(255, 80, 120, 220)
	};

	_DrawFunc::DrawString(_RectF(rect_.left, rect_.top, rect_.right - 42.f, rect_.top + kHeaderHeight), data_.label_, Palette::Black, 12.f, _DrawFunc::FONT_STYLE_BOLD, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
	_DrawFunc::FillRectangle(_RectF(rect_.right - 36.f, rect_.top + 3.f, rect_.right, rect_.top + kHeaderHeight - 3.f), color);
	_DrawFunc::DrawRectangle(_RectF(rect_.right - 36.f, rect_.top + 3.f, rect_.right, rect_.top + kHeaderHeight - 3.f), _Color(255, 40, 40, 40), 1.f);

	for (_int i = 0; i < 4; ++i)
	{
		const _float row_top = rect_.top + kHeaderHeight + kRowHeight * i;
		const auto track_rect = _GetChannelTrackRect(i);
		const _float ratio = s_float(channels[i]) / 255.f;
		const _float thumb_x = track_rect.left + track_rect.Width() * ratio;

		_DrawFunc::DrawString(_RectF(rect_.left, row_top, rect_.left + kLabelWidth - 6.f, row_top + kRowHeight), std::wstring(labels[i]) + L": " + std::to_wstring(channels[i]), Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
		_DrawFunc::FillRectangle(track_rect, _Color(255, 210, 210, 210));
		_DrawFunc::FillRectangle(_RectF(track_rect.left, track_rect.top, thumb_x, track_rect.bottom), fills[i]);
		_DrawFunc::FillRectangle(_RectF(thumb_x - 4.f, track_rect.top - 4.f, thumb_x + 4.f, track_rect.bottom + 4.f), _Color(255, 60, 60, 60));
	}
}

_RectF DWE_Vector2Field::_GetAxisTrackRect(_int _axis_index) const
{
	const _float top = rect_.top + kHeaderHeight + kRowHeight * _axis_index;
	return CenteredTrack(rect_.left + kLabelWidth, rect_.right - 8.f, top + kRowHeight * 0.5f);
}

_bool DWE_Vector2Field::_IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return IsPointInRect(_point, _rect);
}

_Vector2 DWE_Vector2Field::_ReadValue() const
{
	return data_.value_getter_ ? data_.value_getter_() : _Vector2::Zero();
}

void DWE_Vector2Field::_WriteAxisFromMouseX(_int _axis_index, _float _mouse_x)
{
	if (!data_.value_setter_)
		return;

	const auto min_value = std::min(data_.min_value_, data_.max_value_);
	const auto max_value = std::max(data_.min_value_, data_.max_value_);
	const auto ratio = CalculateTrackRatio(_mouse_x, _GetAxisTrackRect(_axis_index));
	auto value = min_value + (max_value - min_value) * ratio;
	value = QuantizeFloat(value, data_.step_);
	value = _MathFunc::Clamp(value, min_value, max_value);

	auto vector = _ReadValue();
	if (_axis_index == 0)
		vector.x = value;
	else
		vector.y = value;

	data_.value_setter_(vector);
}

_int DWE_Vector2Field::Update(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);

	if (mouse_pressed)
	{
		for (_int i = 0; i < 2; ++i)
		{
			if (_IsPointInRect(mouse_pos, _GetAxisTrackRect(i)))
			{
				active_axis_index_ = i;
				break;
			}
		}
	}

	if (active_axis_index_ >= 0 && mouse_down)
		_WriteAxisFromMouseX(active_axis_index_, s_float(mouse_pos.x));

	if (!mouse_down)
		active_axis_index_ = -1;

	return UPDATE_CONTINUE;
}

_Vector2 DWE_Vector2Field::Measure() const
{
	return _Vector2(kDefaultWidth, kHeaderHeight + kRowHeight * 2.f);
}

void DWE_Vector2Field::Render(_double _delta_time)
{
	UNREFERENCED_PARAMETER(_delta_time);

	const auto vector = _ReadValue();
	const _float values[2] = { vector.x, vector.y };
	const wchar_t* labels[2] = { L"X", L"Y" };
	const auto min_value = std::min(data_.min_value_, data_.max_value_);
	const auto max_value = std::max(data_.min_value_, data_.max_value_);

	_DrawFunc::DrawString(_RectF(rect_.left, rect_.top, rect_.right, rect_.top + kHeaderHeight), data_.label_, Palette::Black, 12.f, _DrawFunc::FONT_STYLE_BOLD, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);

	for (_int i = 0; i < 2; ++i)
	{
		const _float row_top = rect_.top + kHeaderHeight + kRowHeight * i;
		const auto track_rect = _GetAxisTrackRect(i);
		const _float ratio = (max_value > min_value) ? _MathFunc::Clamp((values[i] - min_value) / (max_value - min_value), 0.f, 1.f) : 0.f;
		const _float thumb_x = track_rect.left + track_rect.Width() * ratio;

		_DrawFunc::DrawString(_RectF(rect_.left, row_top, rect_.left + kLabelWidth - 6.f, row_top + kRowHeight), std::wstring(labels[i]) + L": " + FormatFloat(values[i], data_.precision_), Palette::Black, 12.f, _DrawFunc::FONT_STYLE_REGULAR, _DrawFunc::STRING_ALIGN_NEAR, _DrawFunc::STRING_ALIGN_CENTER, true);
		_DrawFunc::FillRectangle(track_rect, _Color(255, 210, 210, 210));
		_DrawFunc::FillRectangle(_RectF(track_rect.left, track_rect.top, thumb_x, track_rect.bottom), _Color(255, 90, 150, 210));
		_DrawFunc::FillRectangle(_RectF(thumb_x - 4.f, track_rect.top - 4.f, thumb_x + 4.f, track_rect.bottom + 4.f), _Color(255, 60, 90, 120));
	}
}

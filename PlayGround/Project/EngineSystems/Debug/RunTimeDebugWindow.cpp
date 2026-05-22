#include "framework.h"
#include "RunTimeDebugWindow.h"

#include "DebugWindowElement.h"

RunTimeDebugWindow::RunTimeDebugWindow()
{
}

RunTimeDebugWindow::~RunTimeDebugWindow()
{
	ClearFrameElements();
	ClearPersistentElements();
}

void RunTimeDebugWindow::BeginFrame()
{
	ClearFrameElements();

	content_width_ = 0.f;
	content_height_ = 0.f;
}

void RunTimeDebugWindow::ClearFrameElements()
{
	for (auto* element : frame_elements_)
		SAFE_DELETE(element);

	frame_elements_.clear();
}

void RunTimeDebugWindow::ClearPersistentElements()
{
	for (auto& pair : persistent_elements_)
		SAFE_DELETE(pair.second);

	persistent_elements_.clear();
}

void RunTimeDebugWindow::AddFrameElement(DebugWindowElement* _element)
{
	if (nullptr == _element)
		return;

	frame_elements_.push_back(_element);
}

void RunTimeDebugWindow::AddPersistentElement(const std::wstring& _key, DebugWindowElement* _element)
{
	if (_key.empty())
	{
		SAFE_DELETE(_element);
		return;
	}

	auto iter = persistent_elements_.find(_key);
	if (iter != persistent_elements_.end())
	{
		SAFE_DELETE(iter->second);
		iter->second = _element;
		return;
	}

	persistent_elements_[_key] = _element;
}

void RunTimeDebugWindow::RemovePersistentElement(const std::wstring& _key)
{
	auto iter = persistent_elements_.find(_key);
	if (iter == persistent_elements_.end())
		return;

	SAFE_DELETE(iter->second);
	persistent_elements_.erase(iter);
}

_bool RunTimeDebugWindow::HasPersistentElement(const std::wstring& _key) const
{
	return persistent_elements_.find(_key) != persistent_elements_.end();
}

void RunTimeDebugWindow::SetVisible(_bool _visible)
{
	if (is_visible_ == _visible)
		return;

	is_visible_ = _visible;
	ClearFrameElements();
	content_width_ = 0.f;
	content_height_ = 0.f;
}

_bool RunTimeDebugWindow::ContainsPoint(const _Vector2& _point) const
{
	return IsPointInRect(_point, GetWindowRect());
}

_RectF RunTimeDebugWindow::GetWindowRect() const
{
	return _RectF(
		position_.x,
		position_.y,
		position_.x + size_.x,
		position_.y + size_.y);
}

_RectF RunTimeDebugWindow::GetTitleBarRect() const
{
	return _RectF(
		position_.x,
		position_.y,
		position_.x + size_.x,
		position_.y + title_bar_height_);
}

_RectF RunTimeDebugWindow::GetContentRect() const
{
	return _RectF(
		position_.x + padding_,
		position_.y + title_bar_height_ + padding_,
		position_.x + size_.x - padding_ - 10.f,
		position_.y + size_.y - padding_);
}

_RectF RunTimeDebugWindow::GetScrollTrackRect() const
{
	const _RectF window_rect = GetWindowRect();
	const _RectF title_rect = GetTitleBarRect();

	return _RectF(
		window_rect.right - 10.f,
		title_rect.bottom + 4.f,
		window_rect.right - 4.f,
		window_rect.bottom - 4.f);
}

_RectF RunTimeDebugWindow::GetScrollThumbRect() const
{
	const _RectF track_rect = GetScrollTrackRect();

	if (max_scroll_y_ <= 0.f || content_height_ <= 0.f)
		return track_rect;

	const _float track_height = track_rect.Height();
	if (track_height <= 0.f)
		return track_rect;

	_float thumb_height = track_height * (visible_content_height_ / content_height_);
	thumb_height = std::max(min_thumb_height_, thumb_height);
	thumb_height = std::min(track_height, thumb_height);

	const _float movable_height = track_height - thumb_height;

	_float scroll_ratio = 0.f;
	if (max_scroll_y_ > 0.f)
		scroll_ratio = scroll_y_ / max_scroll_y_;

	const _float thumb_top = track_rect.top + movable_height * scroll_ratio;

	return _RectF(
		track_rect.left,
		thumb_top,
		track_rect.right,
		thumb_top + thumb_height);
}

_RectF RunTimeDebugWindow::GetResizeGripRect() const
{
	const _RectF window_rect = GetWindowRect();

	return _RectF(
		window_rect.left,
		window_rect.bottom - resize_grip_height_,
		window_rect.right,
		window_rect.bottom);
}

_bool RunTimeDebugWindow::IsPointInRect(const _Vector2& _point, const _RectF& _rect) const
{
	return (_point.x >= _rect.left && _point.x < _rect.right &&
		_point.y >= _rect.top && _point.y < _rect.bottom);
}

_int RunTimeDebugWindow::Update(_double _delta_time, _bool _allow_input)
{
	if (_allow_input)
	{
		UpdateResizing();
		UpdateDragging();
	}
	else
	{
		is_dragging_ = false;
		is_resizing_ = false;
	}

	RebuildLayout(false);
	UpdateAutoResize();

	if (is_dragging_ == false && is_resizing_ == false)
		UpdateScroll(_delta_time, _allow_input);

	RebuildLayout(true);

	if (!_allow_input)
		return UPDATE_CONTINUE;

	const _RectF content_rect = GetContentRect();

	for (auto& pair : persistent_elements_)
	{
		DebugWindowElement* element = pair.second;
		if (element == nullptr)
			continue;

		const _RectF& rect = element->GetRect();
		if (rect.bottom < content_rect.top || rect.top > content_rect.bottom)
			continue;

		element->Update(_delta_time);
	}

	for (auto* element : frame_elements_)
	{
		if (element == nullptr)
			continue;

		const _RectF& rect = element->GetRect();
		if (rect.bottom < content_rect.top || rect.top > content_rect.bottom)
			continue;

		element->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void RunTimeDebugWindow::UpdateResizing()
{
	const _Vector2 mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);
	const _bool mouse_released = _InputMgr.Up(VK_LBUTTON);

	if (mouse_pressed && IsPointInRect(mouse_pos, GetResizeGripRect()))
	{
		is_resizing_ = true;
		is_dragging_ = false;
		has_manual_height_ = true;
		resize_start_mouse_y_ = mouse_pos.y;
		resize_start_height_ = size_.y;
		manual_height_ = size_.y;
	}

	if (is_resizing_)
	{
		if (mouse_pressed || mouse_down)
		{
			const _float delta_y = mouse_pos.y - resize_start_mouse_y_;
			manual_height_ = _MathFunc::Clamp(resize_start_height_ + delta_y, min_size_.y, max_size_.y);
		}
		else
		{
			is_resizing_ = false;
		}
	}

	if (mouse_released)
		is_resizing_ = false;
}

void RunTimeDebugWindow::UpdateDragging()
{
	if (is_resizing_)
		return;

	const _Vector2 mouse_pos = _InputMgr.MousePoint();
	const _bool mouse_pressed = _InputMgr.Down(VK_LBUTTON);
	const _bool mouse_down = _InputMgr.Pressed(VK_LBUTTON);
	const _bool mouse_released = _InputMgr.Up(VK_LBUTTON);

	const _RectF title_bar_rect = GetTitleBarRect();

	if (mouse_pressed && IsPointInRect(mouse_pos, title_bar_rect))
	{
		is_dragging_ = true;
		drag_offset_ = mouse_pos - position_;
	}

	if (is_dragging_)
	{
		if (mouse_down)
			position_ = mouse_pos - drag_offset_;
		else
			is_dragging_ = false;
	}

	if (mouse_released)
		is_dragging_ = false;
}

void RunTimeDebugWindow::UpdateScroll(_double _delta_time, _bool _allow_input)
{
	visible_content_height_ = size_.y - title_bar_height_ - padding_ * 2.f;
	if (visible_content_height_ < 0.f)
		visible_content_height_ = 0.f;

	max_scroll_y_ = std::max(0.f, content_height_ - visible_content_height_);

	target_scroll_y_ = _MathFunc::Clamp(target_scroll_y_, 0.f, max_scroll_y_);
	scroll_y_ = _MathFunc::Clamp(scroll_y_, 0.f, max_scroll_y_);

	if (_allow_input && is_scrollable_ && max_scroll_y_ > 0.f)
	{
		const _Vector2 mouse_pos = _InputMgr.MousePoint();
		const _int wheel_delta = _InputMgr.MouseWheelDelta();
		const _RectF content_rect = GetContentRect();

		if (wheel_delta != 0 && IsPointInRect(mouse_pos, content_rect))
		{
			const _float normalized_wheel = static_cast<_float>(wheel_delta) / 120.f;
			target_scroll_y_ -= normalized_wheel * wheel_scroll_speed_;
			target_scroll_y_ = _MathFunc::Clamp(target_scroll_y_, 0.f, max_scroll_y_);
		}
	}
	else
	{
		target_scroll_y_ = 0.f;
	}

	// smoothing
	const _float lerp_t = std::min(1.f, scroll_lerp_speed_ * static_cast<_float>(_delta_time));
	scroll_y_ += (target_scroll_y_ - scroll_y_) * lerp_t;
	scroll_y_ = _MathFunc::Clamp(scroll_y_, 0.f, max_scroll_y_);
}

void RunTimeDebugWindow::Render(_double _delta_time)
{
	const _RectF window_rect = GetWindowRect();
	const _RectF title_rect = GetTitleBarRect();
	const _RectF content_rect = GetContentRect();

	_DrawFunc::FillRectangle(window_rect, background_color_);
	_DrawFunc::DrawRectangle(window_rect, border_color_, 1.f);

	_DrawFunc::FillRectangle(title_rect, _Color(235, 220, 220, 220));
	_DrawFunc::DrawRectangle(title_rect, border_color_, 1.f);

	const _RectF title_text_rect(
		title_rect.left + 6.f,
		title_rect.top,
		title_rect.right - 6.f,
		title_rect.bottom);

	_DrawFunc::DrawString(
		title_text_rect,
		title_,
		title_color_,
		12.f,
     _DrawFunc::FONT_STYLE_BOLD,
		_DrawFunc::STRING_ALIGN_NEAR,
		_DrawFunc::STRING_ALIGN_CENTER,
		true);

   // content clip region 적용
	if (g_back_dc != nullptr)
	{
     const auto saved_dc = SaveDC(g_back_dc);
		IntersectClipRect(
			g_back_dc,
			s_int(std::round(content_rect.left)),
			s_int(std::round(content_rect.top)),
			s_int(std::round(content_rect.right)),
			s_int(std::round(content_rect.bottom)));

		for (auto& pair : persistent_elements_)
		{
			DebugWindowElement* element = pair.second;
			if (nullptr == element)
				continue;

			const _RectF& rect = element->GetRect();
			if (rect.bottom < content_rect.top || rect.top > content_rect.bottom)
				continue;

			element->Render(_delta_time);
		}

		for (auto* element : frame_elements_)
		{
			if (nullptr == element)
				continue;

			const _RectF& rect = element->GetRect();
			if (rect.bottom < content_rect.top || rect.top > content_rect.bottom)
				continue;

			element->Render(_delta_time);
		}

        RestoreDC(g_back_dc, saved_dc);
	}
	else
	{
		// fallback
		for (auto& pair : persistent_elements_)
		{
			DebugWindowElement* element = pair.second;
			if (nullptr == element)
				continue;

			const _RectF& rect = element->GetRect();
			if (rect.bottom < content_rect.top || rect.top > content_rect.bottom)
				continue;

			element->Render(_delta_time);
		}

		for (auto* element : frame_elements_)
		{
			if (nullptr == element)
				continue;

			const _RectF& rect = element->GetRect();
			if (rect.bottom < content_rect.top || rect.top > content_rect.bottom)
				continue;

			element->Render(_delta_time);
		}
	}

	// scroll track + thumb
	if (max_scroll_y_ > 0.f)
	{
		const _RectF track_rect = GetScrollTrackRect();
		const _RectF thumb_rect = GetScrollThumbRect();

		_DrawFunc::FillRectangle(track_rect, scroll_track_color_);
		_DrawFunc::FillRectangle(thumb_rect, scroll_thumb_color_);
	}

	const _float grip_right = window_rect.right - 5.f;
	const _float grip_bottom = window_rect.bottom - 5.f;
	_DrawFunc::DrawLine(_Point(grip_right - 12.f, grip_bottom), _Point(grip_right, grip_bottom - 12.f), resize_grip_color_, 1.f);
	_DrawFunc::DrawLine(_Point(grip_right - 8.f, grip_bottom), _Point(grip_right, grip_bottom - 8.f), resize_grip_color_, 1.f);
	_DrawFunc::DrawLine(_Point(grip_right - 4.f, grip_bottom), _Point(grip_right, grip_bottom - 4.f), resize_grip_color_, 1.f);
}

void RunTimeDebugWindow::RebuildLayout(_bool _apply_scroll)
{
	content_width_ = 0.f;
	content_height_ = 0.f;

	const _float left = position_.x + padding_;
	_float current_y = position_.y + title_bar_height_ + padding_;

	if (_apply_scroll)
		current_y -= scroll_y_;

	std::vector<DebugWindowElement*> ordered_elements;
	ordered_elements.reserve(persistent_elements_.size() + frame_elements_.size());

	for (auto& pair : persistent_elements_)
	{
		if (pair.second)
			ordered_elements.push_back(pair.second);
	}

	for (auto* element : frame_elements_)
	{
		if (element)
			ordered_elements.push_back(element);
	}

	for (_int i = 0; i < static_cast<_int>(ordered_elements.size()); ++i)
	{
		DebugWindowElement* element = ordered_elements[i];
		if (nullptr == element)
			continue;

		const _Vector2 measured = element->Measure();

		_RectF rect(
			left,
			current_y,
			left + measured.x,
			current_y + measured.y);

		element->SetRect(rect);

		current_y += measured.y;
		content_height_ += measured.y;
		content_width_ = std::max(content_width_, measured.x);

		if (i != static_cast<_int>(ordered_elements.size()) - 1)
		{
			current_y += item_spacing_;
			content_height_ += item_spacing_;
		}
	}
}

void RunTimeDebugWindow::UpdateAutoResize()
{
	const _float target_width = content_width_ + padding_ * 2.f + 10.f;
	const _float target_height = title_bar_height_ + padding_ * 2.f + content_height_;

	size_.x = _MathFunc::Clamp(target_width, min_size_.x, max_size_.x);
	size_.y = has_manual_height_
		? _MathFunc::Clamp(manual_height_, min_size_.y, max_size_.y)
		: _MathFunc::Clamp(target_height, min_size_.y, max_size_.y);
}

#pragma once

class RunTimeDebugWindow
{
public:
	RunTimeDebugWindow();
	~RunTimeDebugWindow();

	void BeginFrame();
	_int Update(_double _delta_time, _bool _allow_input);
	void Render(_double _delta_time);

	void AddFrameElement(class DebugWindowElement* _element);
	void AddPersistentElement(const std::wstring& _key, class DebugWindowElement* _element);
	void RemovePersistentElement(const std::wstring& _key);
	_bool HasPersistentElement(const std::wstring& _key) const;

	void Title(const std::wstring& _title) { title_ = _title; }
	void Position(const _Vector2& _position) { position_ = _position; }
	void SetVisible(_bool _visible);
	_bool IsVisible() const { return is_visible_; }
	_bool ContainsPoint(const _Vector2& _point) const;

private:
	void RebuildLayout(_bool _apply_scroll);
	void UpdateAutoResize();
	void UpdateScroll(_double _delta_time, _bool _allow_input);
	void UpdateResizing();
	void UpdateDragging();

	void ClearFrameElements();
	void ClearPersistentElements();

	_RectF GetWindowRect() const;
	_RectF GetTitleBarRect() const;
	_RectF GetContentRect() const;
	_RectF GetScrollTrackRect() const;
	_RectF GetScrollThumbRect() const;
	_RectF GetResizeGripRect() const;

	_bool IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;

private:
	std::wstring title_;

	std::vector<class DebugWindowElement*> frame_elements_;
	std::map<std::wstring, class DebugWindowElement*> persistent_elements_;

	_Vector2 position_ = _Vector2(30.f, 30.f);
	_Vector2 size_ = _Vector2(220.f, 100.f);
	_Vector2 min_size_ = _Vector2(180.f, 60.f);
	_Vector2 max_size_ = _Vector2(500.f, 600.f);

	_float padding_ = 8.f;
	_float item_spacing_ = 4.f;
	_float title_bar_height_ = 22.f;

	_float content_width_ = 0.f;
	_float content_height_ = 0.f;

	_float scroll_y_ = 0.f;
	_float target_scroll_y_ = 0.f;
	_float max_scroll_y_ = 0.f;
	_float visible_content_height_ = 0.f;
	_float wheel_scroll_speed_ = 32.f;
	_float scroll_lerp_speed_ = 18.f;
	_float min_thumb_height_ = 18.f;

	_bool is_visible_ = true;
	_bool is_scrollable_ = true;
	_bool is_dragging_ = false;
	_Vector2 drag_offset_ = _Vector2(0.f, 0.f);
	_bool is_resizing_ = false;
	_bool has_manual_height_ = false;
	_float manual_height_ = 0.f;
	_float resize_start_mouse_y_ = 0.f;
	_float resize_start_height_ = 0.f;
	_float resize_grip_height_ = 10.f;

	_Color background_color_ = _Color(210, 250, 250, 250);
	_Color border_color_ = _Color(255, 40, 40, 40);
	_Color title_color_ = Palette::Black;

	_Color scroll_track_color_ = _Color(70, 70, 70, 70);
	_Color scroll_thumb_color_ = _Color(160, 110, 110, 110);
	_Color resize_grip_color_ = _Color(180, 90, 90, 90);
};

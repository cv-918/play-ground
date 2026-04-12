#pragma once
#pragma once

#include "../Widgets/WidgetBase.h"

class Button;
class Grid;
class Text;

class OutGameOptionView final : public WidgetBase
{
public:
	explicit OutGameOptionView(const std::function<void()>& _close_callback);

private:
	enum class FocusItem
	{
		ControllerType = 0,
		Resolution,
		WindowMode,
		UiScale,
		Apply,
		Cancel,
		Reset,
		Back,
		Count,
	};

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void OnViewportChanged() override;

	void RefreshTexts();
	void UpdateLayout();
	void MoveFocus(_int _direction);
	void HandleHorizontalInput(_int _direction);
	void InvokeFocusedAction();
	void RefreshControllerGrid();
	void BeginKeyRebind(_int _row, _int _col);
	void HandleKeyRebindInput();

	std::wstring ToControllerTypeText() const;
	std::wstring ToResolutionText() const;
	std::wstring ToWindowModeText() const;
	std::wstring ToUiScaleText() const;
	void UpdateLayoutIfNeeded();

private:
	std::function<void()> close_callback_;

	FocusItem focus_item_ = FocusItem::ControllerType;

	Text* controller_title_text_ = nullptr;
	Text* controller_type_text_ = nullptr;
	Text* video_option_title_text_ = nullptr;
	Text* resolution_text_ = nullptr;
	Text* window_mode_text_ = nullptr;
	Text* ui_scale_text_ = nullptr;
	Text* hint_text_ = nullptr;

	Grid* controller_grid_ = nullptr;

	_bool is_waiting_key_rebind_ = false;
	_bool skip_rebind_input_once_ = false;
	_int rebinding_slot_index_ = -1;
	std::wstring rebind_message_;

	Button* apply_btn_ = nullptr;
	Button* cancel_btn_ = nullptr;
	Button* reset_btn_ = nullptr;
	Button* back_btn_ = nullptr;

	_bool has_layout_cache_ = false;
	_float last_layout_ui_scale_ = -1.f;
	_int last_layout_resolution_w_ = -1;
	_int last_layout_resolution_h_ = -1;
	_int last_layout_window_mode_ = -1;
};

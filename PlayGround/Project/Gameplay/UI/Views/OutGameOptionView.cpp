#include "framework.h"
#include "OutGameOptionView.h"

#include "../Elements/Button.h"
#include "../Elements/Grid.h"
#include "../Elements/Text.h"

namespace
{
	constexpr _int START_X = 180;
	constexpr _int START_Y = 110;
	constexpr _int LINE_GAP = 36;
	constexpr _int CONTROLLER_GRID_TOP_OFFSET = 36;
	constexpr _int CONTROLLER_GRID_CELL_W = 120;
	constexpr _int CONTROLLER_GRID_CELL_H = 30;
	constexpr _int CONTROLLER_GRID_ROW_COUNT = 4;
	constexpr _int CONTROLLER_GRID_COL_COUNT = 4;
	constexpr _int SECTION_GAP_Y = 42;

	const _Color CONTROLLER_COL_BG_ACTION = _Color(255, 245, 245, 245);
	const _Color CONTROLLER_COL_BG_KEY = _Color(255, 235, 240, 250);

	struct BindingSlotDesc
	{
		_int row = 0;
		_int col = 0;
		std::wstring label;
		InputAction action = InputAction::MoveX;
		_float scale = 1.f;
		_bool use_scale = false;
		_bool is_empty = false;
	};

	std::array<BindingSlotDesc, 8> CreateBindingSlots()
	{
		return {
			BindingSlotDesc{ 0, 0, L"위로 이동", InputAction::MoveY, -1.f, true,  false },
			BindingSlotDesc{ 0, 2, L"아래로 이동", InputAction::MoveY,  1.f, true,  false },
			BindingSlotDesc{ 1, 0, L"좌로 이동", InputAction::MoveX, -1.f, true,  false },
			BindingSlotDesc{ 1, 2, L"우로 이동", InputAction::MoveX,  1.f, true,  false },
			BindingSlotDesc{ 2, 0, L"스킬 1",   InputAction::Skill1, 1.f, false, false },
			BindingSlotDesc{ 2, 2, L"스킬 2",   InputAction::Skill2, 1.f, false, false },
			BindingSlotDesc{ 3, 0, L"인터랙션", InputAction::Interact, 1.f, false, false },
			BindingSlotDesc{ 3, 2, L"",         InputAction::Count, 0.f, false, true  },
		};
	}

	const std::array<BindingSlotDesc, 8> BINDING_SLOTS = CreateBindingSlots();

	std::wstring WrapFocusableLabel(_bool _focused, const std::wstring& _label)
	{
		return _focused ? (L"> " + _label + L" <") : (L"  " + _label);
	}

	_int FindBindingSlotIndex(_int _row, _int _col)
	{
		for (_int i = 0; i < s_cast(_int, BINDING_SLOTS.size()); ++i)
		{
			if (BINDING_SLOTS[i].row == _row && BINDING_SLOTS[i].col == _col)
				return i;
		}

		return -1;
	}

	std::wstring ToActionText(InputAction _action)
	{
		switch (_action)
		{
		case InputAction::MoveX: return L"MoveX";
		case InputAction::MoveY: return L"MoveY";
		case InputAction::Dash: return L"Dash";
		case InputAction::Skill1: return L"Skill1";
		case InputAction::Skill2: return L"Skill2";
		case InputAction::Interact: return L"Interact";
		case InputAction::Pause: return L"Pause";
		default: return L"Unknown";
		}
	}

	std::wstring ToPresetText(ControllerPreset _preset)
	{
		switch (_preset)
		{
		case ControllerPreset::KeyboardA: return L"KeyboardA";
		case ControllerPreset::KeyboardB: return L"KeyboardB";
		case ControllerPreset::MouseOnly: return L"MouseOnly";
		case ControllerPreset::KeyboardMouse: return L"KeyboardMouse";
		default: return L"Unknown";
		}
	}

	std::wstring ToKeyCodeText(_int _vk)
	{
		if (_vk >= 'A' && _vk <= 'Z')
			return std::wstring(1, s_cast(wchar_t, _vk));

		if (_vk >= '0' && _vk <= '9')
			return std::wstring(1, s_cast(wchar_t, _vk));

		switch (_vk)
		{
		case VK_LEFT: return L"Left";
		case VK_RIGHT: return L"Right";
		case VK_UP: return L"Up";
		case VK_DOWN: return L"Down";
		case VK_SPACE: return L"Space";
		case VK_RETURN: return L"Enter";
		case VK_ESCAPE: return L"Esc";
		case VK_TAB: return L"Tab";
		case VK_SHIFT: return L"Shift";
		case VK_CONTROL: return L"Ctrl";
		case VK_MENU: return L"Alt";
		case VK_LBUTTON: return L"Mouse1";
		case VK_RBUTTON: return L"Mouse2";
		case VK_MBUTTON: return L"Mouse3";
		case VK_XBUTTON1: return L"Mouse4";
		case VK_XBUTTON2: return L"Mouse5";
		default:
			break;
		}

		if (_vk >= VK_F1 && _vk <= VK_F12)
			return L"F" + std::to_wstring(_vk - VK_F1 + 1);

		return L"VK(" + std::to_wstring(_vk) + L")";
	}

	std::wstring ToBindingText(const InputBinding& _binding)
	{
		if (_binding.source_type == InputSourceType::MouseAxis)
			return (_binding.source_code == 0) ? L"CursorDistX" : L"CursorDistY";

		return ToKeyCodeText(_binding.source_code);
	}

	_bool TryGetBindingBySlot(ControllerPreset _preset, const BindingSlotDesc& _slot, InputBinding* _out_binding)
	{
		if (_slot.is_empty || _slot.action >= InputAction::Count || nullptr == _out_binding)
			return false;

		const PresetBindingSet* binding_set = _InputMgr.GetBindingSet(_preset);
		if (nullptr == binding_set)
			return false;

		for (const InputBinding& binding : binding_set->bindings)
		{
			if (binding.action != _slot.action)
				continue;

			if (_slot.use_scale && std::abs(binding.scale - _slot.scale) > 0.0001f)
				continue;

			*_out_binding = binding;
			return true;
		}

		return false;
	}

	_int ScaleByUi(_int _value, _float _ui_scale)
	{
		if (_ui_scale <= 0.f)
			_ui_scale = 1.f;

		return s_int(std::round(s_cast(_float, _value) * _ui_scale));
	}
}

OutGameOptionView::OutGameOptionView(const std::function<void()>& _close_callback)
	: close_callback_(_close_callback)
{
	_VideoSettingsMgr.BeginEdit();
	rebind_message_ = L"설정하고자 하는 키를 입력하세요";

	controller_title_text_ = CreateElement<Text>();
	controller_title_text_->SetCenterAligned(false);
	controller_title_text_->SetFontSize(18.f);
	controller_title_text_->SetText(L"CONTROLLER OPTION");

	controller_type_text_ = CreateElement<Text>();
	controller_type_text_->SetCenterAligned(false);

	GridCreateInfo controller_grid_info;
	controller_grid_info.rows = CONTROLLER_GRID_ROW_COUNT;
	controller_grid_info.cols = CONTROLLER_GRID_COL_COUNT;
	controller_grid_info.cell_size = _Size{ CONTROLLER_GRID_CELL_W, CONTROLLER_GRID_CELL_H };
	controller_grid_info.line_color = Palette::Black;
	controller_grid_info.line_thickness = 1.f;
	controller_grid_ = CreateElement<Grid>(controller_grid_info);

	for (_int row = 0; row < controller_grid_info.rows; ++row)
	{
		controller_grid_->SetCellFillColor(row, 0, CONTROLLER_COL_BG_ACTION);
		controller_grid_->SetCellFillColor(row, 1, CONTROLLER_COL_BG_KEY);
		controller_grid_->SetCellFillColor(row, 2, CONTROLLER_COL_BG_ACTION);
		controller_grid_->SetCellFillColor(row, 3, CONTROLLER_COL_BG_KEY);
	}

	for (const BindingSlotDesc& slot : BINDING_SLOTS)
	{
		if (slot.is_empty)
			continue;

		controller_grid_->AddCellButton(slot.row, slot.col + 1, L"", [this, row = slot.row, col = slot.col]()
			{
				BeginKeyRebind(row, col);
			});
	}

	video_option_title_text_ = CreateElement<Text>();
	video_option_title_text_->SetCenterAligned(false);
	video_option_title_text_->SetFontSize(18.f);
	video_option_title_text_->SetText(L"VIDEO OPTION");

	resolution_text_ = CreateElement<Text>();
	resolution_text_->SetCenterAligned(false);

	window_mode_text_ = CreateElement<Text>();
	window_mode_text_->SetCenterAligned(false);

	ui_scale_text_ = CreateElement<Text>();
	ui_scale_text_->SetCenterAligned(false);

	Button::CreateInfo apply_btn_info;
	apply_btn_info.text = L"APPLY";
	apply_btn_info.on_lclick = [this]() { _VideoSettingsMgr.Apply(); };
	apply_btn_info.normal_image_path = Path::Buttons + L"APPLY/APPLY_Default.png";
	apply_btn_info.hovered_image_path = Path::Buttons + L"APPLY/APPLY_MO.png";
	apply_btn_info.pressed_l_image_path = Path::Buttons + L"APPLY/APPLY_Push.png";
	apply_btn_info.disabled_image_path = Path::Buttons + L"APPLY/APPLY_Disabled.png";
	apply_btn_ = CreateElement<Button>(apply_btn_info);

	Button::CreateInfo cancel_btn_info;
	cancel_btn_info.text = L"CANCEL";
	cancel_btn_info.on_lclick = [this]() { _VideoSettingsMgr.Cancel(); };
	cancel_btn_info.normal_image_path = Path::Buttons + L"CANCEL/CANCEL_Default.png";
	cancel_btn_info.hovered_image_path = Path::Buttons + L"CANCEL/CANCEL_MO.png";
	cancel_btn_info.pressed_l_image_path = Path::Buttons + L"CANCEL/CANCEL_Push.png";
	cancel_btn_info.disabled_image_path = Path::Buttons + L"CANCEL/CANCEL_Disabled.png";
	cancel_btn_ = CreateElement<Button>(cancel_btn_info);

	Button::CreateInfo reset_btn_info;
	reset_btn_info.text = L"RESET";
	reset_btn_info.on_lclick = [this]() { _VideoSettingsMgr.Reset(); };
	reset_btn_info.normal_image_path = Path::Buttons + L"RESET/RESET_Default.png";
	reset_btn_info.hovered_image_path = Path::Buttons + L"RESET/RESET_MO.png";
	reset_btn_info.pressed_l_image_path = Path::Buttons + L"RESET/RESET_Push.png";
	reset_btn_info.disabled_image_path = Path::Buttons + L"RESET/RESET_Disabled.png";
	reset_btn_ = CreateElement<Button>(reset_btn_info);

	Button::CreateInfo back_btn_info;
	back_btn_info.text = L"BACK";
	back_btn_info.on_lclick = [this]()
		{
			_VideoSettingsMgr.Cancel();
			if (close_callback_)
				close_callback_();
		};
	back_btn_info.normal_image_path = Path::Buttons + L"BACK/BACK_Default.png";
	back_btn_info.hovered_image_path = Path::Buttons + L"BACK/BACK_MO.png";
	back_btn_info.pressed_l_image_path = Path::Buttons + L"BACK/BACK_Push.png";
	back_btn_info.disabled_image_path = Path::Buttons + L"BACK/BACK_Disabled.png";
	back_btn_ = CreateElement<Button>(back_btn_info);

	hint_text_ = CreateElement<Text>();
	hint_text_->SetCenterAligned(false);
	hint_text_->SetText(L"UP/DOWN: Select  LEFT/RIGHT: Change  ENTER: Action  ESC: Back  CLICK KEY CELL: Rebind");

	UpdateLayout();
	RefreshControllerGrid();
	RefreshTexts();
}

void OutGameOptionView::UpdateLayoutIfNeeded()
{
	const VideoSettings& applied = _VideoSettingsMgr.Applied();
	if (has_layout_cache_
		&& std::abs(applied.ui_scale - last_layout_ui_scale_) <= 0.0001f
		&& applied.resolution.width == last_layout_resolution_w_
		&& applied.resolution.height == last_layout_resolution_h_
		&& s_cast(_int, applied.window_mode) == last_layout_window_mode_)
		return;

	UpdateLayout();
}

_int OutGameOptionView::Update(_double _delta_time)
{
	if (is_waiting_key_rebind_)
	{
		HandleKeyRebindInput();
		UpdateLayoutIfNeeded();
		RefreshControllerGrid();
		RefreshTexts();
		return __super::Update(_delta_time);
	}

	if (_InputMgr.Down(VK_UP))
		MoveFocus(-1);
	if (_InputMgr.Down(VK_DOWN))
		MoveFocus(1);

	if (_InputMgr.Down(VK_LEFT))
		HandleHorizontalInput(-1);
	if (_InputMgr.Down(VK_RIGHT))
		HandleHorizontalInput(1);

	if (_InputMgr.Down(VK_RETURN))
	{
		if (apply_btn_ && apply_btn_->IsEnable())
			apply_btn_->LClick();
		else
			InvokeFocusedAction();
	}
	else if (_InputMgr.Down(VK_SPACE))
	{
		InvokeFocusedAction();
	}

	if (_InputMgr.Down(VK_ESCAPE))
	{
		_VideoSettingsMgr.Cancel();
		if (close_callback_)
			close_callback_();

		return UPDATE_BREAK;
	}

	const _bool changed = _VideoSettingsMgr.HasPendingChanges();
	apply_btn_->SetEnable(changed);
	cancel_btn_->SetEnable(changed);

	UpdateLayoutIfNeeded();
	RefreshControllerGrid();
	RefreshTexts();
	return __super::Update(_delta_time);
}

void OutGameOptionView::Render(_double _delta_time)
{
	__super::Render(_delta_time);

	if (!is_waiting_key_rebind_)
		return;

	const _Rect bg_rect{ _Point{ 0, 0 }, _Size{ GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT } };
	_DrawFunc::FillRectangle(bg_rect, _Color(140, 0, 0, 0));

	const _Size popup_size{ 560, 180 };
	const _Point popup_lt{
		GAME_VIEW_CENTER.x - popup_size.x / 2,
		GAME_VIEW_CENTER.y - popup_size.y / 2
	};
	const _Rect popup_rect{ popup_lt, popup_size };

	_DrawFunc::FillRectangle(popup_rect, Palette::White);
	_DrawFunc::DrawRectangle(popup_rect, Palette::Black, 2.f);
	_DrawFunc::DrawString(popup_rect.Center(), rebind_message_, Palette::Black, 20.f, true);
}

void OutGameOptionView::RefreshTexts()
{
	const ControllerPreset preset = _InputMgr.GetCurrentPreset();

	controller_type_text_->SetText(WrapFocusableLabel(
		focus_item_ == FocusItem::ControllerType,
		L"Controller : < " + ToControllerTypeText() + L" >"));

	resolution_text_->SetText(WrapFocusableLabel(
		focus_item_ == FocusItem::Resolution,
		L"Resolution : < " + ToResolutionText() + L" >"));

	window_mode_text_->SetText(WrapFocusableLabel(
		focus_item_ == FocusItem::WindowMode,
		L"WindowMode : < " + ToWindowModeText() + L" >"));

	ui_scale_text_->SetText(WrapFocusableLabel(
		focus_item_ == FocusItem::UiScale,
		L"UIScale    : < " + ToUiScaleText() + L" >"));

	apply_btn_->SetText(WrapFocusableLabel(focus_item_ == FocusItem::Apply, L"APPLY"));
	cancel_btn_->SetText(WrapFocusableLabel(focus_item_ == FocusItem::Cancel, L"CANCEL"));
	reset_btn_->SetText(WrapFocusableLabel(focus_item_ == FocusItem::Reset, L"RESET"));
	back_btn_->SetText(WrapFocusableLabel(focus_item_ == FocusItem::Back, L"BACK"));

	if (preset == ControllerPreset::MouseOnly)
		hint_text_->SetText(L"MouseOnly: 커서가 플레이어 근처(DeadZone)면 정지, 멀어질수록 최대 1.0까지 이동. Rebind 불가");
	else
		hint_text_->SetText(L"UP/DOWN: Select  LEFT/RIGHT: Change  ENTER: Action  ESC: Back  CLICK KEY CELL: Rebind");
}

void OutGameOptionView::UpdateLayout()
{
	// UI 스케일 반영 정책:
	// 레이아웃/프리뷰는 Pending이 아닌 Applied 기준으로만 갱신된다.
	// 즉, 옵션 화면에서 값 변경만으로는 즉시 크기가 바뀌지 않고 Apply 이후 반영된다.
	const _float applied_ui_scale = _VideoSettingsMgr.Applied().ui_scale;

	const _int x = ScaleByUi(START_X, applied_ui_scale);
	const _int y = ScaleByUi(START_Y, applied_ui_scale);
	const _int section_gap_y = ScaleByUi(SECTION_GAP_Y, applied_ui_scale);
	const _int line_gap = ScaleByUi(LINE_GAP, applied_ui_scale);
	const _int title_offset_y = ScaleByUi(40, applied_ui_scale);
	const _int controller_grid_top_offset = ScaleByUi(CONTROLLER_GRID_TOP_OFFSET, applied_ui_scale);
	const _int btn_gap = ScaleByUi(20, applied_ui_scale);
	const _int hint_offset_y = ScaleByUi(50, applied_ui_scale);

	controller_title_text_->SetPosition(_Point{ x, y - title_offset_y });
	controller_type_text_->SetPosition(_Point{ x, y + line_gap * 0 });
	controller_grid_->SetPosition(_Point{ x, y + controller_grid_top_offset });

	const _int video_title_y = controller_grid_->GetRect().Bottom() + section_gap_y;
	const _int video_start_y = video_title_y + title_offset_y;

	video_option_title_text_->SetPosition(_Point{ x, video_title_y });
	resolution_text_->SetPosition(_Point{ x, video_start_y + line_gap * 0 });
	window_mode_text_->SetPosition(_Point{ x, video_start_y + line_gap * 1 });
	ui_scale_text_->SetPosition(_Point{ x, video_start_y + line_gap * 2 });

	const _int btn_y = video_start_y + line_gap * 3;
	apply_btn_->SetRect(_Rect{ _Point{ x, btn_y }, COMMON_BUTTON_SIZE });
	cancel_btn_->SetRect(_Rect{ _Point{ x + COMMON_BUTTON_CX + btn_gap, btn_y }, COMMON_BUTTON_SIZE });
	reset_btn_->SetRect(_Rect{ _Point{ x + (COMMON_BUTTON_CX + btn_gap) * 2, btn_y }, COMMON_BUTTON_SIZE });
	back_btn_->SetRect(_Rect{ _Point{ x + (COMMON_BUTTON_CX + btn_gap) * 3, btn_y }, COMMON_BUTTON_SIZE });

	hint_text_->SetPosition(_Point{ x, btn_y + COMMON_BUTTON_CY + hint_offset_y });
	has_layout_cache_ = true;
	last_layout_ui_scale_ = applied_ui_scale;
	last_layout_resolution_w_ = _VideoSettingsMgr.Applied().resolution.width;
	last_layout_resolution_h_ = _VideoSettingsMgr.Applied().resolution.height;
	last_layout_window_mode_ = s_cast(_int, _VideoSettingsMgr.Applied().window_mode);
}

void OutGameOptionView::MoveFocus(_int _direction)
{
	_int index = s_cast(_int, focus_item_);
	const _int count = s_cast(_int, FocusItem::Count);
	index += (_direction >= 0 ? 1 : -1);

	while (index < 0)
		index += count;
	while (index >= count)
		index -= count;

	focus_item_ = s_cast(FocusItem, index);
}

void OutGameOptionView::HandleHorizontalInput(_int _direction)
{
	switch (focus_item_)
	{
	case FocusItem::ControllerType:
	{
		_int next_preset_index = s_cast(_int, _InputMgr.GetCurrentPreset());
		next_preset_index += (_direction >= 0 ? 1 : -1);

		const _int preset_count = s_cast(_int, ControllerPreset::Count);
		while (next_preset_index < 0)
			next_preset_index += preset_count;
		while (next_preset_index >= preset_count)
			next_preset_index -= preset_count;

		_InputMgr.SetCurrentPreset(s_cast(ControllerPreset, next_preset_index));
		break;
	}
	case FocusItem::Resolution:
		_VideoSettingsMgr.CyclePendingResolution(_direction);
		break;
	case FocusItem::WindowMode:
		_VideoSettingsMgr.CyclePendingWindowMode(_direction);
		break;
	case FocusItem::UiScale:
		_VideoSettingsMgr.CyclePendingUiScale(_direction);
		break;
	default:
		break;
	}
}

void OutGameOptionView::RefreshControllerGrid()
{
	if (nullptr == controller_grid_)
		return;

	const ControllerPreset preset = _InputMgr.GetCurrentPreset();
	for (const BindingSlotDesc& slot : BINDING_SLOTS)
	{
		controller_grid_->SetCellText(slot.row, slot.col, slot.label, Palette::Black, 12.f);

		Button* key_btn = controller_grid_->GetCellButton(slot.row, slot.col + 1);
		if (slot.is_empty)
		{
			if (key_btn)
			{
				key_btn->SetEnable(false);
				key_btn->SetText(L"");
			}
			continue;
		}

		if (nullptr == key_btn)
			continue;

		InputBinding binding;
		std::wstring key_text = L"-";
		if (TryGetBindingBySlot(preset, slot, &binding))
			key_text = ToBindingText(binding);

		const _bool remappable = _InputMgr.IsActionRemappable(preset, slot.action);
		key_btn->SetEnable(remappable);
		key_btn->SetText(remappable ? key_text : (key_text + L" (LOCK)"));
	}
}

void OutGameOptionView::BeginKeyRebind(_int _row, _int _col)
{
	const _int slot_index = FindBindingSlotIndex(_row, _col);
	if (slot_index < 0 || slot_index >= s_cast(_int, BINDING_SLOTS.size()))
		return;

	const BindingSlotDesc& slot = BINDING_SLOTS[slot_index];
	if (slot.is_empty || slot.action >= InputAction::Count)
		return;

	if (!_InputMgr.IsActionRemappable(_InputMgr.GetCurrentPreset(), slot.action))
		return;

	rebinding_slot_index_ = slot_index;
	is_waiting_key_rebind_ = true;
	skip_rebind_input_once_ = true;
	rebind_message_ = L"설정하고자 하는 키를 입력하세요";
}

void OutGameOptionView::HandleKeyRebindInput()
{
	if (!is_waiting_key_rebind_)
		return;

	if (skip_rebind_input_once_)
	{
		skip_rebind_input_once_ = false;
		return;
	}

	if (rebinding_slot_index_ < 0 || rebinding_slot_index_ >= s_cast(_int, BINDING_SLOTS.size()))
	{
		is_waiting_key_rebind_ = false;
		rebinding_slot_index_ = -1;
		return;
	}

	const BindingSlotDesc& slot = BINDING_SLOTS[rebinding_slot_index_];
	if (slot.is_empty || slot.action >= InputAction::Count)
	{
		is_waiting_key_rebind_ = false;
		rebinding_slot_index_ = -1;
		return;
	}

	InputBinding target_binding;
	const _bool has_target_binding = TryGetBindingBySlot(_InputMgr.GetCurrentPreset(), slot, &target_binding);

	for (_int vk = 0; vk < INPUT_KEY_MAX; ++vk)
	{
		if (!_InputMgr.Down(vk))
			continue;

		InputBinding new_binding;
		new_binding.action = slot.action;
		new_binding.source_type = InputSourceType::KeyboardKey;
		new_binding.source_code = vk;
		new_binding.scale = slot.use_scale ? slot.scale : 1.f;

		const ControllerPreset preset = _InputMgr.GetCurrentPreset();
		const _bool has_conflict = has_target_binding
			? _InputMgr.HasBindingConflictExcept(preset, new_binding, target_binding)
			: _InputMgr.HasBindingConflict(preset, new_binding, InputAction::Count);

		if (has_conflict)
		{
			rebind_message_ = L"이미 할당된 조작키입니다. 다른 키를 입력하세요";
			return;
		}

		const InputRemapResult result = has_target_binding
			? _InputMgr.TryRemapBinding(preset, target_binding, new_binding)
			: _InputMgr.TryRemapAction(preset, slot.action, new_binding);
		if (result == InputRemapResult::Success)
		{
			is_waiting_key_rebind_ = false;
			rebinding_slot_index_ = -1;
			rebind_message_ = L"설정하고자 하는 키를 입력하세요";
		}
		else
		{
			rebind_message_ = L"변경할 수 없는 액션입니다";
		}

		return;
	}
}

void OutGameOptionView::InvokeFocusedAction()
{
	switch (focus_item_)
	{
	case FocusItem::Apply:
		if (apply_btn_->IsEnable())
			apply_btn_->LClick();
		break;
	case FocusItem::Cancel:
		if (cancel_btn_->IsEnable())
			cancel_btn_->LClick();
		break;
	case FocusItem::Reset:
		reset_btn_->LClick();
		break;
	case FocusItem::Back:
		back_btn_->LClick();
		break;
	default:
		break;
	}
}

std::wstring OutGameOptionView::ToControllerTypeText() const
{
	return ToPresetText(_InputMgr.GetCurrentPreset());
}

std::wstring OutGameOptionView::ToResolutionText() const
{
	const Resolution& resolution = _VideoSettingsMgr.Pending().resolution;
	return std::to_wstring(resolution.width) + L" x " + std::to_wstring(resolution.height);
}

std::wstring OutGameOptionView::ToWindowModeText() const
{
	switch (_VideoSettingsMgr.Pending().window_mode)
	{
	case WindowMode::BorderlessFullscreen:
		return L"Borderless Fullscreen";
	case WindowMode::Borderless:
		return L"Borderless";
	case WindowMode::Windowed:
	default:
		return L"Windowed";
	}
}

std::wstring OutGameOptionView::ToUiScaleText() const
{
	// 표시 텍스트는 Pending 값을 보여주되, 실제 레이아웃 스케일 반영은 Applied 정책을 따른다.
	wchar_t buffer[32] = {};
	swprintf_s(buffer, L"%.2f", _VideoSettingsMgr.Pending().ui_scale);
	return buffer;
}

#include "framework.h"
#include "OutGameVideoOptionView.h"

#include "../Elements/Button.h"
#include "../Elements/Text.h"

namespace
{
    constexpr _int START_X = 180;
    constexpr _int START_Y = 180;
    constexpr _int LINE_GAP = 48;

    std::wstring WrapFocusableLabel(_bool _focused, const std::wstring& _label)
    {
        return _focused ? (L"> " + _label + L" <") : (L"  " + _label);
    }

    _int ScaleByUi(_int _value, _float _ui_scale)
    {
        if (_ui_scale <= 0.f)
            _ui_scale = 1.f;

        return s_int(std::round(s_cast(_float, _value) * _ui_scale));
    }
}

OutGameVideoOptionView::OutGameVideoOptionView(const std::function<void()>& _close_callback)
    : close_callback_(_close_callback)
{
    _VideoSettingsMgr.BeginEdit();

    title_text_ = CreateElement<Text>();
    title_text_->SetCenterAligned(false);
    title_text_->SetFontSize(18.f);
    title_text_->SetPosition(_Point{ START_X, START_Y - 60 });
    title_text_->SetText(L"VIDEO OPTION");

    resolution_text_ = CreateElement<Text>();
    resolution_text_->SetCenterAligned(false);
    resolution_text_->SetPosition(_Point{ START_X, START_Y + LINE_GAP * 0 });

    window_mode_text_ = CreateElement<Text>();
    window_mode_text_->SetCenterAligned(false);
    window_mode_text_->SetPosition(_Point{ START_X, START_Y + LINE_GAP * 1 });

    ui_scale_text_ = CreateElement<Text>();
    ui_scale_text_->SetCenterAligned(false);
    ui_scale_text_->SetPosition(_Point{ START_X, START_Y + LINE_GAP * 2 });

    const _int btn_y = START_Y + LINE_GAP * 4;

	Button::CreateInfo apply_btn_info;
	apply_btn_info.rect = _Rect{ _Point{ START_X, btn_y }, COMMON_BUTTON_SIZE };
	apply_btn_info.text = L"APPLY";
	apply_btn_info.on_lclick = [this]() { _VideoSettingsMgr.Apply(); };
    apply_btn_ = CreateElement<Button>(apply_btn_info);

	Button::CreateInfo cancel_btn_info;
    cancel_btn_info.rect = _Rect{ _Point{ START_X + COMMON_BUTTON_CX + 20, btn_y }, COMMON_BUTTON_SIZE };
	cancel_btn_info.text = L"CANCEL";
	cancel_btn_info.on_lclick = [this]() { _VideoSettingsMgr.Cancel(); };
    cancel_btn_ = CreateElement<Button>(cancel_btn_info);

	Button::CreateInfo reset_btn_info;
	reset_btn_info.rect = _Rect{ _Point{ START_X + (COMMON_BUTTON_CX + 20) * 2, btn_y }, COMMON_BUTTON_SIZE };
	reset_btn_info.text = L"RESET";
	reset_btn_info.on_lclick = [this]() { _VideoSettingsMgr.Reset(); };
    reset_btn_ = CreateElement<Button>(reset_btn_info);

	Button::CreateInfo back_btn_info;
	back_btn_info.rect = _Rect{ _Point{ START_X, btn_y + COMMON_BUTTON_CY + 20 }, COMMON_BUTTON_SIZE };
	back_btn_info.text = L"BACK";
	back_btn_info.on_lclick = [this]()
		{
			_VideoSettingsMgr.Cancel();
			if (close_callback_)
				close_callback_();
		};
    back_btn_ = CreateElement<Button>(back_btn_info);

    hint_text_ = CreateElement<Text>();
    hint_text_->SetCenterAligned(false);
    hint_text_->SetPosition(_Point{ START_X, btn_y + COMMON_BUTTON_CY + 90 });
    hint_text_->SetText(L"UP/DOWN: Select  LEFT/RIGHT: Change  ENTER: Action  ESC: Back");

    UpdateLayout();
    RefreshTexts();
}

_int OutGameVideoOptionView::Update(_double _delta_time)
{
    if (_InputMgr.Down(VK_UP))
        MoveFocus(-1);
    if (_InputMgr.Down(VK_DOWN))
        MoveFocus(1);

    if (_InputMgr.Down(VK_LEFT))
        HandleHorizontalInput(-1);
    if (_InputMgr.Down(VK_RIGHT))
        HandleHorizontalInput(1);

    if (_InputMgr.Down(VK_RETURN) || _InputMgr.Down(VK_SPACE))
        InvokeFocusedAction();

    if (_InputMgr.Down(VK_ESCAPE))
    {
        _VideoSettingsMgr.Cancel();
        if (close_callback_)
            close_callback_();
    }

    const _bool changed = _VideoSettingsMgr.HasPendingChanges();
    apply_btn_->SetEnable(changed);
    cancel_btn_->SetEnable(changed);

 UpdateLayout();
    RefreshTexts();
    return __super::Update(_delta_time);
}

void OutGameVideoOptionView::Render(_double _delta_time)
{
    __super::Render(_delta_time);
}

void OutGameVideoOptionView::RefreshTexts()
{
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
}

void OutGameVideoOptionView::UpdateLayout()
{
    // UI 스케일 반영 정책:
    // 레이아웃/프리뷰는 Pending이 아닌 Applied 기준으로만 갱신된다.
    // 즉, 옵션 화면에서 값 변경만으로는 즉시 크기가 바뀌지 않고 Apply 이후 반영된다.
    const _float applied_ui_scale = _VideoSettingsMgr.Applied().ui_scale;

    const _int x = ScaleByUi(START_X, applied_ui_scale);
    const _int y = ScaleByUi(START_Y, applied_ui_scale);
    const _int line_gap = ScaleByUi(LINE_GAP, applied_ui_scale);
    const _int title_offset_y = ScaleByUi(60, applied_ui_scale);
    const _int btn_gap = ScaleByUi(20, applied_ui_scale);
    const _int hint_offset_y = ScaleByUi(90, applied_ui_scale);

    title_text_->SetPosition(_Point{ x, y - title_offset_y });
    resolution_text_->SetPosition(_Point{ x, y + line_gap * 0 });
    window_mode_text_->SetPosition(_Point{ x, y + line_gap * 1 });
    ui_scale_text_->SetPosition(_Point{ x, y + line_gap * 2 });

    const _int btn_y = y + line_gap * 4;
    apply_btn_->SetRect(_Rect{ _Point{ x, btn_y }, COMMON_BUTTON_SIZE });
    cancel_btn_->SetRect(_Rect{ _Point{ x + COMMON_BUTTON_CX + btn_gap, btn_y }, COMMON_BUTTON_SIZE });
    reset_btn_->SetRect(_Rect{ _Point{ x + (COMMON_BUTTON_CX + btn_gap) * 2, btn_y }, COMMON_BUTTON_SIZE });
    back_btn_->SetRect(_Rect{ _Point{ x, btn_y + COMMON_BUTTON_CY + btn_gap }, COMMON_BUTTON_SIZE });

    hint_text_->SetPosition(_Point{ x, btn_y + COMMON_BUTTON_CY + hint_offset_y });
}

void OutGameVideoOptionView::MoveFocus(_int _direction)
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

void OutGameVideoOptionView::HandleHorizontalInput(_int _direction)
{
    switch (focus_item_)
    {
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

void OutGameVideoOptionView::InvokeFocusedAction()
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

std::wstring OutGameVideoOptionView::ToResolutionText() const
{
    const Resolution& resolution = _VideoSettingsMgr.Pending().resolution;
    return std::to_wstring(resolution.width) + L" x " + std::to_wstring(resolution.height);
}

std::wstring OutGameVideoOptionView::ToWindowModeText() const
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

std::wstring OutGameVideoOptionView::ToUiScaleText() const
{
    // 표시 텍스트는 Pending 값을 보여주되, 실제 레이아웃 스케일 반영은 Applied 정책을 따른다.
    wchar_t buffer[32] = {};
    swprintf_s(buffer, L"%.2f", _VideoSettingsMgr.Pending().ui_scale);
    return buffer;
}

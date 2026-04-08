#pragma once

#include "../Widgets/WidgetBase.h"

class Button;
class Text;

class DlgOptionVideo final : public WidgetBase
{
public:
    explicit DlgOptionVideo(const std::function<void()>& _close_callback);

private:
    enum class FocusItem
    {
        Resolution = 0,
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

    void RefreshTexts();
    void UpdateLayout();
    void MoveFocus(_int _direction);
    void HandleHorizontalInput(_int _direction);
    void InvokeFocusedAction();

    std::wstring ToResolutionText() const;
    std::wstring ToWindowModeText() const;
    std::wstring ToUiScaleText() const;

private:
    std::function<void()> close_callback_;

    FocusItem focus_item_ = FocusItem::Resolution;

    Text* title_text_ = nullptr;
    Text* resolution_text_ = nullptr;
    Text* window_mode_text_ = nullptr;
    Text* ui_scale_text_ = nullptr;
    Text* hint_text_ = nullptr;

    Button* apply_btn_ = nullptr;
    Button* cancel_btn_ = nullptr;
    Button* reset_btn_ = nullptr;
    Button* back_btn_ = nullptr;
};

#pragma once
#pragma once

#include "framework.h"
#include "../Widgets/WidgetBase.h"
#include "../Elements/Image.h"
#include "../Elements/Button.h"

class OutGameExitView final : public WidgetBase
{
public:
    explicit OutGameExitView(
        const std::function<void()>& _yes_btn_callback,
        const std::function<void()>& _no_btn_callback
  )
    {
        const _Size popup_size{ 640, 220 };
        const _Point popup_lt{
            GAME_VIEW_CENTER.x - popup_size.x / 2,
            GAME_VIEW_CENTER.y - popup_size.y / 2 };
        popup_rect_ = _Rect{ popup_lt, popup_size };

        Image::CreateInfo bg_info;
		bg_info.rect = popup_rect_;
        bg_info.texture_path = Path::PopUps + L"Cute.png";
        background_image_ = CreateElement<Image>(bg_info);

        const _int button_gap = 24;
        const _int total_button_width = COMMON_BUTTON_CX * 2 + button_gap;
        const _int start_x = GAME_VIEW_CENTER.x - total_button_width / 2;
        const _int button_y = popup_rect_.Bottom() - COMMON_BUTTON_CY - 34;

		Button::CreateInfo yes_btn_info;
		yes_btn_info.rect = _Rect{ _Point{ start_x, button_y }, COMMON_BUTTON_SIZE };
		yes_btn_info.text = L"예";
		yes_btn_info.on_lclick = _yes_btn_callback;
        yes_btn_info.normal_image_path = Path::Buttons + L"YES/YES_Default.png";
        yes_btn_info.hovered_image_path = Path::Buttons + L"YES/YES_MO.png";
        yes_btn_info.pressed_l_image_path = Path::Buttons + L"YES/YES_Push.png";
        yes_btn_info.disabled_image_path = Path::Buttons + L"YES/YES_Disabled.png";
        yes_btn_ = CreateElement<Button>(yes_btn_info);

		Button::CreateInfo no_btn_info;
		no_btn_info.rect = _Rect{ _Point{ start_x + COMMON_BUTTON_CX + button_gap, button_y }, COMMON_BUTTON_SIZE };
		no_btn_info.text = L"아니요";
		no_btn_info.on_lclick = _no_btn_callback;
        no_btn_info.normal_image_path = Path::Buttons + L"NO/NO_Default.png";
        no_btn_info.hovered_image_path = Path::Buttons + L"NO/NO_MO.png";
        no_btn_info.pressed_l_image_path = Path::Buttons + L"NO/NO_Push.png";
        no_btn_info.disabled_image_path = Path::Buttons + L"NO/NO_Disabled.png";
        no_btn_ = CreateElement<Button>(no_btn_info);
    }

    _int Update(_double _delta_time) override
    {
       const auto ret = __super::Update(_delta_time);
        if (ret != UPDATE_CONTINUE)
            return ret;

        if (_InputMgr.Down(VK_ESCAPE) && no_btn_)
        {
            no_btn_->LClick();
            return UPDATE_BREAK;
        }

        return UPDATE_CONTINUE;
    }

    void Render(_double _delta_time) override
    {
        _DrawFunc::FillRectangle(
            _Rect{ _Point{ 0, 0 }, _Size{ GAME_VIEW_WIDTH, GAME_VIEW_HEIGHT } },
            _Color(140, 0, 0, 0));

        __super::Render(_delta_time);
    }

private:
	Image* background_image_ = nullptr;
    Button* yes_btn_ = nullptr;
    Button* no_btn_ = nullptr;
    _Rect popup_rect_{};
};

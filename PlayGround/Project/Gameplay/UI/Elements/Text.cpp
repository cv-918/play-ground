#include "framework.h"
#include "Text.h"

void Text::SetText(const std::wstring& _text)
{
    text_ = _text;

    if (text_.empty())
    {
        SetSize(_Size{ 0, 0 });
        return;
    }

    const _Vector2 text_size = _DrawFunc::MeasureString(text_, font_size_, _DrawFunc::FONT_STYLE_BOLD);
    SetSize(_Size{
        std::max(0, s_int(std::ceil(text_size.x))),
        std::max(0, s_int(std::ceil(text_size.y)))
    });
}

void Text::Render(_double _delta_time)
{
    if (!IsVisible())
        return;

    // 텍스트 스케일은 Apply 완료된 값(Applied)만 반영한다.
    const _float applied_ui_scale = _VideoSettingsMgr.Applied().ui_scale;
    const _Point draw_pos = is_center_ ? GetCenter() : GetPosition();
    _DrawFunc::DrawString(draw_pos, text_, color_, font_size_ * applied_ui_scale, is_center_);
}

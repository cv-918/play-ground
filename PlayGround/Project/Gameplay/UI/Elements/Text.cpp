#include "framework.h"
#include "Text.h"

void Text::Render(_double _delta_time)
{
    // 텍스트 스케일은 Apply 완료된 값(Applied)만 반영한다.
    const _float applied_ui_scale = _VideoSettingsMgr.Applied().ui_scale;
    _DrawFunc::DrawString(GetPosition(), text_, color_, font_size_ * applied_ui_scale, is_center_);
}

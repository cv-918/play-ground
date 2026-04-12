#include "framework.h"
#include "Image.h"

Image::Image(const CreateInfo& _create_info)
{
    // 텍스처 경로과 스케일 모드를 설정합니다.
    texture_path_ = _create_info.texture_path;
    scale_mode_ = _create_info.scale_mode;
    // 텍스처 경로가 유효하면 리소스 매니저에서 텍스처를 로드합니다.
    if (!texture_path_.empty())
		texture_ = _GraphicSourceMgr.GetTexture(texture_path_);

    // UIBase의 CreateInfo를 초기화합니다.
	SetRect(_create_info.rect);
}

// Image 요소를 화면에 렌더링합니다.
void Image::Render(_double _delta_time)
{
    // 비가시 상태면 렌더링하지 않습니다.
    if (!IsVisible())
        return;

    // 텍스처 포인터가 없고 경로가 있으면 지연 로드를 시도합니다.
    if (!texture_ && !texture_path_.empty())
        texture_ = _GraphicSourceMgr.GetTexture(texture_path_);

    // 유효한 텍스처가 없으면 렌더링하지 않습니다.
    if (!texture_)
        return;

    // 스케일 모드에 맞는 실제 그리기 영역과 최종 알파(0~255)를 계산합니다.
    const _RectF draw_rect = _CalculateDrawRect(_RectF(GetRect()));
    const _int alpha_int = MathFunctions::Clamp(s_int(std::round(alpha_ * 255.f)), 0, 255);
    const _ubyte draw_alpha = static_cast<_ubyte>(alpha_int);

    // 화이트 플래시가 켜져 있으면 플래시 렌더 경로를 사용합니다.
    if (white_flash_ > 0.f)
    {
        if (use_source_rect_)
            _DrawFunc::DrawTextureWhiteFlash(texture_, draw_rect, source_rect_, white_flash_, draw_alpha);
        else
            _DrawFunc::DrawTextureWhiteFlash(texture_, draw_rect, white_flash_, draw_alpha);
        return;
    }

    if (use_source_rect_)
        _DrawFunc::DrawTexture(texture_, draw_rect, source_rect_, tint_color_, draw_alpha);
    else
        _DrawFunc::DrawTexture(texture_, draw_rect, tint_color_, draw_alpha);
}

// 텍스처 경로를 설정하고 리소스 매니저에서 로드합니다.
_bool Image::SetTexturePath(const std::wstring& _path)
{
    texture_path_ = _path;
    if (texture_path_.empty())
    {
        texture_ = nullptr;
        return false;
    }

    texture_ = _GraphicSourceMgr.GetTexture(texture_path_);
    return nullptr != texture_;
}

// 스케일 모드(Fit/Fill/Stretch)에 맞는 최종 드로우 사각형을 계산합니다.
_RectF Image::_CalculateDrawRect(const _RectF& _base_rect) const
{
    if (!texture_ || ImageScaleMode::Stretch == scale_mode_)
        return _base_rect;

    const _float tex_width = use_source_rect_ ? source_rect_.Width() : s_float(texture_->Width());
    const _float tex_height = use_source_rect_ ? source_rect_.Height() : s_float(texture_->Height());
    if (tex_width <= 0.f || tex_height <= 0.f)
        return _base_rect;

    const _float rect_width = _base_rect.Width();
    const _float rect_height = _base_rect.Height();
    if (rect_width <= 0.f || rect_height <= 0.f)
        return _base_rect;

    const _float scale_x = rect_width / tex_width;
    const _float scale_y = rect_height / tex_height;
    const _float scale = (ImageScaleMode::Fit == scale_mode_) ? std::min(scale_x, scale_y) : std::max(scale_x, scale_y);

    const _float draw_width = tex_width * scale;
    const _float draw_height = tex_height * scale;
    const _float offset_x = (rect_width - draw_width) * 0.5f;
    const _float offset_y = (rect_height - draw_height) * 0.5f;

    return _RectF(
        _base_rect.Left() + offset_x,
        _base_rect.Top() + offset_y,
        _base_rect.Left() + offset_x + draw_width,
        _base_rect.Top() + offset_y + draw_height);
}

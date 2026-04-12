#pragma once
#pragma once
#include "../UIBase.h"

// 엔진 렌더 리소스 매니저에서 관리하는 텍스처 리소스 전방 선언
struct TextureResource;

// 이미지가 자신의 UI 영역에 맞춰 그려지는 방식을 정의하는 스케일 모드
enum class ImageScaleMode
{
    Stretch, // UI 영역에 맞춰 강제로 늘려 그리기(비율 무시)
    Fit,     // 원본 비율 유지 + UI 영역 내부에 맞춰 그리기
    Fill     // 원본 비율 유지 + UI 영역을 덮도록 그리기(일부 잘릴 수 있음)
};

// 텍스처 이미지를 렌더링하는 UI 요소 클래스.
// 틴트, 알파, 화이트 플래시, 스케일 모드, 소스 영역(스프라이트 시트) 기능을 제공합니다.
class Image final : public UIBase
{
public:
    struct CreateInfo : public UIBase::UICreateInfo
    {
        std::wstring texture_path; // 렌더링할 텍스처의 파일 경로
        ImageScaleMode scale_mode = ImageScaleMode::Stretch; // 이미지 스케일 모드
	};

public:
	explicit Image() DEFAULT; // 추후에 삭제할 것
	explicit Image(const CreateInfo& _create_info);

public:
    // 현재 설정(텍스처, 틴트, 알파, 소스 영역, 스케일 모드)에 따라 이미지를 렌더링합니다.
    void Render(_double _delta_time) override;

public:
    // 텍스처 경로를 설정하고 즉시 로드 시도합니다. 성공 여부를 반환합니다.
    _bool SetTexturePath(const std::wstring& _path);

    // 외부에서 이미 로드된 텍스처 리소스를 직접 설정합니다.
    void SetTexture(TextureResource* _texture) { texture_ = _texture; }

    // 현재 연결된 텍스처 리소스를 반환합니다.
    TextureResource* GetTexture() const { return texture_; }

    // 현재 텍스처 경로를 반환합니다.
    const std::wstring& GetTexturePath() const { return texture_path_; }

    // 텍스처에 곱해질 틴트 색상을 설정합니다.
    void SetTintColor(const _Color& _color) { tint_color_ = _color; }

    // 현재 틴트 색상을 반환합니다.
    _Color GetTintColor() const { return tint_color_; }

    // 틴트 색상을 기본값(흰색)으로 복원합니다.
    void ResetTintColor() { tint_color_ = Palette::White; }

    // 알파값(0~1)을 설정합니다.
    void SetAlpha(_float _alpha) { alpha_ = MathFunctions::Clamp(_alpha, 0.f, 1.f); }

    // 현재 알파값(0~1)을 반환합니다.
    _float GetAlpha() const { return alpha_; }

    // 화이트 플래시 강도(0~1)를 설정합니다.
    void SetWhiteFlash(_float _flash) { white_flash_ = MathFunctions::Clamp(_flash, 0.f, 1.f); }

    // 현재 화이트 플래시 강도(0~1)를 반환합니다.
    _float GetWhiteFlash() const { return white_flash_; }

    // 이미지 스케일 모드를 설정합니다.
    void SetScaleMode(ImageScaleMode _mode) { scale_mode_ = _mode; }

    // 현재 이미지 스케일 모드를 반환합니다.
    ImageScaleMode GetScaleMode() const { return scale_mode_; }

    // 텍스처의 소스 영역(잘라서 그릴 영역)을 설정하고 사용을 활성화합니다.
    void SetSourceRect(const _RectF& _source_rect) { source_rect_ = _source_rect; use_source_rect_ = true; }

    // 소스 영역 사용을 비활성화하여 텍스처 전체를 그리도록 전환합니다.
    void ClearSourceRect() { use_source_rect_ = false; }

    // 소스 영역 사용 여부를 반환합니다.
    _bool HasSourceRect() const { return use_source_rect_; }

private:
    // 스케일 모드에 맞춰 실제 렌더링 대상 사각형을 계산합니다.
    _RectF _CalculateDrawRect(const _RectF& _base_rect) const;

private:
    // 텍스처 파일 경로
    std::wstring texture_path_;

    // 렌더링에 사용할 텍스처 리소스
    TextureResource* texture_ = nullptr;

    // 텍스처에 곱해질 색상 틴트
    _Color tint_color_ = Palette::White;

    // 전체 투명도(0~1)
    _float alpha_ = 1.f;

    // 화이트 플래시 강도(0~1)
    _float white_flash_ = 0.f;

    // 이미지 스케일 모드
    ImageScaleMode scale_mode_ = ImageScaleMode::Stretch;

    // 소스 영역 사용 여부
    _bool use_source_rect_ = false;

    // 텍스처에서 잘라서 그릴 소스 영역
    _RectF source_rect_{};
};

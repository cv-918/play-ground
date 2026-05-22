#include "framework.h"
#include "OutGameSkillToolTip.h"

#include "Gameplay/Common/CommonGamePlayType.h"

namespace
{
	const std::wstring kTooltipBackgroundPath = Path::PopUps + L"Default.png";
	constexpr _int kTooltipWidth = 390;
	constexpr _int kTooltipFallbackHeight = 136;
	constexpr _int kTooltipPaddingX = 18;
	constexpr _int kTooltipPaddingY = 14;

	_Size BuildTooltipSize(const TextureResource* _texture)
	{
		if (!_texture || _texture->Width() <= 0 || _texture->Height() <= 0)
			return { kTooltipWidth, kTooltipFallbackHeight };

		const _int height = static_cast<_int>(std::round(static_cast<_float>(kTooltipWidth) * _texture->Height() / _texture->Width()));
		return { kTooltipWidth, std::max(1, height) };
	}
}

_bool OutGameSkillToolTip::Initialize()
{
	background_texture_ = _GraphicSourceMgr.GetTexture(kTooltipBackgroundPath);
	SetSize(BuildTooltipSize(background_texture_));
	return true;
}

_int OutGameSkillToolTip::Update(_double _delta_time)
{
	_int ret = UPDATE_CONTINUE;
	if (ret = __super::Update(_delta_time))
		return ret;

	if (target_skill_ == nullptr)
		return ret;

	SetPosition(_InputMgr.MousePoint() + _Point{ 5, 5 });
	return ret;
}

void OutGameSkillToolTip::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	__super::Render(_delta_time);

	if (target_skill_ == nullptr)
		return;

	if (!background_texture_)
	{
		background_texture_ = _GraphicSourceMgr.GetTexture(kTooltipBackgroundPath);
		if (background_texture_)
			SetSize(BuildTooltipSize(background_texture_));
	}

	const auto position = GetPosition();
	const auto size = GetSize();
	const _Rect tooltip_rect{ position, size };

	if (background_texture_)
		_DrawFunc::DrawTexture(background_texture_, _RectF(tooltip_rect));
	else
	{
		_DrawFunc::FillRectangle(tooltip_rect, Palette::White);
		_DrawFunc::DrawRectangle(tooltip_rect, Palette::DarkGray, 2.f);
	}

	const _float text_max_width = static_cast<_float>(std::max(1, size.x - kTooltipPaddingX * 2));
	_DrawFunc::DrawString(position + _Point{ kTooltipPaddingX, kTooltipPaddingY }, tooltip_text_, Palette::Black, 14.f, text_max_width, false);
}

void OutGameSkillToolTip::SetTargetSkill(const SkillJsonInfo* _skill_info)
{
	target_skill_ = _skill_info;
	tooltip_text_.clear();

	if (target_skill_ == nullptr)
		return;

	tooltip_text_ += _UtilFunc::ToWString(target_skill_->name_);

	_tchar buffer[64] = {};
	const _double cooldown = target_skill_->cooldown_;
	const _double rounded_cooldown = std::round(cooldown);
	if (std::fabs(cooldown - rounded_cooldown) < 0.001)
		swprintf_s(buffer, L"쿨타임 : %.0f초", rounded_cooldown);
	else
		swprintf_s(buffer, L"쿨타임 : %.1f초", cooldown);

	tooltip_text_ += L"\n";
	tooltip_text_ += buffer;
	tooltip_text_ += L"\n\n";
	tooltip_text_ += _UtilFunc::ToWString(target_skill_->desc_);
}

#include "framework.h"
#include "OutGameSkillToolTip.h"

#include "Gameplay/Common/CommonGamePlayType.h"

_bool OutGameSkillToolTip::Initialize()
{
	SetSize({ 260, 180 });
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

	const auto position = GetPosition();
	const auto size = GetSize();
	_DrawFunc::FillRectangle({ position, size }, Palette::White);
	_DrawFunc::DrawRectangle({ position, size }, Palette::DarkGray, 2.f);

	_DrawFunc::DrawString(position + _Point{ 10, 10 }, tooltip_text_, Palette::Black, 14.f, 240.f, false);
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

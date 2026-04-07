#include "framework.h"
#include "InGameSkillSlot.h"

#include "../Elements/Image.h"
#include "../Elements/Text.h"

#include "GamePlaySystems/SkillManager.h"
#include "GamePlaySystems/Skills/SkillBase.h"

InGameSkillSlot::InGameSkillSlot(_uint _slot_index, const std::wstring& _key_label)
	: slot_index_(_slot_index)
	, key_label_(_key_label)
{
	icon_ = CreateElement<Image>();
	icon_->SetTintColor(Palette::White);
	icon_->SetAlpha(1.f);

	key_text_ = CreateElement<Text>();
	key_text_->SetText(key_label_);
	key_text_->SetColor(Palette::White);
	key_text_->SetFontSize(12.f);

	name_text_ = CreateElement<Text>();
	name_text_->SetColor(Palette::White);
	name_text_->SetFontSize(12.f);

	cooldown_text_ = CreateElement<Text>();
	cooldown_text_->SetColor(Palette::White);
	cooldown_text_->SetFontSize(18.f);

	key_text_->SetCenterAligned(false);
	name_text_->SetCenterAligned(true);
	cooldown_text_->SetCenterAligned(true);

	SetSlotSize({ 72, 72 });
}

_int InGameSkillSlot::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	SkillBase* skill = _SkillMgr.GetEquippedSkill(slot_index_);
	if (nullptr == skill)
	{
		_ApplyEmptyState();
		return UPDATE_CONTINUE;
	}

	_ApplySkillState(skill);
	return UPDATE_CONTINUE;
}

//void InGameSkillSlot::Render(_double _delta_time)
//{
//	const _Rect slot_rect = GetRect();
//
//	// 배경
//	_Color bg_color = has_skill_
//		? _Color(180, 40, 40, 40)
//		: _Color(180, 25, 25, 25);
//
//	_DrawFunc::FillRectangle(slot_rect, bg_color);
//
//	// 프레임
//	_Color frame_color = has_skill_
//		? Palette::White
//		: _Color(255, 110, 110, 110);
//
//	_DrawFunc::DrawRectangle(slot_rect, frame_color, 2.f);
//
//	// 자식 요소 렌더
//	__super::Render(_delta_time);
//
//	// 쿨다운 오버레이
//	if (cooldown_overlay_alpha_ > 0.f)
//	{
//		_Color overlay(255, 0, 0, 0);
//		overlay.SetAlpha(cooldown_overlay_alpha_);
//		_DrawFunc::FillRectangle(slot_rect, overlay);
//	}
//}

void InGameSkillSlot::Render(_double _delta_time)
{
	const _Rect slot_rect = GetRect();

	// 1. 배경
	_Color bg_color = has_skill_
		? _Color(180, 40, 40, 40)
		: _Color(180, 25, 25, 25);

	_DrawFunc::FillRectangle(slot_rect, bg_color);

	// 2. 프레임
	_Color frame_color = has_skill_
		? Palette::White
		: _Color(255, 110, 110, 110);

	_DrawFunc::DrawRectangle(slot_rect, frame_color, 2.f);

	// 3. 아이콘
	if (icon_)
		icon_->Render(_delta_time);

	// 4. 쿨다운 오버레이
	if (cooldown_overlay_alpha_ > 0.f)
	{
		_Color overlay(255, 0, 0, 0);
		overlay.SetAlpha(cooldown_overlay_alpha_);
		_DrawFunc::FillRectangle(slot_rect, overlay);
	}

	// 5. 텍스트들은 오버레이 위에
	if (cooldown_text_)
		cooldown_text_->Render(_delta_time);

	if (key_text_)
		key_text_->Render(_delta_time);

	if (name_text_)
		name_text_->Render(_delta_time);
}

void InGameSkillSlot::SetKeyLabel(const std::wstring& _key_label)
{
	key_label_ = _key_label;
	key_text_->SetText(key_label_);
}

void InGameSkillSlot::SetSlotSize(const _Size& _size)
{
	SetSize(_size);
	_UpdateLayout();
}

void InGameSkillSlot::SetSlotCenter(const _Point& _center)
{
	SetCenter(_center);
	_UpdateLayout();
}

void InGameSkillSlot::_UpdateLayout()
{
	const _Rect slot_rect = GetRect();
	const _Point center = slot_rect.Center();

	_Rect icon_rect = slot_rect;
	icon_rect.MoveX(4);
	icon_rect.MoveY(4);
	icon_rect.ScaleX(-8);
	icon_rect.ScaleY(-8);
	icon_->SetRect(icon_rect);

	cooldown_text_->SetCenter(center);

	key_text_->SetPosition(_Point(slot_rect.Left() + 16, slot_rect.Bottom() - 12));
	name_text_->SetCenter(_Point(center.x, slot_rect.Top() - 12));

}

void InGameSkillSlot::_ApplyEmptyState()
{
	has_skill_ = false;
	is_ready_ = false;
	cooldown_overlay_alpha_ = 0.f;

	icon_->SetTexture(nullptr);
	icon_->SetAlpha(0.f);
	icon_->SetTintColor(_Color(255, 120, 120, 120));

	if (show_skill_name_)
		name_text_->SetText(L"EMPTY");
	else
		name_text_->SetText(L"");

	cooldown_text_->SetText(L"");
	key_text_->SetText(key_label_);
}

void InGameSkillSlot::_ApplySkillState(SkillBase* _skill)
{
	const SkillJsonInfo* info = _skill->GetInfo();
	if (nullptr == info)
	{
		_ApplyEmptyState();
		return;
	}

	has_skill_ = true;
	is_ready_ = _skill->IsReady();

	if (!info->icon_path_.empty())
	{
		icon_->SetTexturePath(_UtilFunc::ToWString(info->icon_path_));
		icon_->SetAlpha(1.f);
	}
	else
	{
		icon_->SetTexture(nullptr);
		icon_->SetAlpha(0.f);
	}

	if (show_skill_name_)
		name_text_->SetText(_UtilFunc::ToWString(info->name_));
	else
		name_text_->SetText(L"");

	key_text_->SetText(key_label_);

	if (is_ready_)
	{
		cooldown_overlay_alpha_ = 0.f;
		cooldown_text_->SetText(L"");
		icon_->SetTintColor(Palette::White);
	}
	else
	{
		const _double current_cd = _skill->GetCurrentCooldown();
		const _float ratio = _skill->GetCooldownRatio();

		cooldown_overlay_alpha_ = MathFunctions::Clamp(0.35f + ratio * 0.4f, 0.f, 0.8f);
		cooldown_text_->SetText(_FormatCooldownText(current_cd));
		icon_->SetTintColor(_Color(255, 170, 170, 170));
	}
}

std::wstring InGameSkillSlot::_FormatCooldownText(_double _cooldown) const
{
	if (_cooldown <= 0.0)
		return L"";

	_tchar buffer[32] = {};
	swprintf_s(buffer, L"%.1f", s_float(_cooldown));
	return buffer;
}
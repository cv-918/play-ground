#include "framework.h"
#include "OutGameSkillSlot.h"

#include "../Elements/Image.h"
#include "../Elements/Text.h"

#include "GamePlaySystems/SkillManager.h"
#include "GamePlaySystems/Skills/SkillBase.h"

OutGameSkillSlot::OutGameSkillSlot(_uint _slot_index, const std::wstring& _key_label)
	: slot_index_(_slot_index)
	, key_label_(_key_label)
{
	icon_ = CreateElement<Image>();
	icon_->SetTintColor(Palette::White);
	icon_->SetAlpha(1.f);

	key_text_ = CreateElement<Text>();
	key_text_->SetText(key_label_);
	key_text_->SetColor(Palette::White);
	key_text_->SetFontSize(14.f);

	name_text_ = CreateElement<Text>();
	name_text_->SetColor(Palette::White);
	name_text_->SetFontSize(14.f);

	key_text_->SetCenterAligned(false);
	name_text_->SetCenterAligned(true);

	SetSlotSize({ 104, 84 });
}

_int OutGameSkillSlot::Update(_double _delta_time)
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

void OutGameSkillSlot::Render(_double _delta_time)
{
	const _Rect slot_rect = GetRect();

	_Color bg_color = has_skill_
		? _Color(200, 45, 45, 45)
		: _Color(180, 25, 25, 25);
	_DrawFunc::FillRectangle(slot_rect, bg_color);

	_Color frame_color = has_skill_
		? Palette::White
		: _Color(255, 110, 110, 110);
	_DrawFunc::DrawRectangle(slot_rect, frame_color, 2.f);

	if (icon_)
		icon_->Render(_delta_time);

	if (key_text_)
		key_text_->Render(_delta_time);

	if (name_text_)
		name_text_->Render(_delta_time);
}

void OutGameSkillSlot::SetKeyLabel(const std::wstring& _key_label)
{
	key_label_ = _key_label;
	key_text_->SetText(key_label_);
}

void OutGameSkillSlot::SetSlotSize(const _Size& _size)
{
	SetSize(_size);
	_UpdateLayout();
}

void OutGameSkillSlot::SetSlotCenter(const _Point& _center)
{
	SetCenter(_center);
	_UpdateLayout();
}

void OutGameSkillSlot::_UpdateLayout()
{
	const _Rect slot_rect = GetRect();
	const _Point center = slot_rect.Center();

	_Rect icon_rect = slot_rect;
	icon_rect.MoveX(6);
	icon_rect.MoveY(6);
	icon_rect.ScaleX(-12);
	icon_rect.ScaleY(-12);
	icon_->SetRect(icon_rect);

	key_text_->SetPosition(_Point(slot_rect.Left() + 14, slot_rect.Bottom() - 18));
	name_text_->SetCenter(_Point(center.x, slot_rect.Top() - 14));
}

void OutGameSkillSlot::_ApplyEmptyState()
{
	has_skill_ = false;

	icon_->SetTexture(nullptr);
	icon_->SetAlpha(0.f);
	icon_->SetTintColor(_Color(255, 120, 120, 120));

	if (show_skill_name_)
		name_text_->SetText(L"EMPTY");
	else
		name_text_->SetText(L"");

	key_text_->SetText(key_label_);
}

void OutGameSkillSlot::_ApplySkillState(SkillBase* _skill)
{
	const SkillJsonInfo* info = _skill->GetInfo();
	if (nullptr == info)
	{
		_ApplyEmptyState();
		return;
	}

	has_skill_ = true;

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

	icon_->SetTintColor(Palette::White);

	if (show_skill_name_)
		name_text_->SetText(_UtilFunc::ToWString(info->name_));
	else
		name_text_->SetText(L"");

	key_text_->SetText(key_label_);
}

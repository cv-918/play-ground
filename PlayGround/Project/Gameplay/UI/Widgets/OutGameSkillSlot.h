#pragma once

#include "WidgetBase.h"

class Image;
class Text;
class SkillBase;

class OutGameSkillSlot final : public WidgetBase
{
public:
	explicit OutGameSkillSlot(_uint _slot_index, const std::wstring& _key_label);

public:
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	void SetSlotIndex(_uint _slot_index) { slot_index_ = _slot_index; }
	_uint GetSlotIndex() const { return slot_index_; }

	void SetKeyLabel(const std::wstring& _key_label);
	void SetShowSkillName(_bool _show) { show_skill_name_ = _show; }

	void SetSlotSize(const _Size& _size);
	void SetSlotCenter(const _Point& _center);

private:
	void _UpdateLayout();
	void _ApplyEmptyState();
	void _ApplySkillState(SkillBase* _skill);

private:
	_uint slot_index_ = 0;
	std::wstring key_label_;

	_bool show_skill_name_ = true;
	_bool has_skill_ = false;

private:
	Image* icon_ = nullptr;
	Text* key_text_ = nullptr;
	Text* name_text_ = nullptr;
};

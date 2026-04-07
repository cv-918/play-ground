#pragma once
#include "WidgetBase.h"

class Image;
class Text;
class SkillBase;

class InGameSkillSlot final : public WidgetBase
{
public:
	explicit InGameSkillSlot(_uint _slot_index, const std::wstring& _key_label);

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

	void _TriggerUseFlash();
	void _UpdateFlash(_double _delta_time);

	std::wstring _FormatCooldownText(_double _cooldown) const;

private:
	_uint slot_index_ = 0;
	std::wstring key_label_;

	_bool show_skill_name_ = true;
	_bool has_skill_ = false;
	_bool is_ready_ = false;
	_float cooldown_overlay_alpha_ = 0.f;

	// 발동 감지용
	_bool prev_ready_ = false;

	// 아이콘 플래시
	_float use_flash_strength_ = 0.f;
	_float use_flash_fade_speed_ = 4.5f;

	// 프레임 플래시
	_float frame_flash_strength_ = 0.f;
	_float frame_flash_fade_speed_ = 6.f;

private:
	Image* icon_ = nullptr;
	Text* key_text_ = nullptr;
	Text* name_text_ = nullptr;
	Text* cooldown_text_ = nullptr;
};
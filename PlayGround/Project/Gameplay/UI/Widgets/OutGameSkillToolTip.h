#pragma once

#include "WidgetBase.h"

struct SkillJsonInfo;
struct TextureResource;

class OutGameSkillToolTip final : public WidgetBase
{
public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	void SetTargetSkill(const SkillJsonInfo* _skill_info);

private:
	const SkillJsonInfo* target_skill_ = nullptr;
	TextureResource* background_texture_ = nullptr;
	std::wstring tooltip_text_;
};

#pragma once

#include "../Widgets/WidgetBase.h"

class Button;
class Grid;
class OutGameSkillSlot;
class OutGameSkillToolTip;

class OutGameSkillView final : public WidgetBase
{
public:
	explicit OutGameSkillView(
		const std::function<void()>& _attributes_btn_callback,
		const std::function<void()>& _return_btn_callback
	);

private:
	_int Update(_double _delta_time) override;
	void OnViewportChanged() override;

	void UpdateLayout();
	void RefreshSkillGridState();
	void _UpdateHoveredSkillTooltip();

	Button* attributes_btn_ = nullptr;
	Button* return_btn_ = nullptr;
	Grid* skill_list_grid_ = nullptr;
	OutGameSkillSlot* equipped_skill_slot_0_ = nullptr;
	OutGameSkillSlot* equipped_skill_slot_1_ = nullptr;
	OutGameSkillToolTip* skill_tooltip_ = nullptr;
	std::vector<_uint> grid_skill_ids_;
};

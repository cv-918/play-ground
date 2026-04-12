#pragma once
#include "../Widgets/WidgetBase.h"

class AttributeNodeTree;
class Grid;
class OutGameAttributeView final : public WidgetBase
{
public:
	explicit OutGameAttributeView(
		const std::function<void()>& _return_btn_callback
	);

private:
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void OnViewportChanged() override;

	void UpdateLayout();

	class Button* return_btn_ = nullptr;
	Grid* skill_list_grid_ = nullptr;
	AttributeNodeTree* attribute_tree_ = nullptr;
};


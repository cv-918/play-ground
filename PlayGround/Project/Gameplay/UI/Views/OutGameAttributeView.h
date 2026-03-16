#pragma once
#include "../Widgets/WidgetBase.h"

class AttributeNodeTree;
class OutGameAttributeView final : public WidgetBase
{
public:
	explicit OutGameAttributeView(
		const std::function<void()>& _return_btn_callback
	);
	virtual ~OutGameAttributeView();

private:
	AttributeNodeTree* attribute_node_tree_ = nullptr;
};


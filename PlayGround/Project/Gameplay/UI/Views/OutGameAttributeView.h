#pragma once
#include "../Widgets/WidgetBase.h"

class AttributeNodeTree;
class OutGameAttributeView final : public WidgetBase
{
public:
	explicit OutGameAttributeView(
		const std::function<void()>& _return_btn_callback
	);

private:
	void Render(_double _delta_time) override;
};


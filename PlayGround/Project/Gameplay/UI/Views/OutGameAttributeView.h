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
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	class Button* return_btn_ = nullptr;
};

